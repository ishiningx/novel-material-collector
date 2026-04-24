import React, { useState, useCallback } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useAnalysisContext } from '../../store/AnalysisContext';
import { useMaterialContext } from '../../store/MaterialContext';
import { HighlightedText } from './HighlightedText';
import { CommentPanel } from './CommentPanel';
import { CollectPanel } from '../CollectPanel';
import { StatusBar } from '../StatusBar';
import { useSelectionCharCount } from '../../hooks/useSelectionCharCount';
import { Toast } from '../SharedUI';
import type { HighlightColor } from '../../types';

interface AnalysisEditorViewProps {
  onBack: () => void;
}

export function AnalysisEditorView({ onBack }: AnalysisEditorViewProps) {
  const { getCurrentAnalysis, addHighlight, removeHighlight, updateComment, deleteComment } = useAnalysisContext();
  const { addMaterial, addCategory, state: materialState } = useMaterialContext();

  const analysis = getCurrentAnalysis();
  const [scrollTop, setScrollTop] = useState(0);
  const [highlightPositions, setHighlightPositions] = useState<Map<string, number>>(new Map());
  const [toast, setToast] = useState<string | null>(null);

  // Collect panel state
  const [showCollectPanel, setShowCollectPanel] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const selectionCharCount = useSelectionCharCount();

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
      setShowCollectPanel(true);
    },
    []
  );

  // Confirm collect to material library
  const handleConfirmCollect = useCallback(
    async (text: string, category: string, _note: string) => {
      if (analysis) {
        try {
          await addMaterial(text, category, analysis.title);
          setToast(`已收藏到「${category}」`);
          setShowCollectPanel(false);
          setSelectedText('');
        } catch (err) {
          setToast('收藏失败，请重试');
        }
      }
    },
    [analysis, addMaterial]
  );

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
  const totalChars = analysis.content.length;

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
    </div>
  );
}
