import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, exists } from '@tauri-apps/plugin-fs';
import type { ArticleRecord } from '../types';
import { renderHighlightedContent } from './highlightRenderer';

export type ExportFormat = 'txt' | 'md';

export interface ExportResult {
  success: number;
  failed: number;
  cancelled: boolean;
}

// ---------- Format ----------

export function formatArticleAsTxt(article: ArticleRecord): string {
  return article.content;
}

export function formatArticleAsMarkdown(article: ArticleRecord): string {
  const lines: string[] = [];
  lines.push(`# ${article.title}`);
  lines.push('');

  // 元数据块（有就输出）
  const metaLines: string[] = [];
  if (article.categories && article.categories.length > 0) {
    metaLines.push(`- **分类**: ${article.categories.join(' / ')}`);
  }
  if (article.platform) metaLines.push(`- **平台**: ${article.platform}`);
  if (article.coreGimmick && article.coreGimmick.length > 0) metaLines.push(`- **核心梗**: ${article.coreGimmick.join(' / ')}`);
  if (article.payPoint) metaLines.push(`- **付费点**: ${article.payPoint}`);
  if (article.synopsis) metaLines.push(`- **梗概**: ${article.synopsis}`);
  if (article.highlight) metaLines.push(`- **亮点**: ${article.highlight}`);
  if (article.isClassic) metaLines.push(`- **经典热文**: ✓`);
  if (article.archivedAt) metaLines.push(`- **归档时间**: ${article.archivedAt.split('T')[0]}`);
  if (metaLines.length > 0) {
    lines.push(...metaLines);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // 正文：有高亮用 == 包裹，评论在后
  const activeHighlights = article.highlights.filter((h) => h.isActive);
  const commentsByHighlight = new Map<string, string>();
  article.comments.forEach((c) => {
    if (c.text && c.text.trim()) commentsByHighlight.set(c.highlightId, c.text);
  });

  const segments = renderHighlightedContent(article.content, activeHighlights);
  const body: string[] = [];
  const pendingComments: string[] = [];
  let lastParagraphBreak = 0;

  for (const seg of segments) {
    if (seg.activeHighlights.length > 0) {
      body.push(`==${seg.text}==`);
      seg.activeHighlights.forEach((h) => {
        const c = commentsByHighlight.get(h.id);
        if (c) pendingComments.push(c);
      });
    } else {
      body.push(seg.text);
    }
    // 段落尾 flush 评论
    if (seg.text.includes('\n')) {
      flushComments();
    }
    lastParagraphBreak++;
  }
  flushComments();

  function flushComments() {
    if (pendingComments.length === 0) return;
    pendingComments.forEach((c) => {
      body.push('\n');
      body.push(`> 💡 ${c.replace(/\n/g, '\n> ')}`);
      body.push('\n');
    });
    pendingComments.length = 0;
  }

  lines.push(body.join(''));
  return lines.join('\n');
}

// ---------- File name ----------

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'untitled';
}

function buildFilename(article: ArticleRecord, format: ExportFormat): string {
  const base = sanitizeFilename(article.title);
  if (format === 'md') return `${base}_带评论.md`;
  return `${base}.txt`;
}

async function resolveUniquePath(dirPath: string, filename: string): Promise<string> {
  const sep = dirPath.endsWith('/') || dirPath.endsWith('\\') ? '' : '/';
  let finalPath = `${dirPath}${sep}${filename}`;
  try {
    if (!(await exists(finalPath))) return finalPath;
  } catch {
    return finalPath;
  }
  // 追加 _2 / _3
  const dotIdx = filename.lastIndexOf('.');
  const stem = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
  const ext = dotIdx > 0 ? filename.slice(dotIdx) : '';
  for (let i = 2; i < 100; i++) {
    finalPath = `${dirPath}${sep}${stem}_${i}${ext}`;
    try {
      if (!(await exists(finalPath))) return finalPath;
    } catch {
      return finalPath;
    }
  }
  return finalPath;
}

// ---------- Single export (save dialog) ----------

export async function exportSingleArticle(
  article: ArticleRecord,
  format: ExportFormat
): Promise<ExportResult> {
  const defaultName = buildFilename(article, format);
  const filters =
    format === 'md'
      ? [{ name: 'Markdown', extensions: ['md'] }]
      : [{ name: '纯文本', extensions: ['txt'] }];
  const filePath = await save({ defaultPath: defaultName, filters });
  if (!filePath) return { success: 0, failed: 0, cancelled: true };

  const content = format === 'md' ? formatArticleAsMarkdown(article) : formatArticleAsTxt(article);
  try {
    await writeTextFile(filePath as string, content);
    return { success: 1, failed: 0, cancelled: false };
  } catch (err) {
    console.error('[articleExporter] single export failed:', err);
    return { success: 0, failed: 1, cancelled: false };
  }
}

// ---------- Batch export (directory pick) ----------

export async function exportArticles(
  articles: ArticleRecord[],
  format: ExportFormat
): Promise<ExportResult> {
  if (articles.length === 0) return { success: 0, failed: 0, cancelled: false };
  // 单个也用 save 弹窗
  if (articles.length === 1) {
    return exportSingleArticle(articles[0], format);
  }

  const dir = await open({ directory: true, multiple: false });
  if (!dir) return { success: 0, failed: 0, cancelled: true };
  const dirPath = dir as string;

  let success = 0;
  let failed = 0;
  for (const article of articles) {
    const filename = buildFilename(article, format);
    const content = format === 'md' ? formatArticleAsMarkdown(article) : formatArticleAsTxt(article);
    try {
      const finalPath = await resolveUniquePath(dirPath, filename);
      await writeTextFile(finalPath, content);
      success++;
    } catch (err) {
      console.error('[articleExporter] batch export write failed:', filename, err);
      failed++;
    }
  }
  return { success, failed, cancelled: false };
}
