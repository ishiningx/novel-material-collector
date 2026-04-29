// Kindle「My Clippings.txt」解析器
// 支持中/英 Kindle 导出格式，自动识别标注/笔记/书签，并做高亮-笔记配对

export type KindleClippingType = 'highlight' | 'note' | 'bookmark';

export interface KindleClipping {
  id: string;              // 去重 key：hash(书名+位置+正文片段)
  bookTitle: string;
  author: string;
  type: KindleClippingType;
  page: string;            // 原始页码描述（"第 123 页"）
  location: string;        // 原始位置描述（"#1234-1235"）
  locationStart: number;   // 解析出的起始位置（排序/配对用）
  locationEnd: number;
  content: string;
  createdAt: Date;         // 解析失败时退化为 new Date(0)
  rawMeta: string;         // 原始元信息行，便于调试
}

// 高亮与配对笔记合并后的结构
export interface PairedClipping {
  id: string;
  bookTitle: string;
  author: string;
  type: KindleClippingType;
  locationLabel: string;   // "第 123 页 · 位置 #1234-1235"
  content: string;
  note: string;            // 配对的笔记，可能为空
  createdAt: Date;
}

/**
 * 入口：输入原始文本，返回可直接展示/入库的条目数组
 */
export function parseMyClippings(rawText: string): PairedClipping[] {
  const clippings = parseClippings(rawText);
  return pairHighlightsAndNotes(clippings);
}

/**
 * 解析原始文本为结构化的 clipping 列表（未配对）
 */
export function parseClippings(rawText: string): KindleClipping[] {
  // 去 BOM 并规范化换行
  const text = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Kindle 用至少 10 个等号作为分隔
  const blocks = text.split(/={5,}\n?/);
  const results: KindleClipping[] = [];

  for (const block of blocks) {
    const clipping = parseBlock(block);
    if (clipping) results.push(clipping);
  }

  // 去重（同一条高亮可能因编辑重复写入）
  const seen = new Set<string>();
  return results.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

/**
 * 解析单个块
 */
function parseBlock(block: string): KindleClipping | null {
  const lines = block.split('\n').map((l) => l.trimEnd());
  // 去掉头尾空行
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
  if (lines.length < 2) return null;

  const titleLine = lines[0].trim();
  const metaLine = lines[1].trim();
  // 第 3 行通常为空，正文从第 3 行（索引 2）起，若有空行则跳过
  let contentStart = 2;
  while (contentStart < lines.length && lines[contentStart].trim() === '') contentStart++;
  const content = lines.slice(contentStart).join('\n').trim();

  const { bookTitle, author } = parseTitleAuthor(titleLine);
  const type = detectType(metaLine);
  const { page, location, locationStart, locationEnd } = parseLocation(metaLine);
  const createdAt = parseCreatedAt(metaLine);

  // 书签通常没有正文，过滤掉
  if (type === 'bookmark' && !content) return null;
  // 没有任何有用信息则丢弃
  if (!bookTitle && !content) return null;

  return {
    id: computeId(bookTitle, locationStart, locationEnd, content),
    bookTitle: bookTitle || '未知书名',
    author,
    type,
    page,
    location,
    locationStart,
    locationEnd,
    content,
    createdAt,
    rawMeta: metaLine,
  };
}

/**
 * 书名行解析："书名 (作者名)"，作者可缺省
 * 支持嵌套括号：取最后一对 (...) 作为作者
 */
function parseTitleAuthor(line: string): { bookTitle: string; author: string } {
  if (!line) return { bookTitle: '', author: '' };
  // 中英文括号都支持
  const match = line.match(/^(.+?)\s*[（(]([^（()]*)[）)]\s*$/);
  if (match) {
    return { bookTitle: match[1].trim(), author: match[2].trim() };
  }
  return { bookTitle: line.trim(), author: '' };
}

/**
 * 元信息行类型识别
 */
function detectType(metaLine: string): KindleClippingType {
  if (/笔记|Note|Notiz|ノート/i.test(metaLine)) return 'note';
  if (/书签|Bookmark|Lesezeichen|ブックマーク/i.test(metaLine)) return 'bookmark';
  return 'highlight'; // 默认按标注处理
}

/**
 * 提取位置信息
 */
function parseLocation(metaLine: string): {
  page: string;
  location: string;
  locationStart: number;
  locationEnd: number;
} {
  // 页码
  let page = '';
  const pageMatch =
    metaLine.match(/第\s*([\d\-]+)\s*页/) ||
    metaLine.match(/page\s+([\d\-]+)/i);
  if (pageMatch) page = pageMatch[1];

  // 位置：支持 "位置 #1234-1235" / "位置 1234-1235" / "Location 1234-1235"
  let locStart = 0;
  let locEnd = 0;
  let locationRaw = '';
  const locMatch =
    metaLine.match(/位置\s*#?\s*(\d+)(?:\s*[-–]\s*(\d+))?/) ||
    metaLine.match(/location\s+(\d+)(?:\s*[-–]\s*(\d+))?/i) ||
    metaLine.match(/loc\.?\s+(\d+)(?:\s*[-–]\s*(\d+))?/i);
  if (locMatch) {
    locStart = parseInt(locMatch[1], 10) || 0;
    locEnd = locMatch[2] ? parseInt(locMatch[2], 10) || locStart : locStart;
    locationRaw = locMatch[2] ? `#${locMatch[1]}-${locMatch[2]}` : `#${locMatch[1]}`;
  }

  return {
    page,
    location: locationRaw,
    locationStart: locStart,
    locationEnd: locEnd,
  };
}

/**
 * 时间解析，尽量容错
 */
function parseCreatedAt(metaLine: string): Date {
  // 中文：添加于 2026年4月15日星期三 下午3:24:12
  const zhMatch = metaLine.match(
    /添加于\s*(\d{4})年(\d{1,2})月(\d{1,2})日[^\d]*?(上午|下午)?\s*(\d{1,2}):(\d{1,2}):(\d{1,2})/
  );
  if (zhMatch) {
    const [, y, m, d, ampm, hh, mm, ss] = zhMatch;
    let hour = parseInt(hh, 10);
    if (ampm === '下午' && hour < 12) hour += 12;
    if (ampm === '上午' && hour === 12) hour = 0;
    const date = new Date(
      parseInt(y, 10),
      parseInt(m, 10) - 1,
      parseInt(d, 10),
      hour,
      parseInt(mm, 10),
      parseInt(ss, 10)
    );
    if (!isNaN(date.getTime())) return date;
  }

  // 英文：Added on Wednesday, April 15, 2026 3:24:12 PM
  const enMatch = metaLine.match(/Added on\s+(.+)$/i);
  if (enMatch) {
    const d = new Date(enMatch[1].trim());
    if (!isNaN(d.getTime())) return d;
  }

  return new Date(0);
}

/**
 * 简易 djb2 hash，用于生成去重 id
 */
function computeId(
  bookTitle: string,
  locStart: number,
  locEnd: number,
  content: string
): string {
  const key = `${bookTitle}|${locStart}-${locEnd}|${content.slice(0, 100)}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) >>> 0;
  }
  return `kdl-${hash.toString(36)}`;
}

/**
 * 高亮-笔记配对：将同书同位置的 note 合并进 highlight
 */
export function pairHighlightsAndNotes(clippings: KindleClipping[]): PairedClipping[] {
  // 按书分组
  const byBook = new Map<string, KindleClipping[]>();
  for (const c of clippings) {
    const key = c.bookTitle;
    if (!byBook.has(key)) byBook.set(key, []);
    byBook.get(key)!.push(c);
  }

  const result: PairedClipping[] = [];

  for (const [, items] of byBook) {
    // 每本书内按位置排序
    items.sort((a, b) => a.locationStart - b.locationStart);

    const consumedNoteIds = new Set<string>();
    const highlights = items.filter((c) => c.type === 'highlight');
    const notes = items.filter((c) => c.type === 'note');

    // 给每个 highlight 找匹配的 note
    for (const h of highlights) {
      let matchedNote = '';
      for (const n of notes) {
        if (consumedNoteIds.has(n.id)) continue;
        // 位置重叠或相邻（差 ≤ 3 位）
        const overlap =
          (n.locationStart >= h.locationStart && n.locationStart <= h.locationEnd) ||
          Math.abs(n.locationStart - h.locationStart) <= 3 ||
          Math.abs(n.locationStart - h.locationEnd) <= 3;
        if (overlap) {
          matchedNote = n.content;
          consumedNoteIds.add(n.id);
          break;
        }
      }
      result.push(toPaired(h, matchedNote));
    }

    // 未配对的孤立 note 单独成条
    for (const n of notes) {
      if (consumedNoteIds.has(n.id)) continue;
      result.push(toPaired(n, ''));
    }
  }

  // 按时间倒序
  result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return result;
}

function toPaired(c: KindleClipping, note: string): PairedClipping {
  const parts: string[] = [];
  if (c.page) parts.push(`第 ${c.page} 页`);
  if (c.location) parts.push(`位置 ${c.location}`);
  const locationLabel = parts.join(' · ');

  return {
    id: c.id,
    bookTitle: c.bookTitle,
    author: c.author,
    type: c.type,
    locationLabel,
    content: c.content,
    note,
    createdAt: c.createdAt,
  };
}

/**
 * 把时间格式化为 yyyy-mm-dd，解析失败时返回今天
 */
export function formatDateForMaterial(date: Date): string {
  if (!date || isNaN(date.getTime()) || date.getTime() === 0) {
    return new Date().toISOString().split('T')[0];
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 构造 MaterialItem 的 source 字段："《书名》— 作者"
 */
export function buildSource(bookTitle: string, author: string): string {
  const title = `《${bookTitle}》`;
  return author ? `${title} — ${author}` : title;
}
