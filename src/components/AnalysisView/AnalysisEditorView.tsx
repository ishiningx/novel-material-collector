import React, { useState, useCallback, useMemo } from 'react';
import { ArrowLeft, BookmarkPlus, Edit3, Type, Star, Save } from 'lucide-react';
import { useArticleContext } from '../../store/ArticleContext';
import { useMaterialContext } from '../../store/MaterialContext';
import { useSettingsContext } from '../../store/SettingsContext';
import { HighlightedText } from './HighlightedText';
import { CommentPanel } from './CommentPanel';
import { CollectPanel } from '../CollectPanel';
import { ArchiveArticleModal } from '../ArchiveArticleModal';
import { StatusBar } from '../StatusBar';
import { useSelectionCharCount } from '../../hooks/useSelectionCharCount';
import { Toast, getCategoryColor } from '../SharedUI';
import { AVAILABLE_FONTS, FONT_SIZES } from '../../types';
import type { HighlightColor, ArticleMetadata } from '../../types';

interface AnalysisEditorViewProps {
  onBack: () => void;
}

export function AnalysisEditorView({ onBack }: AnalysisEditorViewProps) {
  const { state: articleState, getCurrentArticle, addHighlight, removeHighlight, updateComment, deleteComment, archiveArticle, updateArticle, addGenre, deleteGenre } = useArticleContext();
  const { addMaterial, addCategory, state: materialState } = useMaterialContext();
  const { settings, updateSettings } = useSettingsContext();

  const article = getCurrentArticle();
  const [scrollTop, setScrollTop] = useState(0);
  const [highlightPositions, setHighlightPositions] = useState<Map<string, number>>(new Map());
  const [toast, setToast] = useState<string | null>(null);

  // Collect panel state
  const [showCollectPanel, setShowCollectPanel] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const selectionCharCount = useSelectionCharCount();

  // Archive modal state
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Font controls menu state
  const [showFontMenu, setShowFontMenu] = useState(false);

  // Metadata panel collapse state (archived only)
  const [metaPanelOpen, setMetaPanelOpen] = useState(true);

  // Title editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const allGimmicks = useMemo(() => {
    const set = new Set<string>();
    articleState.articles.forEach((a) => {
      (a.coreGimmick || []).forEach((g) => set.add(g));
    });
    return Array.from(set);
  }, [articleState.articles]);

  // Compute material ranges for this article so the reader can show a dotted underline
  // on text segments that have been collected into the material library.
  const materialRanges = useMemo(() => {
    if (!article) return [] as { start: number; end: number }[];
    const ranges: { start: number; end: number }[] = [];
    for (const m of materialState.materials) {
      if (m.articleId && m.articleId !== article.id) continue;
      const needle = m.content;
      if (!needle || needle.length < 2) continue;
      let idx = 0;
      while ((idx = article.content.indexOf(needle, idx)) !== -1) {
        ranges.push({ start: idx, end: idx + needle.length });
        idx += needle.length;
      }
    }
    return ranges;
  }, [article?.id, article?.content, materialState.materials]);

  // Handle highlight position updates from HighlightedText
  const handleHighlightPositionsUpdate = useCallback((positions: Map<string, number>) => {
    setHighlightPositions(positions);
  }, []);

  // Handle add highlight
  const handleAddHighlight = useCallback(
    (startOffset: number, endOffset: number, color: HighlightColor) => {
      if (article) {
        addHighlight(article.id, startOffset, endOffset, color);
      }
    },
    [article, addHighlight]
  );

  // Handle remove highlight
  const handleRemoveHighlight = useCallback(
    (highlightId: string) => {
      if (article) {
        removeHighlight(article.id, highlightId);
        setToast('高亮已取消，笔记保留');
      }
    },
    [article, removeHighlight]
  );

  // Handle right-click → material collection
  const handleContextMenu = useCallback(
    (_e: React.MouseEvent, text: string) => {
      setSelectedText(text);
      setShowCollectPanel(true);
    },
    []
  );

  // Confirm collect to material library
  const handleConfirmCollect = useCallback(
    async (text: string, category: string, _note: string) => {
      if (article) {
        try {
          await addMaterial(text, category, article.title, _note, undefined, article.id);
          setToast(`已收藏到「${category}」`);
          setShowCollectPanel(false);
          setSelectedText('');
        } catch (err) {
          setToast('收藏失败，请重试');
        }
      }
    },
    [article, addMaterial]
  );

  // Handle save
  const handleSave = useCallback(() => {
    setToast('已保存');
  }, []);

  const handleSaveTitle = useCallback(() => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== article?.title) {
      updateArticle({ ...article!, title: trimmed });
    }
    setEditingTitle(false);
  }, [titleDraft, article, updateArticle]);

  // Handle archive / edit metadata
  const handleConfirmArchive = useCallback(
    async (metadata: ArticleMetadata) => {
      if (!article) return;
      try {
        if (article.status === 'archived') {
          // 保留归档状态 + 更新元数据
          await updateArticle({
            ...article,
            categories: metadata.categories,
            platform: metadata.platform,
            author: metadata.author,
            coreGimmick: metadata.coreGimmick,
            payPoint: metadata.payPoint,
            synopsis: metadata.synopsis,
            highlight: metadata.highlight,
            isClassic: metadata.isClassic,
          });
          setToast('例文信息已更新');
        } else {
          await archiveArticle(article.id, metadata);
          setToast('已加入例文库');
        }
        setShowArchiveModal(false);
      } catch (err) {
        console.error('[AnalysisEditor] archive failed:', err);
        setToast('操作失败，请重试');
      }
    },
    [article, archiveArticle, updateArticle]
  );

  if (!article) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">未找到例文记录</p>
      </div>
    );
  }

  const activeHighlightCount = article.highlights.filter((h) => h.isActive).length;
  const commentCount = article.comments.filter((c) => c.text).length;
  const totalChars = article.content.length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <header className="h-16 glass-panel border-b border-gray-200/50 dark:border-gray-700 flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={onBack}
          className="btn-ghost flex items-center gap-1"
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
          <span>返回</span>
        </button>

        <div className="w-px h-5 bg-gray-200/50 dark:bg-white/10" />

        {editingTitle ? (
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') setEditingTitle(false);
            }}
            autoFocus
            className="text-sm px-3 py-1.5 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 min-w-[200px] max-w-[300px] focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
          />
        ) : (
          <div className="flex items-center gap-1.5 group/title">
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[300px] font-medium tracking-tight">
              {article.title}
            </span>
            <button
              onClick={() => {
                setEditingTitle(true);
                setTitleDraft(article.title);
              }}
              className="btn-ghost-icon opacity-0 group-hover/title:opacity-100 shrink-0"
              title="编辑标题"
            >
              <Edit3 size={12} />
            </button>
          </div>
        )}

        <div className="text-xs text-gray-400 ml-2">
          {activeHighlightCount} 处高亮 · {commentCount} 条笔记
          {article.status === 'draft' && (
            <span className="ml-2 px-2 py-0.5 text-[10px] rounded-full bg-gray-200/60 dark:bg-dark-200 text-gray-500 dark:text-gray-400">草稿</span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Font controls */}
          <div className="relative">
            <button
              onClick={() => setShowFontMenu(!showFontMenu)}
              className="btn-ghost flex items-center gap-1"
              title="字体 / 字号"
            >
              <Type size={14} strokeWidth={1.5} />
              <span className="text-xs">{settings.fontSize}px</span>
            </button>
            {showFontMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFontMenu(false)} />
                <div className="absolute top-full right-0 mt-1 z-50 bg-white dark:bg-dark-50 border border-gray-200 dark:border-dark-100 rounded-xl shadow-lg p-3 min-w-[220px] space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5 tracking-wide">字体</label>
                    <select
                      value={settings.fontFamily}
                      onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                      className="w-full text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
                    >
                      {AVAILABLE_FONTS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5 tracking-wide">字号</label>
                    <select
                      value={settings.fontSize}
                      onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                      className="w-full text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
                    >
                      {FONT_SIZES.map((s) => (
                        <option key={s} value={s}>{s}px</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => {
              if (article.status === 'archived') {
                handleSave();
              } else {
                setShowArchiveModal(true);
              }
            }}
            className="btn-primary flex items-center gap-1.5"
            title={article.status === 'archived' ? '保存（高亮与笔记已自动保存）' : '加入例文库'}
          >
            {article.status === 'archived' ? <Save size={14} strokeWidth={1.5} /> : <BookmarkPlus size={14} strokeWidth={1.5} />}
            {article.status === 'archived' ? '保存' : '加入例文库'}
          </button>
        </div>
      </header>

      {/* Dual-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column: metadata panel + highlighted text (65%) */}
        <div className="flex-[6.5] min-w-0 flex flex-col">
          {/* Metadata panel (archived only) — shown above the article text */}
          {article.status === 'archived' && (
            <div className="border-b border-gray-100 dark:border-dark-100/60 bg-surface dark:bg-dark px-4 py-2.5 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setMetaPanelOpen(!metaPanelOpen)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
                >
                  {metaPanelOpen ? '▼' : '▶'} 例文信息
                </button>
                <div className="flex items-center gap-3">
                  {article.isClassic && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Star size={12} className="fill-amber-500" />
                      经典热文
                    </span>
                  )}
                  {metaPanelOpen && (
                    <button
                      onClick={() => setShowArchiveModal(true)}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                    >
                      <Edit3 size={11} />
                      修改信息
                    </button>
                  )}
                </div>
              </div>
              {metaPanelOpen && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0 w-20 text-right">题材：</span>
                    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                      {(article.categories && article.categories.length > 0) ? (
                        article.categories.map((c) => (
                          <span key={c} className={`px-1.5 py-0.5 rounded ${getCategoryColor(c)}`}>{c}</span>
                        ))
                      ) : (
                        <span className="text-gray-400">——</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0 w-20 text-right">平台：</span>
                    <span className="text-gray-700 dark:text-gray-300 flex-1 min-w-0 break-words">{article.platform || '——'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0 w-20 text-right">作者：</span>
                    <span className="text-gray-700 dark:text-gray-300 flex-1 min-w-0 break-words">{article.author || '——'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0 w-20 text-right">核心梗：</span>
                    <span className="text-gray-700 dark:text-gray-300 flex-1 min-w-0 break-words">
                      {(article.coreGimmick && article.coreGimmick.length > 0) ? article.coreGimmick.join('、') : '——'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0 w-20 text-right">付费点：</span>
                    <span className="text-gray-700 dark:text-gray-300 flex-1 min-w-0 break-words">{article.payPoint || '——'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0 w-20 text-right">梗概：</span>
                    <span className="text-gray-700 dark:text-gray-300 flex-1 min-w-0 break-words">{article.synopsis || '——'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0 w-20 text-right">亮点：</span>
                    <span className="text-gray-700 dark:text-gray-300 flex-1 min-w-0 break-words">{article.highlight || '——'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0 w-20 text-right">经典热文：</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {article.isClassic ? (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Star size={11} className="fill-amber-500" /> 是
                        </span>
                      ) : '否'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0">
            <HighlightedText
              content={article.content}
              highlights={article.highlights}
              materialRanges={materialRanges}
              onAddHighlight={handleAddHighlight}
              onRemoveHighlight={handleRemoveHighlight}
              onHighlightPositionsUpdate={handleHighlightPositionsUpdate}
              onScroll={(st) => setScrollTop(st)}
              onContextMenu={handleContextMenu}
              fontFamily={settings.fontFamily}
              fontSize={settings.fontSize}
            />
          </div>
        </div>

        {/* Right column: notes (35%) */}
        <div className="flex-[3.5] min-w-0">
          <CommentPanel
            comments={article.comments}
            highlights={article.highlights}
            highlightPositions={highlightPositions}
            scrollTop={scrollTop}
            onUpdateComment={(commentId, text) => updateComment(article.id, commentId, text)}
            onDeleteComment={(commentId) => deleteComment(article.id, commentId)}
          />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar
        totalChars={totalChars}
        selectionChars={selectionCharCount}
        leftContent={<span>选中文字可选择颜色高亮 · 右键可收藏到素材库</span>}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Collect panel */}
      <CollectPanel
        visible={showCollectPanel}
        selectedText={selectedText}
        categories={materialState.categories}
        onConfirm={handleConfirmCollect}
        onClose={() => setShowCollectPanel(false)}
        addCategory={addCategory}
      />

      {/* Archive article modal */}
      <ArchiveArticleModal
        visible={showArchiveModal}
        article={article}
        genres={articleState.genres}
        allGimmicks={allGimmicks}
        onConfirm={handleConfirmArchive}
        onClose={() => setShowArchiveModal(false)}
        addGenre={addGenre}
        deleteGenre={deleteGenre}
      />
    </div>
  );
}
