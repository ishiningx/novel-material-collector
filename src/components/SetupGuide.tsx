import React, { useState } from 'react';
import { FileText, FolderOpen, ArrowRight, Sparkles } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsContext } from '../store/SettingsContext';
import { Toast } from './SharedUI';

interface SetupGuideProps {
  onComplete: () => void;
}

export function SetupGuide({ onComplete }: SetupGuideProps) {
  const { updateSettings } = useSettingsContext();
  const [step, setStep] = useState(1);
  const [exampleIndexPath, setExampleIndexPath] = useState('');
  const [exampleArchivePath, setExampleArchivePath] = useState('');
  const [hotArchivePath, setHotArchivePath] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const handleSelectFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (selected && typeof selected === 'string') {
      setExampleIndexPath(selected);
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

  const handleNext = () => {
    if (step === 1 && !exampleIndexPath) {
      setToast('请选择例文索引文件');
      return;
    }
    if (step === 2 && !exampleArchivePath) {
      setToast('请选择例文存档文件夹');
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleComplete = async () => {
    if (!hotArchivePath) {
      setToast('请选择热文库文件夹');
      return;
    }
    await updateSettings({
      obsidianExampleIndexPath: exampleIndexPath,
      obsidianExampleArchivePath: exampleArchivePath,
      obsidianHotArchivePath: hotArchivePath,
    });
    onComplete();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-dark-50 rounded-2xl shadow-2xl w-full max-w-md animate-slide-in">
          {/* Header */}
          <div className="p-6 pb-4 text-center">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-xl flex items-center justify-center mb-3">
              <Sparkles size={24} className="text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
              欢迎使用扫榜助手
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              首次使用需要配置 Obsidian 路径
            </p>
          </div>

          {/* Progress */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-8 h-1.5 rounded-full transition-colors ${
                    s <= step ? 'bg-primary' : 'bg-gray-200 dark:bg-dark-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-4">
            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    第一步：选择例文索引文件
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                    这是 Obsidian 中记录例文信息的 Markdown 文件
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={exampleIndexPath}
                      onChange={e => setExampleIndexPath(e.target.value)}
                      placeholder="例文索引.md 的完整路径"
                      className="flex-1 text-sm px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-100 bg-surface dark:bg-dark text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <button
                      onClick={handleSelectFile}
                      className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-100 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-200 flex items-center gap-1.5"
                    >
                      <FileText size={14} />
                      选择
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    第二步：选择例文存档文件夹
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                    收藏的例文原文会复制到这个文件夹
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={exampleArchivePath}
                      onChange={e => setExampleArchivePath(e.target.value)}
                      placeholder="例文存档文件夹路径"
                      className="flex-1 text-sm px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-100 bg-surface dark:bg-dark text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <button
                      onClick={() => handleSelectFolder('example')}
                      className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-100 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-200 flex items-center gap-1.5"
                    >
                      <FolderOpen size={14} />
                      选择
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    第三步：选择热文库文件夹
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                    经典热文的原文会复制到这个文件夹
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={hotArchivePath}
                      onChange={e => setHotArchivePath(e.target.value)}
                      placeholder="热文库文件夹路径"
                      className="flex-1 text-sm px-3 py-2.5 rounded-lg border border-gray-200 dark:border-dark-100 bg-surface dark:bg-dark text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <button
                      onClick={() => handleSelectFolder('hot')}
                      className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-100 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-200 flex items-center gap-1.5"
                    >
                      <FolderOpen size={14} />
                      选择
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 pt-2">
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="px-5 py-2.5 text-sm bg-primary-200 text-primary-700 rounded-lg hover:bg-primary-300 transition-colors flex items-center gap-1.5"
              >
                下一步
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-5 py-2.5 text-sm bg-primary-200 text-primary-700 rounded-lg hover:bg-primary-300 transition-colors"
              >
                完成配置
              </button>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
