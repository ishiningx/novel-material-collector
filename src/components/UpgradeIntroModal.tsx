import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { loadMigrationFlags, saveMigrationFlags } from '../services/storage';

export function UpgradeIntroModal() {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const flags = await loadMigrationFlags();
        // 只要没看过引导就弹（无论本次是否迁移过，首次升级的用户都应该看到）
        if (!cancelled && !flags.hasSeenV2Intro) {
          setVisible(true);
        }
      } catch (err) {
        console.error('[UpgradeIntroModal] check failed:', err);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      const flags = await loadMigrationFlags();
      await saveMigrationFlags({ ...flags, hasSeenV2Intro: true });
    } catch (err) {
      console.error('[UpgradeIntroModal] save flag failed:', err);
    } finally {
      setVisible(false);
      setDismissing(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-dark-50 rounded-[14px] shadow-2xl max-w-md w-full mx-4 animate-modal-in overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-[10px] bg-gray-900/10 dark:bg-white/10 flex items-center justify-center">
              <Sparkles size={20} strokeWidth={1.5} className="text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                欢迎使用新版素材收集助手
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">几项升级需要让你知道</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 pt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <div className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mt-0.5">1</span>
            <p>
              <span className="font-medium text-gray-900 dark:text-gray-100">"拆文"和"素材收集"功能已合并为"分析"</span>
            </p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mt-0.5">2</span>
            <p>
              原有拆文可在<span className="font-medium">"例文草稿"</span>中找到，可手动添加为例文
            </p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mt-0.5">3</span>
            <p>
              新增<span className="font-medium">"例文库"</span>：补充信息即可升级为正式例文，支持搜索筛选
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pt-2 flex justify-end">
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="btn-primary"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}
