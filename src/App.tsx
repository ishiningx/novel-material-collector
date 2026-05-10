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
import { SettingsProvider } from './store/SettingsContext';
import { ArticleProvider, useArticleContext } from './store/ArticleContext';
import { WeeklyReportProvider } from './store/WeeklyReportContext';
import { MaterialLibrary } from './components/MaterialLibrary';
import { AnalysisView } from './components/AnalysisView/AnalysisView';
import { WeeklyReportView } from './components/WeeklyReportView';
import { AppLayout } from './components/SharedUI';
import { UpgradeIntroModal } from './components/UpgradeIntroModal';

type ViewType = 'analysis' | 'library' | 'weekly-report';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('analysis');
  const [appVersion, setAppVersion] = useState<string>('1.0.0');
  const { state: materialState } = useMaterialContext();
  const { state: articleState } = useArticleContext();

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion('1.0.0'));
  }, []);

  return (
    <AppLayout
      currentView={currentView}
      onViewChange={setCurrentView}
      materialCount={materialState.materials.length}
      analysisCount={articleState.articles.length}
      currentVersion={appVersion}
    >
      {/* Use display:none instead of conditional rendering to preserve state */}
      <div className={currentView === 'analysis' ? 'contents' : 'hidden'}>
        <AnalysisView />
      </div>
      <div className={currentView === 'library' ? 'contents' : 'hidden'}>
        <MaterialLibrary />
      </div>
      <div className={currentView === 'weekly-report' ? 'contents' : 'hidden'}>
        <WeeklyReportView />
      </div>
      <UpgradeIntroModal />
    </AppLayout>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <MaterialProvider>
        <ArticleProvider>
          <WeeklyReportProvider>
            <AppContent />
          </WeeklyReportProvider>
        </ArticleProvider>
      </MaterialProvider>
    </SettingsProvider>
  );
}
