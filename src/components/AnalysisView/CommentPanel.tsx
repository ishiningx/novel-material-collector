import React, { useState, useCallback } from 'react';
import { X, MessageSquare } from 'lucide-react';
import type { Comment, Highlight } from '../../types';
import { HIGHLIGHT_COLOR_MAP } from '../../types';
import { alignComments, type AlignedComment } from '../../services/highlightRenderer';

interface CommentPanelProps {
  comments: Comment[];
  highlights: Highlight[];
  highlightPositions: Map<string, number>;
  scrollTop: number;
  onUpdateComment: (commentId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export function CommentPanel({
  comments,
  highlights,
  highlightPositions,
  scrollTop,
  onUpdateComment,
  onDeleteComment,
}: CommentPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Use scrollTop=0 for absolute positioning (scroll sync via translateY)
  const alignedComments = alignComments(comments, highlightPositions, 0);

  // Calculate total content height
  const maxBottom = alignedComments.length > 0
    ? Math.max(...alignedComments.map((ac) => ac.actualTop + ac.estimatedHeight))
    : 0;

  const handleEditStart = useCallback((commentId: string) => {
    setEditingId(commentId);
  }, []);

  const handleEditBlur = useCallback(
    (commentId: string, text: string) => {
      onUpdateComment(commentId, text);
      setEditingId(null);
    },
    [onUpdateComment]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, commentId: string, text: string) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onUpdateComment(commentId, text);
        setEditingId(null);
      }
      if (e.key === 'Escape') {
        setEditingId(null);
      }
    },
    [onUpdateComment]
  );

  const renderComment = (ac: AlignedComment, index: number) => {
    const colorMap = HIGHLIGHT_COLOR_MAP[ac.comment.color];
    const linkedHighlight = highlights.find((h) => h.id === ac.comment.highlightId);
    const isInactive = linkedHighlight && !linkedHighlight.isActive;

    return (
      <div
        key={ac.comment.id}
        className={`absolute left-2 right-2 rounded-lg border-l-[3px] ${colorMap.border} bg-white dark:bg-dark-50 p-3 shadow-sm border-t border-r border-b border-gray-100 dark:border-dark-100 ${isInactive ? 'opacity-60' : ''}`}
        style={{ top: ac.actualTop }}
      >
        <div className="flex items-start gap-2">
          <MessageSquare size={12} className={`${colorMap.text} mt-0.5 shrink-0`} />
          <div className="flex-1 min-w-0">
            {isInactive && (
              <span className="text-xs text-gray-400 dark:text-gray-600 mb-1 block">
                高亮已取消
              </span>
            )}
            {editingId === ac.comment.id ? (
              <textarea
                autoFocus
                defaultValue={ac.comment.text}
                className={`w-full text-sm ${colorMap.text} bg-transparent resize-none focus:outline-none min-h-[40px]`}
                onBlur={(e) => handleEditBlur(ac.comment.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, ac.comment.id, (e.target as HTMLTextAreaElement).value)}
              />
            ) : (
              <div
                onClick={() => handleEditStart(ac.comment.id)}
                className={`text-sm ${colorMap.text} cursor-pointer hover:opacity-80 transition-opacity min-h-[20px] whitespace-pre-wrap ${!ac.comment.text ? 'italic opacity-40' : ''}`}
              >
                {ac.comment.text || '点击添加笔记...'}
              </div>
            )}
          </div>
          <button
            onClick={() => onDeleteComment(ac.comment.id)}
            className="p-0.5 text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 transition-colors shrink-0"
            title="删除笔记"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    );
  };

  const orphanedComments = alignedComments.filter((ac) => ac.isOrphaned);
  const normalComments = alignedComments.filter((ac) => !ac.isOrphaned);

  // Empty state
  if (comments.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-dark border-l border-gray-200 dark:border-dark-100">
        <div className="text-center">
          <MessageSquare size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-400 dark:text-gray-600">选中文字后高亮</p>
          <p className="text-sm text-gray-400 dark:text-gray-600">笔记会显示在这里</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-gray-50 dark:bg-dark border-l border-gray-200 dark:border-dark-100">
      <div
        className="relative px-1"
        style={{
          transform: `translateY(-${scrollTop}px)`,
          minHeight: maxBottom + 200,
          willChange: 'transform',
        }}
      >
        {normalComments.map((ac, i) => renderComment(ac, i))}

        {/* Orphaned comments section */}
        {orphanedComments.length > 0 && (
          <>
            <div
              className="absolute left-2 right-2 border-t border-dashed border-gray-200 dark:border-dark-100 pt-2"
              style={{ top: orphanedComments[0].actualTop - 16 }}
            >
              <span className="text-xs text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-dark px-2">
                未关联高亮的笔记
              </span>
            </div>
            {orphanedComments.map((ac, i) => renderComment(ac, i + normalComments.length))}
          </>
        )}
      </div>
    </div>
  );
}
