import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Scissors, Calendar, StickyNote } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useAnalysisContext } from '../../store/AnalysisContext';
import { parseFile } from '../../services/fileParser';
import { Toast, ConfirmDialog } from '../SharedUI';

interface AnalysisListViewProps {
  onOpenAnalysis: (id: string) => void;
}

export function AnalysisListView({ onOpenAnalysis }: AnalysisListViewProps) {
  const { state, addAnalysis, deleteAnalysis } = useAnalysisContext();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create new analysis
  const handleNewAnalysis = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: '文档', extensions: ['txt', 'docx'] }],
    });

    if (!selected) return;

    setLoading(true);
    try {
      const filePath = selected as string;
      const fileName = filePath.split('/').pop() || 'untitled';
      const doc = await parseFile(filePath, fileName);
      const analysis = await addAnalysis(doc.title, doc.content);
      onOpenAnalysis(analysis.id);
    } catch (err) {
      console.error('Failed to create analysis:', err);
      setToast('文档解析失败，请确认文件格式正确');
    } finally {
      setLoading(false);
    }
  }, [addAnalysis, onOpenAnalysis]);

  // Delete analysis
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteAnalysis(id);
      setConfirmDeleteId(null);
      setToast('拆文记录已删除');
    },
    [deleteAnalysis]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <header className="h-14 border-b border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-50 flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={handleNewAnalysis}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-200 text-primary-700 text-sm rounded-lg hover:bg-primary-300 transition-colors shadow-sm disabled:opacity-50"
        >
          <Plus size={15} />
          {loading ? '导入中...' : '新建拆文'}
        </button>

        <span className="text-xs text-gray-400 ml-auto">
          共 {state.analyses.length} 篇拆文
        </span>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-surface dark:bg-dark">
        {state.loading ? (
          <div className="text-center text-gray-400 py-12">加载中...</div>
        ) : state.analyses.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto bg-primary/5 dark:bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Scissors size={32} className="text-primary/30" />
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-base">还没有拆文记录</p>
            <p className="text-gray-400 dark:text-gray-600 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
              导入一篇小说，选中文字高亮并添加笔记，开始你的拆文之旅
            </p>
            <button
              onClick={handleNewAnalysis}
              className="mt-4 px-4 py-2 bg-primary-200 text-primary-700 text-sm rounded-lg hover:bg-primary-300 transition-colors"
            >
              开始拆文
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl mx-auto">
            {state.analyses.map((analysis) => {
              const noteCount = analysis.comments.length;

              return (
                <div
                  key={analysis.id}
                  className="bg-white dark:bg-dark-50 rounded-xl border border-gray-100 dark:border-dark-100 shadow-sm px-4 py-3 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group flex items-center"
                  onClick={() => onOpenAnalysis(analysis.id)}
                >
                  <Scissors size={14} className="text-primary/40 shrink-0 mr-3" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {analysis.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600">
                      <Calendar size={11} />
                      {analysis.updatedAt}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600">
                      <StickyNote size={11} />
                      {noteCount}条笔记
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(analysis.id);
                      }}
                      className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="删除拆文记录"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Confirm delete */}
      {confirmDeleteId && (
        <ConfirmDialog
          title="删除拆文记录"
          message="确定要删除这篇拆文记录吗？所有高亮和笔记将被删除，此操作不可撤销。"
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
