import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown, Trash2, FolderPlus } from 'lucide-react';
import { useMaterialContext } from '../store/MaterialContext';
import { ConfirmDialog, Toast } from './SharedUI';

interface ManageCategoriesModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ManageCategoriesModal({ visible, onClose }: ManageCategoriesModalProps) {
  const {
    state,
    addCategory,
    updateCategory,
    reorderCategories,
    deleteCategoryAndMigrateMaterials,
    getMaterialCountByCategory,
  } = useMaterialContext();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 每次打开时重置编辑状态
  useEffect(() => {
    if (!visible) return;
    setNewName('');
    setEditingId(null);
    setDraftName('');
    setConfirmDeleteId(null);
  }, [visible]);

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  if (!visible) return null;

  const move = (index: number, dir: -1 | 1) => {
    const next = [...state.categories];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderCategories(next.map((c) => c.id)).catch(() => setToast('排序保存失败'));
  };

  const submitRename = async () => {
    if (!editingId) return;
    const trimmed = draftName.trim();
    setEditingId(null);
    if (!trimmed) return;
    try {
      await updateCategory(editingId, trimmed);
      setToast('分类名称已更新');
    } catch (err: any) {
      setToast(err?.message || '改名失败，请重试');
    }
  };

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await addCategory(trimmed);
    setNewName('');
    setToast('分类已添加');
  };

  const handleDelete = async (id: string) => {
    const cat = state.categories.find((c) => c.id === id);
    await deleteCategoryAndMigrateMaterials(id);
    setConfirmDeleteId(null);
    setToast(`分类「${cat?.name}」已删除，素材已移至「未分类」`);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-dark-50 rounded-xl shadow-2xl border border-gray-200 dark:border-dark-100 w-[440px] animate-fade-in overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-dark-100 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">整理素材分类</h3>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Category list */}
        <div className="px-4 py-3 flex-1 overflow-y-auto space-y-0.5">
          {/* 排序提示（顶部显眼） */}
          <div className="mb-2 px-2 py-1.5 rounded-lg bg-primary/5 text-primary text-[11px]">
            点击左侧上下箭头调整分类顺序，顺序会同步到素材库侧边栏与添加素材窗口
          </div>
          {state.categories.map((cat, index) => {
            const isUncategorized = cat.name === '未分类';
            const editing = editingId === cat.id;
            return (
              <div
                key={cat.id}
                className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${editing ? 'bg-primary/5' : 'hover:bg-gray-50 dark:hover:bg-dark-200'}`}
              >
                {/* Move up / down */}
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="p-1 rounded-md text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-dark-200 disabled:opacity-25 disabled:cursor-default disabled:hover:bg-transparent -mb-1 transition-colors"
                    title="上移"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === state.categories.length - 1}
                    className="p-1 rounded-md text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-dark-200 disabled:opacity-25 disabled:cursor-default disabled:hover:bg-transparent -mt-1 transition-colors"
                    title="下移"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Name / rename input */}
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <input
                      ref={inputRef}
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={submitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="w-full text-sm px-2 py-1 rounded-md ring-1 ring-inset ring-primary/40 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        if (!isUncategorized) {
                          setEditingId(cat.id);
                          setDraftName(cat.name);
                        }
                      }}
                      disabled={isUncategorized}
                      className={`w-full text-left text-sm truncate ${
                        isUncategorized
                          ? 'text-gray-400 cursor-default'
                          : 'text-gray-700 dark:text-gray-300 hover:text-primary transition-colors'
                      }`}
                      title={isUncategorized ? '默认分类，不可改名' : '点击改名'}
                    >
                      {cat.name}
                    </button>
                  )}
                </div>

                {/* Count */}
                <span className="text-xs text-gray-400 shrink-0 w-6 text-right">
                  {getMaterialCountByCategory(cat.name)}
                </span>

                {/* Delete */}
                <button
                  onClick={() => setConfirmDeleteId(cat.id)}
                  disabled={isUncategorized}
                  className={`btn-ghost-icon shrink-0 ${isUncategorized ? 'opacity-25 cursor-not-allowed' : ''}`}
                  title={isUncategorized ? '默认分类，不可删除' : '删除分类'}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
          {state.categories.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">暂无分类</p>
          )}
        </div>

        {/* Add category */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-100 shrink-0">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="输入新分类名称"
              className="flex-1 text-sm px-3 py-2 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-surface dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FolderPlus size={14} />
              添加
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            「未分类」为默认分类，不可改名或删除。
          </p>
        </div>
      </div>

      {/* Confirm delete category */}
      {confirmDeleteId && (
        <ConfirmDialog
          title="删除分类"
          message={`确定要删除这个分类吗？该分类下的 ${getMaterialCountByCategory(state.categories.find((c) => c.id === confirmDeleteId)?.name || '')} 条素材将移至「未分类」。`}
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
