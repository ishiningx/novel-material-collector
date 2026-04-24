import React, { useState, useCallback, useRef } from 'react';
import { Upload, Type, Minus, Plus, X } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { parseFile } from '../services/fileParser';
import { useMaterialContext } from '../store/MaterialContext';
import { useSettingsContext } from '../store/SettingsContext';
import { Toast } from './SharedUI';
import { AVAILABLE_FONTS, FONT_SIZES } from '../types';
import { CollectPanel } from './CollectPanel';
import { StatusBar } from './StatusBar';
import { useSelectionCharCount } from '../hooks/useSelectionCharCount';

export function ReaderView() {
  const { state: materialState, addMaterial, addCategory } = useMaterialContext();
  const { settings, updateSettings } = useSettingsContext();

  const [documentTitle, setDocumentTitle] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [charCount, setCharCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Collect panel
  const [showCollectPanel, setShowCollectPanel] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  // Selection char count
  const selectionCharCount = useSelectionCharCount();

  const textRef = useRef<HTMLDivElement>(null);

  // Open file
  const handleOpenFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: '文档', extensions: ['txt', 'docx'] }],
    });
    if (selected) {
      await loadDocument(selected as string, selected.split('/').pop() || 'untitled');
    }
  }, []);

  const loadDocument = async (filePath: string, fileName: string) => {
    setLoading(true);
    try {
      const doc = await parseFile(filePath, fileName);
      setDocumentTitle(doc.title);
      setDocumentContent(doc.content);
      setCharCount(doc.charCount);
      updateSettings({ lastOpenedFile: fileName });
    } catch (err) {
      console.error('Failed to parse document:', err);
      setToast('文档解析失败，请确认文件格式正确');
    } finally {
      setLoading(false);
    }
  };

  // Right-click handler - show collect panel
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0) {
        e.preventDefault();
        setSelectedText(text);
        setShowCollectPanel(true);
      }
    },
    []
  );

  // Confirm collect from CollectPanel
  const handleConfirmCollect = useCallback(async (text: string, category: string, note: string) => {
    if (documentTitle) {
      try {
        await addMaterial(text, category, documentTitle, note);
        setToast(`已收藏到「${category}」`);
        setShowCollectPanel(false);
        setSelectedText('');
        window.getSelection()?.removeAllRanges();
      } catch (err) {
        console.error('Failed to save material:', err);
        setToast('收藏失败，请重试');
      }
    }
  }, [documentTitle, addMaterial]);

  const handleCloseCollect = useCallback(() => {
    setShowCollectPanel(false);
    setSelectedText('');
  }, []);

  // Font controls
  const currentSizeIndex = FONT_SIZES.indexOf(settings.fontSize);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <header className="h-14 border-b border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-50 flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={handleOpenFile}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-200 text-primary-700 text-sm rounded-lg hover:bg-primary-300 transition-colors shadow-sm"
        >
          <Upload size={15} />
          导入文档
        </button>

        {documentTitle && (
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <span className="text-sm truncate max-w-[200px]">{documentTitle}</span>
            <button
              onClick={() => {
                setDocumentTitle(null);
                setDocumentContent('');
                setCharCount(0);
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-dark-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="关闭文档"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {documentTitle && <div className="w-px h-6 bg-gray-200 dark:bg-dark-100" />}

        {/* Font selector */}
        {documentTitle && (
          <div className="flex items-center gap-2">
            <Type size={14} className="text-gray-400" />
            <select
              value={settings.fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
              className="text-sm bg-transparent border border-gray-200 dark:border-dark-100 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {AVAILABLE_FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Font size */}
        {documentTitle && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => currentSizeIndex > 0 && updateSettings({ fontSize: FONT_SIZES[currentSizeIndex - 1] })}
              disabled={currentSizeIndex <= 0}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-dark-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-center">{settings.fontSize}</span>
            <button
              onClick={() => currentSizeIndex < FONT_SIZES.length - 1 && updateSettings({ fontSize: FONT_SIZES[currentSizeIndex + 1] })}
              disabled={currentSizeIndex >= FONT_SIZES.length - 1}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-dark-200 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </header>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {!documentTitle ? (
          <div className="h-full flex items-center justify-center bg-surface dark:bg-dark">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-primary/5 dark:bg-primary/10 rounded-2xl flex items-center justify-center">
                <Upload size={32} className="text-primary/40" />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-base">导入文档开始阅读</p>
                <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">
                  支持 .txt 和 .docx 格式
                </p>
              </div>
              <button
                onClick={handleOpenFile}
                className="px-4 py-2 bg-primary-200 text-primary-700 text-sm rounded-lg hover:bg-primary-300 transition-colors"
              >
                选择文件
              </button>
            </div>
          </div>
        ) : (
          <div
            ref={textRef}
            onContextMenu={handleContextMenu}
            className="h-full overflow-y-auto p-8 bg-surface dark:bg-dark cursor-text"
            style={{ fontFamily: settings.fontFamily, fontSize: `${settings.fontSize}px` }}
          >
            <div className="max-w-3xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{documentTitle}</h1>
              <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap select-text">
                {loading ? '加载中...' : documentContent}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <StatusBar
        totalChars={charCount}
        selectionChars={selectionCharCount}
        leftContent={<span>选中文字右键可收藏到素材库</span>}
        rightPrefix={<span>已收藏 {materialState.materials.length} 条素材</span>}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Collect panel */}
      <CollectPanel
        visible={showCollectPanel}
        selectedText={selectedText}
        categories={materialState.categories}
        loading={materialState.loading}
        onConfirm={handleConfirmCollect}
        onClose={handleCloseCollect}
        addCategory={addCategory}
      />
    </div>
  );
}
