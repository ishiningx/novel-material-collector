import React, { useState, useCallback } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useAnalysisContext } from '../../store/AnalysisContext';
import { useMaterialContext } from '../../store/MaterialContext';
import { HighlightedText } from './HighlightedText';
import { CommentPanel } from './CommentPanel';
import { Toast } from '../SharedUI';
import type { HighlightColor } from '../../types';

interface AnalysisEditorViewProps {
  onBack: () => void;
}

export function AnalysisEditorView({ onBack }: AnalysisEditorViewProps) {
  const { getCurrentAnalysis, addHighlight, removeHighlight, updateComment, deleteComment } = useAnalysisContext();
  const { addMaterial, state: materialState } = useMaterialContext();

  const analysis = getCurrentAnalysis();
  const [scrollTop, setScrollTop] = useState(0);
  const [highlightPositions, setHighlightPositions] = useState<Map<string, number>>(new Map());
  const [toast, setToast] = useState<string | null>(null);

  // Collect panel state (reuse pattern from ReaderView)
  const [showCollectPanel, setShowCollectPanel] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [note, setNote] = useState('');

  // Handle highlight position updates from HighlightedText
  const handleHighlightPositionsUpdate = useCallback((positions: Map<string, number>) => {
    setHighlightPositions(positions);
  }, []);

  // Handle add highlight
  const handleAddHighlight = useCallback(
    (startOffset: number, endOffset: number, color: HighlightColor) => {
      if (analysis) {
        addHighlight(analysis.id, startOffset, endOffset, color);
      }
    },
    [analysis, addHighlight]
  );

  // Handle remove highlight
  const handleRemoveHighlight = useCallback(
    (highlightId: string) => {
      if (analysis) {
        removeHighlight(analysis.id, highlightId);
        setToast('高亮已取消，笔记保留');
      }
    },
    [analysis, removeHighlight]
  );

  // Handle right-click → material collection
  const handleContextMenu = useCallback(
    (_e: React.MouseEvent, text: string) => {
      setSelectedText(text);
      setSelectedCat(null);
      setNote('');
      setShowCollectPanel(true);
    },
    []
  );

  // Confirm collect to material library
  const handleConfirmCollect = useCallback(async () => {
    if (selectedText && selectedCat && analysis) {
      try {
        await addMaterial(selectedText, selectedCat, analysis.title);
        setToast(`已收藏到「${selectedCat}」`);
        setShowCollectPanel(false);
        setSelectedText('');
        setSelectedCat(null);
        setNote('');
      } catch (err) {
        setToast('收藏失败，请重试');
      }
    }
  }, [selectedText, selectedCat, analysis, addMaterial]);

  // Handle save
  const handleSave = useCallback(() => {
    setToast('已保存');
  }, []);

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">未找到拆文记录</p>
      </div>
    );
  }

  const activeHighlightCount = analysis.highlights.filter((h) => h.isActive).length;
  const commentCount = analysis.comments.filter((c) => c.text).length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <header className="h-14 border-b border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-50 flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">返回</span>
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-dark-100" />

        <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[300px] font-medium">
          {analysis.title}
        </span>

        <div className="text-xs text-gray-400 ml-2">
          {activeHighlightCount} 处高亮 · {commentCount} 条拆文笔记
        </div>

        <div className="ml-auto">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-200 text-primary-700 text-sm rounded-lg hover:bg-primary-300 transition-colors shadow-sm"
          >
            <Save size={14} />
            保存
          </button>
        </div>
      </header>

      {/* Dual-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column: highlighted text (65%) */}
        <div className="flex-[6.5] min-w-0">
          <HighlightedText
            content={analysis.content}
            highlights={analysis.highlights}
            onAddHighlight={handleAddHighlight}
            onRemoveHighlight={handleRemoveHighlight}
            onHighlightPositionsUpdate={handleHighlightPositionsUpdate}
            onScroll={(st) => setScrollTop(st)}
            onContextMenu={handleContextMenu}
          />
        </div>

        {/* Right column: notes (35%) */}
        <div className="flex-[3.5] min-w-0">
          <CommentPanel
            comments={analysis.comments}
            highlights={analysis.highlights}
            highlightPositions={highlightPositions}
            scrollTop={scrollTop}
            onUpdateComment={(commentId, text) => updateComment(analysis.id, commentId, text)}
            onDeleteComment={(commentId) => deleteComment(analysis.id, commentId)}
          />
        </div>
      </div>

      {/* Status bar */}
      <footer className="h-8 border-t border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-50 flex items-center px-4 text-xs text-gray-400 dark:text-gray-600 shrink-0">
        <span>选中文字可选择颜色高亮 · 右键可收藏到素材库</span>
      </footer>

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Collect panel */}
      {showCollectPanel && selectedText && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowCollectPanel(false)} />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-dark-50 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-100 w-[420px] animate-fade-in overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-dark-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">收藏素材</h3>
              <button onClick={() => setShowCollectPanel(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                ✕
              </button>
            </div>

            <div className="px-5 py-3 border-b border-gray-50 dark:border-dark-100">
              <p className="text-xs text-gray-400 mb-1.5">选中内容：</p>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-h-24 overflow-y-auto bg-surface dark:bg-dark rounded-lg p-3 line-clamp-4">
                {selectedText}
              </div>
            </div>

            <div className="px-5 py-3">
              <p className="text-xs text-gray-500 mb-2 font-medium">选择分类：</p>
              <div className="flex flex-wrap gap-1.5">
                {materialState.categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCat(cat.name)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${
                      selectedCat === cat.name
                        ? 'bg-primary-200 text-primary-700 border-primary-300 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-dark-100 hover:border-primary/50 hover:text-primary'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-50 dark:border-dark-100">
              <input
                type="text"
                placeholder="添加备注（可选）"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmCollect()}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-surface dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-100 flex justify-end gap-2">
              <button
                onClick={() => setShowCollectPanel(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmCollect}
                disabled={!selectedCat}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                  selectedCat
                    ? 'bg-primary-200 text-primary-700 hover:bg-primary-300 shadow-sm'
                    : 'bg-gray-200 dark:bg-dark-200 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                收藏
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
