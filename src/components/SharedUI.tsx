import React, { useEffect, useState } from 'react';
import { FileText, Upload, X, Library, BookOpen, Scissors, CalendarCheck } from 'lucide-react';
import { UpdateNotification } from './UpdateNotification';

// Simple toast component with auto-dismiss
export function Toast({ message, onClose, duration = 5000 }: { message: string; onClose: () => void; duration?: number }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-toast-in">
      <div className="bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
        <span>{message}</span>
        <button onClick={onClose} className="hover:bg-emerald-600 rounded p-0.5">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// Confirmation dialog
export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-dark-50 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-slide-in">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

// Category color mapper
const CATEGORY_COLORS: Record<string, string> = {
  '导语噱头': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  '情节': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '情绪描写': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  '人设塑造': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  '付费点设计': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

const FALLBACK_COLORS = [
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
];

export function getCategoryColor(name: string): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  // Generate consistent color based on string hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

// Layout component with sidebar navigation
export function AppLayout({
  currentView,
  onViewChange,
  materialCount,
  analysisCount = 0,
  currentVersion = '1.0.0',
  children,
}: {
  currentView: 'reader' | 'library' | 'analysis' | 'weekly-report';
  onViewChange: (view: 'reader' | 'library' | 'analysis' | 'weekly-report') => void;
  materialCount: number;
  analysisCount?: number;
  currentVersion?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-surface dark:bg-dark">
      {/* Sidebar */}
      <aside className="w-56 border-r border-gray-200 dark:border-dark-100 flex flex-col bg-white dark:bg-dark-50">
        {/* Logo */}
        <div className="h-14 px-4 border-b border-gray-200 dark:border-dark-100 flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/icon.png" alt="" className="w-full h-full object-cover" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">扫榜助手</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => onViewChange('reader')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              currentView === 'reader'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-200'
            }`}
          >
            <BookOpen size={18} />
            <span>素材收集</span>
          </button>
          <button
            onClick={() => onViewChange('library')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              currentView === 'library'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-200'
            }`}
          >
            <Library size={18} />
            <span>素材库</span>
            {materialCount > 0 && (
              <span className="ml-auto bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                {materialCount}
              </span>
            )}
          </button>

          <div className="h-px bg-gray-100 dark:bg-dark-100 my-2" />

          <button
            onClick={() => onViewChange('analysis')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              currentView === 'analysis'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-200'
            }`}
          >
            <Scissors size={18} />
            <span>拆文</span>
            {analysisCount > 0 && (
              <span className="ml-auto bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                {analysisCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onViewChange('weekly-report')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              currentView === 'weekly-report'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-200'
            }`}
          >
            <CalendarCheck size={18} />
            <span>本周成果</span>
          </button>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-dark-100">
          <UpdateNotification currentVersion={currentVersion} />
          <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-1">© Bonnie & Echo</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}

// File drop zone
export function FileDropZone({ children, onDrop, accept }: { children: React.ReactNode; onDrop: (files: File[]) => void; accept: string }) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDropEvent = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => {
      const ext = f.name.toLowerCase();
      return ext.endsWith('.txt') || ext.endsWith('.docx');
    });
    if (files.length > 0) onDrop(files);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropEvent}
      className={`relative ${dragging ? 'ring-2 ring-primary/50 ring-offset-2' : ''}`}
    >
      {dragging && (
        <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 z-10 flex items-center justify-center rounded-lg">
          <div className="text-primary flex flex-col items-center gap-2">
            <Upload size={32} />
            <span className="text-sm font-medium">拖放文件到这里</span>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
