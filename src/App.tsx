/**
 * 扫榜助手 - 小说素材收集工具
 * Copyright (c) 2026 Bonnie & Echo. All rights reserved.
 *
 * 本软件为 Bonnie & Echo 共同创作，受著作权法保护。
 * 未经授权不得复制、修改、分发或用于商业目的。
 */

import React, { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { MaterialProvider, useMaterialContext } from './store/MaterialContext';
import { SettingsProvider, useSettingsContext } from './store/SettingsContext';
import { AnalysisProvider, useAnalysisContext } from './store/AnalysisContext';
import { WeeklyReportProvider, useWeeklyReportContext } from './store/WeeklyReportContext';
import { ReaderView } from './components/ReaderView';
import { MaterialLibrary } from './components/MaterialLibrary';
import { AnalysisView } from './components/AnalysisView/AnalysisView';
import { WeeklyReportView } from './components/WeeklyReportView';
import { AppLayout } from './components/SharedUI';
import { SettingsModal } from './components/SettingsModal';
import { SetupGuide } from './components/SetupGuide';

type ViewType = 'reader' | 'library' | 'analysis' | 'weekly-report';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('reader');
  const [appVersion, setAppVersion] = useState<string>('1.0.0');
  const [showSettings, setShowSettings] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const { state: materialState } = useMaterialContext();
  const { state: analysisState } = useAnalysisContext();
  const { settings, updateSettings } = useSettingsContext();

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion('1.0.0'));
  }, []);

  // 检查是否需要显示首次配置引导
  useEffect(() => {
    if (settings.loaded) {
      const needsSetup = !settings.obsidianExampleIndexPath || 
                         !settings.obsidianExampleArchivePath || 
                         !settings.obsidianHotArchivePath;
      if (needsSetup) {
        setShowSetupGuide(true);
      }
    }
  }, [settings.loaded, settings.obsidianExampleIndexPath, settings.obsidianExampleArchivePath, settings.obsidianHotArchivePath]);

  const handleSetupComplete = () => {
    setShowSetupGuide(false);
  };

  return (
    <>
      <AppLayout
        currentView={currentView}
        onViewChange={setCurrentView}
        materialCount={materialState.materials.length}
        analysisCount={analysisState.analyses.length}
        currentVersion={appVersion}
        onOpenSettings={() => setShowSettings(true)}
      >
        {/* Use display:none instead of conditional rendering to preserve state */}
        <div className={currentView === 'reader' ? 'contents' : 'hidden'}>
          <ReaderView onArchiveComplete={() => {
            // 可选：归档完成后的回调
          }} />
        </div>
        <div className={currentView === 'library' ? 'contents' : 'hidden'}>
          <MaterialLibrary />
        </div>
        <div className={currentView === 'analysis' ? 'contents' : 'hidden'}>
          <AnalysisView />
        </div>
        <div className={currentView === 'weekly-report' ? 'contents' : 'hidden'}>
          <WeeklyReportView />
        </div>
      </AppLayout>
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
      
      {/* Setup Guide */}
      {showSetupGuide && (
        <SetupGuide onComplete={handleSetupComplete} />
      )}
    </>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <MaterialProvider>
        <AnalysisProvider>
          <WeeklyReportProvider>
            <AppContent />
          </WeeklyReportProvider>
        </AnalysisProvider>
      </MaterialProvider>
    </SettingsProvider>
  );
}
