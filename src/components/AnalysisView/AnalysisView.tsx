import React from 'react';
import { useArticleContext } from '../../store/ArticleContext';
import { AnalysisListView } from './AnalysisListView';
import { AnalysisEditorView } from './AnalysisEditorView';

export function AnalysisView() {
  const { state, setCurrentArticle } = useArticleContext();

  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      {/* 列表保持挂载（hidden 隐藏），返回时筛选状态与滚动位置完整保留 */}
      <div className={state.currentArticleId ? 'hidden' : 'flex-1 min-h-0 flex flex-col'}>
        <AnalysisListView
          onOpenArticle={(id) => setCurrentArticle(id)}
        />
      </div>

      {/* 详情页覆盖式展示 */}
      {state.currentArticleId && (
        <div className="absolute inset-0 z-10 flex flex-col bg-surface dark:bg-dark">
          <AnalysisEditorView
            onBack={() => setCurrentArticle(null)}
          />
        </div>
      )}
    </div>
  );
}
