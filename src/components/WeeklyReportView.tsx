import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  BookOpen,
  User,
  FileText,
} from 'lucide-react';
import { useWeeklyReportContext } from '../store/WeeklyReportContext';
import { useArticleContext } from '../store/ArticleContext';
import { useMaterialContext } from '../store/MaterialContext';
import { getWeekStart, getWeekEnd, isDateInWeek } from '../services/dateUtils';

// Format archivedAt / createdAt to readable date
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return iso;
  }
}

// Extract month label from date
function getMonthLabel(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  } catch {
    return '未知';
  }
}

export function WeeklyReportView() {
  const { state: reportState, generateCurrentWeekReport } = useWeeklyReportContext();
  const { state: articleState } = useArticleContext();
  const { state: materialState } = useMaterialContext();

  const [showHistory, setShowHistory] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Week bounds
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  // Count this week's analysis & materials
  const weekAnalysisCount = useMemo(
    () => articleState.articles.filter((a) => isDateInWeek(a.createdAt, weekStart, weekEnd)).length,
    [articleState.articles, weekStart, weekEnd]
  );

  const weekMaterialCount = useMemo(
    () => materialState.materials.filter((m) => isDateInWeek(m.date, weekStart, weekEnd)).length,
    [materialState.materials, weekStart, weekEnd]
  );

  // Total cumulative counts
  const totalAnalysisCount = articleState.articles.length;
  const totalMaterialCount = materialState.materials.length;

  // Generate report in useEffect
  const currentReport = reportState.reports.find((r) => r.weekStart === weekStart) ?? null;

  useEffect(() => {
    if (!reportState.loading) {
      generateCurrentWeekReport(weekAnalysisCount, weekMaterialCount);
    }
  }, [weekAnalysisCount, weekMaterialCount, reportState.loading, generateCurrentWeekReport]);

  // Historical reports (excluding current week)
  const historicalReports = reportState.reports.filter((r) => r.weekStart !== weekStart);

  // ========== Archived articles ==========
  const archivedArticles = useMemo(
    () => articleState.articles.filter((a) => a.status === 'archived'),
    [articleState.articles]
  );

  // This week's archived articles
  const weekArticles = useMemo(
    () =>
      archivedArticles.filter((a) => {
        const refDate = a.archivedAt || a.createdAt;
        return isDateInWeek(refDate, weekStart, weekEnd);
      }),
    [archivedArticles, weekStart, weekEnd]
  );

  // Group all archived articles by month (excluding this week's)
  const monthGroups = useMemo(() => {
    const map = new Map<string, typeof archivedArticles>();
    for (const a of archivedArticles) {
      const refDate = a.archivedAt || a.createdAt;
      const label = getMonthLabel(refDate);
      // Skip current week articles — they're shown above
      if (isDateInWeek(refDate, weekStart, weekEnd)) continue;
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(a);
    }
    // Sort by month descending
    const sorted = Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
    return sorted;
  }, [archivedArticles, weekStart, weekEnd]);

  // Toggle month expansion
  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  // Expand all / collapse all
  const expandAll = () => {
    setExpandedMonths(new Set(monthGroups.map(([m]) => m)));
  };
  const collapseAll = () => {
    setExpandedMonths(new Set());
  };

  // Render a single article row
  const renderArticleRow = (article: (typeof archivedArticles)[number]) => {
    const refDate = article.archivedAt || article.createdAt;

    return (
      <div
        key={article.id}
        className="px-4 py-3.5 border-b border-gray-100 dark:border-dark-100 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-dark-200/30 transition-colors"
      >
        {/* Title + badges + date */}
        <div className="flex items-start gap-2 mb-2.5">
          <span className="text-sm text-gray-900 dark:text-gray-100 leading-snug min-w-0">
            {article.title}
          </span>
          <span className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
            {article.categories?.map((cat) => (
              <span
                key={cat}
                className="text-[11px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium leading-tight"
              >
                {cat}
              </span>
            ))}
            {article.platform && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-dark-200 text-gray-500 dark:text-gray-400 leading-tight">
                {article.platform}
              </span>
            )}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0 mt-0.5 ml-auto">
            {formatDate(refDate)}
          </span>
        </div>

        {/* Content fields */}
        <div className="space-y-1.5">
          {(article.coreGimmick && article.coreGimmick.length > 0) && (
            <div className="flex items-start gap-2 text-xs leading-relaxed">
              <span className="text-gray-400 dark:text-gray-500 shrink-0 w-[3.5em]">核心梗</span>
              <span className="text-gray-700 dark:text-gray-300 min-w-0">{(article.coreGimmick || []).join('、')}</span>
            </div>
          )}
          {article.payPoint && (
            <div className="flex items-start gap-2 text-xs leading-relaxed">
              <span className="text-gray-400 dark:text-gray-500 shrink-0 w-[3.5em]">付费点</span>
              <span className="text-gray-700 dark:text-gray-300 min-w-0">{article.payPoint}</span>
            </div>
          )}
          {article.highlight && (
            <div className="flex items-start gap-2 text-xs leading-relaxed">
              <span className="text-gray-400 dark:text-gray-500 shrink-0 w-[3.5em]">亮点</span>
              <span className="text-gray-700 dark:text-gray-300 min-w-0">{article.highlight}</span>
            </div>
          )}
          {article.synopsis && (
            <div className="flex items-start gap-2 text-xs leading-relaxed">
              <span className="text-gray-400 dark:text-gray-500 shrink-0 w-[3.5em]">梗概</span>
              <span className="text-gray-700 dark:text-gray-300 min-w-0">{article.synopsis}</span>
            </div>
          )}
          {article.author && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 pt-0.5">
              <User size={11} />
              {article.author}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (reportState.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-50 flex items-center px-4 shrink-0">
        <CalendarCheck size={18} className="text-primary mr-2" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">本周成果</h2>
        <span className="ml-2 text-xs text-gray-400">
          {weekStart} ~ {weekEnd}
        </span>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-dark-50">
        <div className="max-w-2xl mx-auto py-8 px-6">
          {/* ===== Capybara section ===== */}
          <div className="flex flex-col items-center mb-8">
            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed text-center mb-3">
              本周已完成 <span className="font-semibold text-primary text-lg">{weekAnalysisCount}</span>{' '}
              篇分析、收集了{' '}
              <span className="font-semibold text-emerald-600 text-lg">{weekMaterialCount}</span>{' '}
              条素材
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center mb-6">
              累计分析 {totalAnalysisCount} 篇 · 累计素材 {totalMaterialCount} 条
            </p>

            <div className="capybara-container flex justify-center mb-4">
              <img
                src="/capybara.png"
                alt="卡皮巴拉"
                className="w-40 h-auto object-contain relative z-10"
              />
              {[...Array(12)].map((_, i) => {
                const colors = ['#FF6B6B', '#4ECDC4', '#FFE066', '#A78BFA', '#F472B6', '#34D399'];
                const baseAngle = -60;
                const spread = 80;
                const angle = baseAngle + (i / 12) * spread - spread / 2;
                const distance = 50 + Math.random() * 50;
                const tx = Math.cos((angle * Math.PI) / 180) * distance;
                const ty = Math.sin((angle * Math.PI) / 180) * distance;
                const rot = Math.random() * 720 - 360;
                return (
                  <div
                    key={i}
                    className="confetti"
                    style={{
                      backgroundColor: colors[i % colors.length],
                      left: '65%',
                      top: '45%',
                      '--tx': `${tx}px`,
                      '--ty': `${ty}px`,
                      '--rot': `${rot}deg`,
                      animationDelay: `${i * 0.05}s`,
                    } as React.CSSProperties}
                  />
                );
              })}
              {[...Array(6)].map((_, i) => {
                const baseAngle = -60;
                const spread = 60;
                const angle = baseAngle + (i / 6) * spread - spread / 2;
                const distance = 60;
                const tx = Math.cos((angle * Math.PI) / 180) * distance;
                const ty = Math.sin((angle * Math.PI) / 180) * distance;
                const rot = Math.random() * 60 - 30;
                const colors = ['#FF6B6B', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
                return React.createElement(
                  'span',
                  {
                    key: i,
                    className: 'bao-char',
                    style: {
                      color: colors[i],
                      left: '65%',
                      top: '45%',
                      '--tx': `${tx}px`,
                      '--ty': `${ty}px`,
                      '--rot': `${rot}deg`,
                      animationDelay: `${i * 0.08}s`,
                    } as React.CSSProperties,
                  },
                  '爆'
                );
              })}
            </div>

            {currentReport && (
              <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed text-center mb-2">
                {currentReport.message}
              </p>
            )}
            <p className="text-[11px] text-gray-400 dark:text-gray-600 text-center">
              统计本周一至当前数据，周日零点自动清空
            </p>
          </div>

          {/* ===== This week's articles ===== */}
          {weekArticles.length > 0 && (
            <section className="mb-8">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                <FileText size={15} className="text-primary" />
                本周收录例文
                <span className="text-xs font-normal text-gray-400">({weekArticles.length})</span>
              </h3>
              <div className="card overflow-hidden">
                {weekArticles.map(renderArticleRow)}
              </div>
            </section>
          )}

          {/* ===== Monthly archived articles ===== */}
          {monthGroups.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  <BookOpen size={15} className="text-primary" />
                  历史例文
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={expandAll}
                    className="text-[11px] text-gray-400 hover:text-primary transition-colors"
                  >
                    展开全部
                  </button>
                  <button
                    onClick={collapseAll}
                    className="text-[11px] text-gray-400 hover:text-primary transition-colors"
                  >
                    收起全部
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {monthGroups.map(([month, articles]) => {
                  const isExpanded = expandedMonths.has(month);
                  return (
                    <div key={month} className="card overflow-hidden">
                      <button
                        onClick={() => toggleMonth(month)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-200/30 transition-colors"
                      >
                        <span>{month}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-normal">
                            {articles.length} 篇
                          </span>
                          {isExpanded ? (
                            <ChevronUp size={14} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={14} className="text-gray-400" />
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-gray-100 dark:border-dark-100">
                          {articles.map(renderArticleRow)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ===== Empty state ===== */}
          {weekArticles.length === 0 && monthGroups.length === 0 && (
            <div className="text-center py-12">
              <BookOpen size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">还没有收录例文</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                在分析页完成文本分析后归档即可展示在这里
              </p>
            </div>
          )}

          {/* ===== Historical reports ===== */}
          {historicalReports.length > 0 && (
            <div className="mt-4 mb-8">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors mb-2"
              >
                {showHistory ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                历史周报 ({historicalReports.length})
              </button>

              {showHistory && (
                <div className="space-y-2">
                  {historicalReports.map((report) => (
                    <div
                      key={report.weekStart}
                      className="bg-gray-50 dark:bg-dark rounded-lg p-3 border border-gray-100 dark:border-dark-100 text-xs"
                    >
                      <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                        <span className="font-medium">
                          {report.weekStart} ~ {report.weekEnd}
                        </span>
                        <span className="text-gray-400">
                          分析 {report.analysisCount} · 素材 {report.materialCount}
                        </span>
                      </div>
                      <p className="text-gray-500 dark:text-gray-500 mt-1">{report.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
