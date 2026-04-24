import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { useWeeklyReportContext } from '../store/WeeklyReportContext';
import { useAnalysisContext } from '../store/AnalysisContext';
import { useMaterialContext } from '../store/MaterialContext';
import { getWeekStart, getWeekEnd, isDateInWeek } from '../services/dateUtils';

export function WeeklyReportView() {
  const { state: reportState, generateCurrentWeekReport } = useWeeklyReportContext();
  const { state: analysisState } = useAnalysisContext();
  const { state: materialState } = useMaterialContext();

  const [showHistory, setShowHistory] = useState(false);

  // Count this week's data
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  const weekAnalysisCount = useMemo(
    () => analysisState.analyses.filter((a) => isDateInWeek(a.createdAt, weekStart, weekEnd)).length,
    [analysisState.analyses, weekStart, weekEnd]
  );

  const weekMaterialCount = useMemo(
    () => materialState.materials.filter((m) => isDateInWeek(m.date, weekStart, weekEnd)).length,
    [materialState.materials, weekStart, weekEnd]
  );

  // Total cumulative counts
  const totalAnalysisCount = analysisState.analyses.length;
  const totalMaterialCount = materialState.materials.length;

  // Generate report in useEffect to avoid setState during render
  const currentReport = reportState.reports.find((r) => r.weekStart === weekStart) ?? null;

  useEffect(() => {
    if (!reportState.loading) {
      generateCurrentWeekReport(weekAnalysisCount, weekMaterialCount);
    }
  }, [weekAnalysisCount, weekMaterialCount, reportState.loading, generateCurrentWeekReport]);

  // Historical reports (excluding current week)
  const historicalReports = reportState.reports.filter((r) => r.weekStart !== weekStart);

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

      {/* Main content - white background to match capybara image */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-dark-50">
        <div className="max-w-md mx-auto py-10 px-6 flex flex-col items-center">
          {/* One-sentence summary */}
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed text-center mb-3">
            本周已完成 <span className="font-semibold text-primary text-lg">{weekAnalysisCount}</span> 篇拆文、收集了 <span className="font-semibold text-emerald-600 text-lg">{weekMaterialCount}</span> 条素材
          </p>

          {/* Cumulative stats */}
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center mb-8">
            累计拆文 {totalAnalysisCount} 篇 · 累计素材 {totalMaterialCount} 条
          </p>

          {/* Capybara illustration with celebration animation */}
          <div className="capybara-container flex justify-center mb-8">
            <img
              src="/capybara.png"
              alt="卡皮巴拉"
              className="w-44 h-auto object-contain relative z-10"
            />
            {/* Confetti pieces - spray from popper (upper right area) */}
            {[...Array(12)].map((_, i) => {
              const colors = ['#FF6B6B', '#4ECDC4', '#FFE066', '#A78BFA', '#F472B6', '#34D399'];
              const baseAngle = -60; // Start from upper right direction
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
            {/* "爆" characters - spray from popper */}
            {[...Array(6)].map((_, i) => {
              const baseAngle = -60;
              const spread = 60;
              const angle = baseAngle + (i / 6) * spread - spread / 2;
              const distance = 60;
              const tx = Math.cos((angle * Math.PI) / 180) * distance;
              const ty = Math.sin((angle * Math.PI) / 180) * distance;
              const rot = Math.random() * 60 - 30;
              const colors = ['#FF6B6B', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
              return (
                <span
                  key={i}
                  className="bao-char"
                  style={{
                    color: colors[i],
                    left: '65%',
                    top: '45%',
                    '--tx': `${tx}px`,
                    '--ty': `${ty}px`,
                    '--rot': `${rot}deg`,
                    animationDelay: `${i * 0.08}s`,
                  } as React.CSSProperties}
                >
                  爆
                </span>
              );
            })}
          </div>

          {/* Encouragement message */}
          {currentReport && (
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed text-center mb-4">
              {currentReport.message}
            </p>
          )}

          {/* Stats period reminder */}
          <p className="text-[11px] text-gray-400 dark:text-gray-600 text-center mb-10">
            统计本周一至当前数据，周日零点自动清空
          </p>

          {/* Historical reports */}
          {historicalReports.length > 0 && (
            <div className="w-full max-w-sm">
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
                        <span className="font-medium">{report.weekStart} ~ {report.weekEnd}</span>
                        <span className="text-gray-400">
                          拆文 {report.analysisCount} · 素材 {report.materialCount}
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
