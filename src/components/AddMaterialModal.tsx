import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Category } from '../types';

interface AddMaterialModalProps {
  visible: boolean;
  categories: Category[];
  onConfirm: (content: string, category: string, source: string, note: string) => Promise<void>;
  onClose: () => void;
}

export function AddMaterialModal({ visible, categories, onConfirm, onClose }: AddMaterialModalProps) {
  const [content, setContent] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!visible) return null;

  const canSubmit = content.trim() && selectedCat;

  const handleConfirm = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(content.trim(), selectedCat!, source.trim(), note.trim());
      // Reset form
      setContent('');
      setSelectedCat(null);
      setSource('');
      setNote('');
    } catch (err) {
      console.error('[AddMaterialModal] Failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setContent('');
    setSelectedCat(null);
    setSource('');
    setNote('');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={handleClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-dark-50 rounded-xl shadow-2xl border border-gray-200 dark:border-dark-100 w-[480px] animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-dark-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">添加新素材</h3>
          <button onClick={handleClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-3 space-y-3">
          {/* Content input */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">素材内容 *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入素材内容..."
              rows={4}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              autoFocus
            />
          </div>

          {/* Category selection */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">选择分类 *</label>
            <div className="flex flex-wrap gap-1.5">
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
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">来源作品</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="可选，填写来源作品名称"
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">备注</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可选，添加备注"
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-100 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit || submitting}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              canSubmit && !submitting
                ? 'bg-primary-200 text-primary-700 hover:bg-primary-300 shadow-sm'
                : 'bg-gray-200 dark:bg-dark-200 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }`}
          >
            {submitting ? '添加中...' : '添加'}
          </button>
        </div>
      </div>
    </>
  );
}
