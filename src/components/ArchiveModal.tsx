import React, { useState, useEffect } from 'react';
import { X, Check, FileText } from 'lucide-react';
import type { ArchiveRecord } from '../types';
import { useSettingsContext } from '../store/SettingsContext';
import { Toast } from './SharedUI';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  originalFilePath?: string;
  onArchive: (record: ArchiveRecord) => Promise<void>;
}

export function ArchiveModal({ isOpen, onClose, fileName, originalFilePath, onArchive }: ArchiveModalProps) {
  const { settings } = useSettingsContext();
  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState('');
  const [platform, setPlatform] = useState('');
  const [coreGimmick, setCoreGimmick] = useState('');
  const [payPoint, setPayPoint] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [highlight, setHighlight] = useState('');
  const [isClassic, setIsClassic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 当 fileName 变化或弹窗打开时，自动填入作品名称
  useEffect(() => {
    if (isOpen && fileName) {
      setTitle(fileName.replace(/\.(txt|docx)$/i, ''));
    }
  }, [isOpen, fileName]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setToast('作品名称不能为空');
      return;
    }

    setLoading(true);
    try {
      const record: ArchiveRecord = {
        id: `archive-${Date.now()}`,
        title: title.trim(),
        categories: categories.split(/[,、，]/).map(s => s.trim()).filter(Boolean),
        platform: platform.trim(),
        coreGimmick: coreGimmick.trim(),
        payPoint: payPoint.trim(),
        synopsis: synopsis.trim(),
        highlight: highlight.trim(),
        isClassic,
        originalFileName: fileName,
        createdAt: new Date().toISOString(),
      };

      await onArchive(record);
      setToast('收藏成功！');
      setTimeout(() => {
        onClose();
        resetForm();
      }, 800);
    } catch (err) {
      console.error('[Archive] Failed:', err);
      setToast('收藏失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCategories('');
    setPlatform('');
    setCoreGimmick('');
    setPayPoint('');
    setSynopsis('');
    setHighlight('');
    setIsClassic(false);
  };

  if (!isOpen) return null;

  const isConfigured = settings.obsidianExampleIndexPath && settings.obsidianExampleArchivePath;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
        <div
          className="bg-white dark:bg-dark-50 rounded-xl shadow-2xl w-full max-w-lg animate-slide-in pointer-events-auto max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-dark-50 flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-100">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">收藏到例文索引</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {!isConfigured && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm rounded-lg">
                请先在设置中配置 Obsidian 路径
              </div>
            )}

            {/* 作品名称 - 自动带入，只读显示 */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1.5">
                作品名称
              </label>
              <div className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-gray-50 dark:bg-dark-100 text-gray-700 dark:text-gray-300">
                {title || '（未打开文档）'}
              </div>
            </div>

            {/* 分类和平台 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1.5">
                  分类（用、分隔）
                </label>
                <input
                  type="text"
                  value={categories}
                  onChange={e => setCategories(e.target.value)}
                  placeholder="追妻、爽文、世情..."
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1.5">
                  平台
                </label>
                <input
                  type="text"
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  placeholder="九州、点众、黑岩..."
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* 核心梗 */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1.5">
                核心梗
              </label>
              <input
                type="text"
                value={coreGimmick}
                onChange={e => setCoreGimmick(e.target.value)}
                placeholder="一句话描述核心梗..."
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* 付费点 */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1.5">
                付费点
              </label>
              <textarea
                value={payPoint}
                onChange={e => setPayPoint(e.target.value)}
                placeholder="描述付费点..."
                rows={2}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* 梗概 */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1.5">
                梗概
              </label>
              <textarea
                value={synopsis}
                onChange={e => setSynopsis(e.target.value)}
                placeholder="简述故事梗概..."
                rows={2}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* 亮点 */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1.5">
                亮点
              </label>
              <textarea
                value={highlight}
                onChange={e => setHighlight(e.target.value)}
                placeholder="这篇作品的亮点..."
                rows={2}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* 经典热文 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isClassic"
                checked={isClassic}
                onChange={e => setIsClassic(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
              />
              <label htmlFor="isClassic" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                经典热文
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-dark-50 flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-dark-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !isConfigured}
              className="px-4 py-2 text-sm bg-primary-200 text-primary-700 rounded-lg hover:bg-primary-300 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                '处理中...'
              ) : (
                <>
                  <Check size={14} />
                  确认收藏
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
