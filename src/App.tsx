/**
 * 素材收集助手 - 小说素材收集工具
 * Copyright (c) 2026 Bonnie & Echo. All rights reserved.
 *
 * 本软件为 Bonnie & Echo 共同创作，受著作权法保护。
 * 未经授权不得复制、修改、分发或用于商业目的。
 */

import React, { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { MaterialProvider, useMaterialContext } from './store/MaterialContext';
import { SettingsProvider, useSettingsContext } from './store/SettingsContext';
import { ArticleProvider, useArticleContext } from './store/ArticleContext';
import { WeeklyReportProvider } from './store/WeeklyReportContext';
import { WorkProvider, useWorkContext } from './store/WorkContext';
import { MaterialLibrary } from './components/MaterialLibrary';
import { AnalysisView } from './components/AnalysisView/AnalysisView';
import { WeeklyReportView } from './components/WeeklyReportView';
import { WorkRecordView } from './components/WorkRecordView';
import { AppLayout, Toast } from './components/SharedUI';
import { UpgradeIntroModal } from './components/UpgradeIntroModal';
import { ImportConfirmModal } from './components/ImportConfirmModal';
import { exportAllData, importAllData, restoreAllData, extractMeta } from './services/backup';
import type { BackupManifest, ImportMode } from './services/backup';

type ViewType = 'analysis' | 'library' | 'weekly-report' | 'works';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('analysis');
  const [appVersion, setAppVersion] = useState<string>('1.0.0');
  const { state: materialState, refreshMaterials } = useMaterialContext();
  const { state: articleState, refreshArticles } = useArticleContext();
  const { state: workState, refreshWorks } = useWorkContext();
  const { settings, updateSettings } = useSettingsContext();

  const [toast, setToast] = useState<string | null>(null);
  const [importingManifest, setImportingManifest] = useState<BackupManifest | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('overwrite');
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion('1.0.0'));
  }, []);

  const handleExport = async () => {
    try {
      const ok = await exportAllData(appVersion);
      if (ok) setToast('备份导出成功');
    } catch (err: any) {
      setToast(`导出失败: ${err?.message || err}`);
    }
  };

  const handleImport = async () => {
    try {
      const manifest = await importAllData();
      if (manifest) {
        setImportingManifest(manifest);
      }
    } catch (err: any) {
      setToast(`导入失败: ${err?.message || err}`);
    }
  };

  const handleConfirmImport = async () => {
    if (!importingManifest) return;
    setRestoring(true);
    try {
      await restoreAllData(importingManifest.files, importMode);
      await Promise.all([refreshWorks(), refreshMaterials(), refreshArticles()]);
      setImportingManifest(null);
      setToast('备份导入成功');
    } catch (err: any) {
      setToast(`导入失败: ${err?.message || err}`);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <AppLayout
      currentView={currentView}
      onViewChange={setCurrentView}
      materialCount={materialState.materials.length}
      analysisCount={articleState.articles.length}
      workCount={workState.works.length}
      currentVersion={appVersion}
      sidebarCollapsed={settings.sidebarCollapsed}
      onToggleSidebar={() => updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed })}
      onExport={handleExport}
      onImport={handleImport}
    >
      <div className={currentView === 'analysis' ? 'contents' : 'hidden'}>
        <AnalysisView />
      </div>
      <div className={currentView === 'library' ? 'contents' : 'hidden'}>
        <MaterialLibrary />
      </div>
      <div className={currentView === 'weekly-report' ? 'contents' : 'hidden'}>
        <WeeklyReportView />
      </div>
      <div className={currentView === 'works' ? 'contents' : 'hidden'}>
        <WorkRecordView />
      </div>
      <UpgradeIntroModal />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {importingManifest && (
        <ImportConfirmModal
          visible={true}
          meta={extractMeta(importingManifest)}
          importMode={importMode}
          onModeChange={setImportMode}
          onConfirm={handleConfirmImport}
          onCancel={() => setImportingManifest(null)}
          restoring={restoring}
        />
      )}
    </AppLayout>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <MaterialProvider>
        <ArticleProvider>
          <WeeklyReportProvider>
            <WorkProvider>
              <AppContent />
            </WorkProvider>
          </WeeklyReportProvider>
        </ArticleProvider>
      </MaterialProvider>
    </SettingsProvider>
  );
}
