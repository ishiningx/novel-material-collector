import React, { useState, useEffect } from 'react';
import { X, FolderOpen, FileText, Settings, Check } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsContext } from '../store/SettingsContext';
import { Toast } from './SharedUI';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettingsContext();
  const [exampleIndexPath, setExampleIndexPath] = useState('');
  const [exampleArchivePath, setExampleArchivePath] = useState('');
  const [hotArchivePath, setHotArchivePath] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (settings.loaded) {
      setExampleIndexPath(settings.obsidianExampleIndexPath);
      setExampleArchivePath(settings.obsidianExampleArchivePath);
      setHotArchivePath(settings.obsidianHotArchivePath);
    }
  }, [settings]);

  const handleSelectFile = async (type: 'index') => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (selected && typeof selected === 'string') {
      if (type === 'index') {
        setExampleIndexPath(selected);
      }
    }
  };

  const handleSelectFolder = async (type: 'example' | 'hot') => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected && typeof selected === 'string') {
      if (type === 'example') {
        setExampleArchivePath(selected);
      } else {
        setHotArchivePath(selected);
      }
    }
  };

  const handleSave = async () => {
    await updateSettings({
      obsidianExampleIndexPath: exampleIndexPath,
      obsidianExampleArchivePath: exampleArchivePath,
      obsidianHotArchivePath: hotArchivePath,
    });
    setToast('设置已保存');
    setTimeout(onClose, 500);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div 
          className="bg-white dark:bg-dark-50 rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-slide-in pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-100">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-primary" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">设置</h2>
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
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Obsidian 路径配置</h3>
              
              {/* 例文索引文件 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1.5">
                  例文索引文件 (例文索引.md)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={exampleIndexPath}
                    onChange={e => setExampleIndexPath(e.target.value)}
                    placeholder="选择或输入例文索引.md的完整路径"
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-surface dark:bg-dark text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    onClick={() => handleSelectFile('index')}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-100 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-200 flex items-center gap-1.5"
                  >
                    <FileText size={14} />
                    选择
                  </button>
                </div>
              </div>

              {/* 例文存档文件夹 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1.5">
                  例文存档文件夹
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={exampleArchivePath}
                    onChange={e => setExampleArchivePath(e.target.value)}
                    placeholder="选择例文存档文件夹"
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-surface dark:bg-dark text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    onClick={() => handleSelectFolder('example')}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-100 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-200 flex items-center gap-1.5"
                  >
                    <FolderOpen size={14} />
                    选择
                  </button>
                </div>
              </div>

              {/* 热文库文件夹 */}
              <div className="mb-2">
                <label className="block text-xs text-gray-500 dark:text-gray-500 mb-1.5">
                  热文库文件夹
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={hotArchivePath}
                    onChange={e => setHotArchivePath(e.target.value)}
                    placeholder="选择热文库文件夹"
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-surface dark:bg-dark text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    onClick={() => handleSelectFolder('hot')}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-100 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-200 flex items-center gap-1.5"
                  >
                    <FolderOpen size={14} />
                    选择
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-dark-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-primary-200 text-primary-700 rounded-lg hover:bg-primary-300 transition-colors flex items-center gap-1.5"
            >
              <Check size={14} />
              保存设置
            </button>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}

// 设置按钮组件（放在侧边栏底部）
export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-400 rounded hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
      title="设置"
    >
      <Settings size={14} />
    </button>
  );
}
