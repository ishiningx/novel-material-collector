/**
 * 扫榜助手 - 小说素材收集工具
 * Copyright (c) 2026 Bonnie & Echo. All rights reserved.
 * 
 * 本软件为 Bonnie & Echo 共同创作，受著作权法保护。
 * 未经授权不得复制、修改、分发或用于商业目的。
 */

import React, { useState } from 'react';
import { MaterialProvider, useMaterialContext } from './store/MaterialContext';
import { SettingsProvider } from './store/SettingsContext';
import { ReaderView } from './components/ReaderView';
import { MaterialLibrary } from './components/MaterialLibrary';
import { AppLayout } from './components/SharedUI';

type ViewType = 'reader' | 'library';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('reader');
  const { state } = useMaterialContext();

  return (
    <AppLayout
      currentView={currentView}
      onViewChange={setCurrentView}
      materialCount={state.materials.length}
    >
      {/* Use display:none instead of conditional rendering to preserve state */}
      <div className={currentView === 'reader' ? 'contents' : 'hidden'}>
        <ReaderView />
      </div>
      <div className={currentView === 'library' ? 'contents' : 'hidden'}>
        <MaterialLibrary />
      </div>
    </AppLayout>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <MaterialProvider>
        <AppContent />
      </MaterialProvider>
    </SettingsProvider>
  );
}
