import React from 'react';
import { useArticleContext } from '../../store/ArticleContext';
import { AnalysisListView } from './AnalysisListView';
import { AnalysisEditorView } from './AnalysisEditorView';

export function AnalysisView() {
  const { state, setCurrentArticle } = useArticleContext();

  if (state.currentArticleId) {
    return (
      <AnalysisEditorView
        onBack={() => setCurrentArticle(null)}
      />
    );
  }

  return (
    <AnalysisListView
      onOpenArticle={(id) => setCurrentArticle(id)}
    />
  );
}
