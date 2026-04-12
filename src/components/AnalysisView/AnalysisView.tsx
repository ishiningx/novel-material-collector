import React from 'react';
import { useAnalysisContext } from '../../store/AnalysisContext';
import { AnalysisListView } from './AnalysisListView';
import { AnalysisEditorView } from './AnalysisEditorView';

export function AnalysisView() {
  const { state, setCurrentAnalysis } = useAnalysisContext();

  if (state.currentAnalysisId) {
    return (
      <AnalysisEditorView
        onBack={() => setCurrentAnalysis(null)}
      />
    );
  }

  return (
    <AnalysisListView
      onOpenAnalysis={(id) => setCurrentAnalysis(id)}
    />
  );
}
