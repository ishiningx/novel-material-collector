import React, { useEffect, useState } from 'react';
import { FileText, Upload, X, Library, BookOpen, CalendarCheck, PenLine, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { UpdateNotification } from './UpdateNotification';

// Simple toast component with auto-dismiss
export function Toast({ message, onClose, duration = 5000 }: { message: string; onClose: () => void; duration?: number }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-toast-in">
      <div className="bg-emerald-500 text-white px-4 py-2.5 rounded-[14px] shadow-lg flex items-center gap-2 text-sm">
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
      <div className="bg-white dark:bg-dark-50 rounded-[14px] shadow-2xl p-6 max-w-sm w-full mx-4 animate-modal-in">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="btn-ghost"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
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
  workCount = 0,
  currentVersion = '1.0.0',
  sidebarCollapsed = false,
  onToggleSidebar,
  onExport,
  onImport,
  children,
}: {
  currentView: 'analysis' | 'library' | 'weekly-report' | 'works';
  onViewChange: (view: 'analysis' | 'library' | 'weekly-report' | 'works') => void;
  materialCount: number;
  analysisCount?: number;
  workCount?: number;
  currentVersion?: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  children: React.ReactNode;
}) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  return (
    <div className="flex h-screen bg-surface dark:bg-dark">
      <aside className={`glass-panel flex flex-col shrink-0 transition-all duration-300 overflow-hidden ${sidebarCollapsed ? 'w-14' : 'w-56'}`}>
        <div className="h-16 px-3 flex items-center justify-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center overflow-hidden ring-1 ring-black/5 shrink-0">
              <img src="/icon.png" alt="" className="w-full h-full object-cover" />
            </div>
            <span className={`font-semibold tracking-tight text-gray-900 dark:text-gray-100 whitespace-nowrap transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>素材收集助手</span>
          </div>
        </div>

        <nav className="flex-1 p-3 flex flex-col">
          <div className="space-y-0.5">
            <button
              onClick={() => onViewChange('analysis')}
              className={`nav-item w-full ${sidebarCollapsed ? 'justify-center p-0 w-9 h-9 mx-auto' : 'text-left'} ${
                currentView === 'analysis'
                  ? 'nav-item-active'
                  : 'nav-item-inactive'
              }`}
            >
              <BookOpen size={18} strokeWidth={1.5} />
              <span className={`whitespace-nowrap transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>分析</span>
              {!sidebarCollapsed && analysisCount > 0 && (
                <span className="ml-auto bg-gray-900/10 dark:bg-white/10 text-gray-600 dark:text-gray-400 text-[11px] px-1.5 py-0.5 rounded-full font-medium">
                  {analysisCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onViewChange('library')}
              className={`nav-item w-full ${sidebarCollapsed ? 'justify-center p-0 w-9 h-9 mx-auto' : 'text-left'} ${
                currentView === 'library'
                  ? 'nav-item-active'
                  : 'nav-item-inactive'
              }`}
            >
              <Library size={18} strokeWidth={1.5} />
              <span className={`whitespace-nowrap transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>素材库</span>
              {!sidebarCollapsed && materialCount > 0 && (
                <span className="ml-auto bg-gray-900/10 dark:bg-white/10 text-gray-600 dark:text-gray-400 text-[11px] px-1.5 py-0.5 rounded-full font-medium">
                  {materialCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onViewChange('weekly-report')}
              className={`nav-item w-full ${sidebarCollapsed ? 'justify-center p-0 w-9 h-9 mx-auto' : 'text-left'} ${
                currentView === 'weekly-report'
                  ? 'nav-item-active'
                  : 'nav-item-inactive'
              }`}
            >
              <CalendarCheck size={18} strokeWidth={1.5} />
              <span className={`whitespace-nowrap transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>本周成果</span>
            </button>

            <button
              onClick={() => onViewChange('works')}
              className={`nav-item w-full ${sidebarCollapsed ? 'justify-center p-0 w-9 h-9 mx-auto' : 'text-left'} ${
                currentView === 'works'
                  ? 'nav-item-active'
                  : 'nav-item-inactive'
              }`}
            >
              <PenLine size={18} strokeWidth={1.5} />
              <span className={`whitespace-nowrap transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>我的作品</span>
            </button>
          </div>

          <div className="mt-auto space-y-0.5">
            <button
              onClick={onToggleSidebar}
              className={`nav-item w-full ${sidebarCollapsed ? 'justify-center p-0 w-9 h-9 mx-auto' : 'text-left'} nav-item-inactive`}
              title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
            >
              {sidebarCollapsed ? <ChevronRight size={18} strokeWidth={1.5} /> : <ChevronLeft size={18} strokeWidth={1.5} />}
              <span className={`whitespace-nowrap transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>收起侧栏</span>
            </button>
            {!sidebarCollapsed && onExport && onImport && (
              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className={`nav-item w-full text-left ${
                    showSettingsMenu ? 'nav-item-active' : 'nav-item-inactive'
                  }`}
                >
                  <Settings size={18} strokeWidth={1.5} />
                  <span className="whitespace-nowrap">设置</span>
                </button>
                {showSettingsMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSettingsMenu(false)} />
                    <div className="absolute left-3 right-3 bottom-full mb-1 bg-white dark:bg-dark-50 border border-gray-200 dark:border-dark-100 rounded-xl shadow-lg py-1 z-20">
                      <button
                        onClick={() => { onExport(); setShowSettingsMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200"
                      >
                        备份数据
                      </button>
                      <button
                        onClick={() => { onImport(); setShowSettingsMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200"
                      >
                        导入备份
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>

        <div className="p-3 border-t border-gray-200/50 dark:border-white/5">
          {!sidebarCollapsed && <UpdateNotification currentVersion={currentVersion} />}
          {!sidebarCollapsed && (
            <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-2">© Bonnie & Echo</p>
          )}
        </div>
      </aside>

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
