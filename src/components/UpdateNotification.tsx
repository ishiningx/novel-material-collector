import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Check, AlertCircle, X, Sparkles } from 'lucide-react';
import type { UpdateStatus, UpdateInfo } from '../types';
import { checkForUpdate, openDownloadPage } from '../services/updater';

interface UpdateNotificationProps {
  currentVersion: string;
}

export function UpdateNotification({ currentVersion }: UpdateNotificationProps) {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleCheckUpdate = async () => {
    if (status === 'checking') return;
    try {
      const info = await checkForUpdate(currentVersion, setStatus);
      if (info) {
        setUpdateInfo(info);
        setShowDetail(true);
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
  };

  const handleOpenDownload = async () => {
    try {
      await openDownloadPage();
    } catch (error) {
      console.error('Open download page failed:', error);
    }
  };

  const renderStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <RefreshCw size={10} className="animate-spin" />;
      case 'available':
        return <Sparkles size={10} className="text-primary" />;
      case 'not-available':
        return <Check size={10} className="text-emerald-500" />;
      case 'error':
        return <AlertCircle size={10} className="text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return '检查中...';
      case 'available':
        return '有新版本';
      case 'not-available':
        return '已是最新';
      case 'error':
        return '检查失败';
      default:
        return null;
    }
  };

  const statusText = getStatusText();

  return (
    <div className="relative flex flex-col items-center gap-1.5">
      {/* 版本号和检查按钮 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 dark:text-gray-600">
          v{currentVersion}
        </span>

        {status === 'idle' ? (
          <button
            onClick={handleCheckUpdate}
            className="text-[10px] text-gray-400 dark:text-gray-600 hover:text-primary dark:hover:text-primary transition-colors"
          >
            检查更新
          </button>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-600">
            {renderStatusIcon()}
            <span>{statusText}</span>
          </div>
        )}
      </div>

      {/* 有新版本时显示入口按钮 */}
      {status === 'available' && (
        <button
          onClick={() => setShowDetail(true)}
          className="text-[10px] px-2 py-0.5 bg-primary-200 text-primary-700 rounded hover:bg-primary-300 transition-colors"
        >
          查看详情
        </button>
      )}

      {/* 更新详情弹窗 */}
      {showDetail && updateInfo && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDetail(false)}
          />

          {/* 弹窗 */}
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-dark-50
                          rounded-xl shadow-xl border border-gray-200 dark:border-dark-100 p-4 z-50
                          animate-fade-in">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  发现新版本
                </p>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mb-3">
              <p className="text-base font-semibold text-primary">
                v{updateInfo.version}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                当前版本: v{updateInfo.currentVersion}
                {updateInfo.date && (
                  <span className="ml-2 text-gray-400">· {updateInfo.date}</span>
                )}
              </p>
            </div>

            {updateInfo.body && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 whitespace-pre-wrap line-clamp-6
                           bg-gray-50 dark:bg-dark rounded-lg p-2">
                {updateInfo.body}
              </p>
            )}

            <button
              onClick={handleOpenDownload}
              className="w-full py-2 px-3 bg-primary-200 text-primary-700 text-sm rounded-lg
                         hover:bg-primary-300
                         flex items-center justify-center gap-2 font-medium"
            >
              <ExternalLink size={14} />
              前往下载页
            </button>

            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-2 text-center">
              在浏览器中打开发布页，手动下载新版本
            </p>
          </div>
        </>
      )}
    </div>
  );
}
