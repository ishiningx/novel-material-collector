import React from 'react';
import { X, AlertTriangle, GitMerge } from 'lucide-react';
import type { BackupMeta, ImportMode } from '../services/backup';

interface ImportConfirmModalProps {
  visible: boolean;
  meta: BackupMeta;
  importMode: ImportMode;
  onModeChange: (mode: ImportMode) => void;
  onConfirm: () => void;
  onCancel: () => void;
  restoring: boolean;
}

export function ImportConfirmModal({
  visible,
  meta,
  importMode,
  onModeChange,
  onConfirm,
  onCancel,
  restoring,
}: ImportConfirmModalProps) {
  if (!visible) return null;

  const formatDate = (iso: string) => {
    if (!iso) return '未知';
    try {
      const d = new Date(iso);
      return d.toLocaleString('zh-CN');
    } catch {
      return iso;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={restoring ? undefined : onCancel} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-dark-50 rounded-[14px] shadow-2xl w-[420px] animate-modal-in overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-dark-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            确认导入备份
          </h3>
          <button onClick={onCancel} disabled={restoring} className="btn-ghost-icon">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
            <div className="flex justify-between">
              <span>导出时间：</span>
              <span>{formatDate(meta.exportedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>来源版本：</span>
              <span>{meta.appVersion}</span>
            </div>
            <div className="flex justify-between">
              <span>包含文件：</span>
              <span>{meta.fileCount} 个</span>
            </div>
          </div>

          {/* Import mode selector */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">导入方式</p>
            <label
              className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                importMode === 'overwrite'
                  ? 'bg-red-50 dark:bg-red-900/10 ring-1 ring-red-200 dark:ring-red-800/30'
                  : 'hover:bg-gray-50 dark:hover:bg-dark-200/30'
              }`}
            >
              <input
                type="radio"
                name="importMode"
                value="overwrite"
                checked={importMode === 'overwrite'}
                onChange={() => onModeChange('overwrite')}
                className="mt-0.5 accent-red-500"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-700 dark:text-gray-300">覆盖现有数据</div>
                <div className="text-xs text-gray-400 mt-0.5">用备份文件完全替换当前所有数据，不可撤销</div>
              </div>
            </label>
            <label
              className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                importMode === 'merge'
                  ? 'bg-blue-50 dark:bg-blue-900/10 ring-1 ring-blue-200 dark:ring-blue-800/30'
                  : 'hover:bg-gray-50 dark:hover:bg-dark-200/30'
              }`}
            >
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={importMode === 'merge'}
                onChange={() => onModeChange('merge')}
                className="mt-0.5 accent-blue-500"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-700 dark:text-gray-300">合并到现有数据</div>
                <div className="text-xs text-gray-400 mt-0.5">保留当前数据，新增备份中的记录（按 ID 去重），不会覆盖设置</div>
              </div>
            </label>
          </div>

          <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
            importMode === 'overwrite'
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
          }`}>
            {importMode === 'overwrite' ? (
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            ) : (
              <GitMerge size={16} className="shrink-0 mt-0.5" />
            )}
            <span>
              {importMode === 'overwrite'
                ? '导入将覆盖当前所有数据，此操作不可撤销。建议先备份当前数据。'
                : '仅合并作品、素材、例文和分类数据。'}
            </span>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-100 flex justify-end gap-2">
          <button onClick={onCancel} disabled={restoring} className="btn-ghost">
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={restoring}
            className={`btn-primary ${restoring ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {restoring ? '导入中...' : '确认导入'}
          </button>
        </div>
      </div>
    </>
  );
}
