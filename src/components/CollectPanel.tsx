import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { Category } from '../types';

interface CollectPanelProps {
  visible: boolean;
  selectedText: string;
  categories: Category[];
  loading?: boolean;
  onConfirm: (text: string, category: string, note: string) => void | Promise<void>;
  onClose: () => void;
  addCategory: (name: string) => Promise<void>;
}

export function CollectPanel({
  visible,
  selectedText,
  categories,
  loading,
  onConfirm,
  onClose,
  addCategory,
}: CollectPanelProps) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  if (!visible || !selectedText) return null;

  const handleConfirm = async () => {
    if (selectedCat) {
      try {
        await onConfirm(selectedText, selectedCat, note);
      } catch {
        // Parent handles error via toast
      }
      setSelectedCat(null);
      setNote('');
      setShowAddCategory(false);
      setNewCategoryName('');
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setAddingCategory(true);
    try {
      await addCategory(name);
      setSelectedCat(name);
      setNewCategoryName('');
      setShowAddCategory(false);
    } catch (err) {
      console.error('[CollectPanel] Failed to add category:', err);
    } finally {
      setAddingCategory(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-dark-50 rounded-xl shadow-2xl border border-gray-200 dark:border-dark-100 w-[420px] animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-dark-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">收藏素材</h3>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Selected text preview */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-dark-100">
          <p className="text-xs text-gray-400 mb-1.5">选中内容：</p>
          <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-h-24 overflow-y-auto bg-surface dark:bg-dark rounded-lg p-3 line-clamp-4">
            {selectedText}
          </div>
        </div>

        {/* Category selection */}
        <div className="px-5 py-3">
          <p className="text-xs text-gray-500 mb-2 font-medium">选择分类：</p>
          <div className="flex flex-wrap gap-1.5">
            {loading ? (
              <span className="text-sm text-gray-400">加载中...</span>
            ) : categories.length === 0 ? (
              <span className="text-sm text-red-500">分类加载失败，请重启应用</span>
            ) : (
              <>
                {categories.map((cat) => (
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
                <button
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-all border border-dashed border-gray-300 dark:border-dark-100 text-gray-400 hover:text-primary hover:border-primary/50 flex items-center gap-1"
                >
                  <Plus size={12} />
                  添加新分类
                </button>
              </>
            )}
          </div>

          {/* Add new category input */}
          {showAddCategory && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategory();
                  if (e.key === 'Escape') setShowAddCategory(false);
                }}
                placeholder="输入分类名称"
                autoFocus
                className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-dark-100 bg-surface dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim() || addingCategory}
                className="px-3 py-1.5 text-sm bg-primary-200 text-primary-700 rounded-lg hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingCategory ? '...' : '添加'}
              </button>
              <button
                onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }}
                className="px-2 py-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                取消
              </button>
            </div>
          )}
        </div>

        {/* Note input */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-100">
          <input
            type="text"
            placeholder="添加备注（可选）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
            }}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-surface dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Action buttons */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
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
  );
}
