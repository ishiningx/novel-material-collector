import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { WeeklyReport, EncouragementMessage } from '../types';
import { DEFAULT_ENCOURAGEMENT_MESSAGES } from '../types';
import { loadWeeklyReports, saveWeeklyReports, loadEncouragementMessages } from '../services/storage';
import { getWeekStart, getWeekEnd } from '../services/dateUtils';

// State shape
interface WeeklyReportState {
  reports: WeeklyReport[];
  encouragementMessages: EncouragementMessage[];
  loading: boolean;
}

// Actions
type WeeklyReportAction =
  | { type: 'SET_REPORTS'; payload: WeeklyReport[] }
  | { type: 'ADD_REPORT'; payload: WeeklyReport }
  | { type: 'SET_MESSAGES'; payload: EncouragementMessage[] }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: WeeklyReportState = {
  reports: [],
  encouragementMessages: [],
  loading: true,
};

function weeklyReportReducer(state: WeeklyReportState, action: WeeklyReportAction): WeeklyReportState {
  switch (action.type) {
    case 'SET_REPORTS':
      return { ...state, reports: action.payload, loading: false };
    case 'ADD_REPORT':
      return { ...state, reports: [action.payload, ...state.reports] };
    case 'SET_MESSAGES':
      return { ...state, encouragementMessages: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// Context value
interface WeeklyReportContextValue {
  state: WeeklyReportState;
  generateCurrentWeekReport: (analysisCount: number, materialCount: number) => WeeklyReport;
  getReportForWeek: (weekStart: string) => WeeklyReport | undefined;
  hasCurrentWeekReport: () => boolean;
}

const WeeklyReportContext = createContext<WeeklyReportContextValue | null>(null);

export function WeeklyReportProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(weeklyReportReducer, initialState);

  // Load data on mount
  useEffect(() => {
    async function init() {
      try {
        const [reports, messages] = await Promise.all([
          loadWeeklyReports(),
          loadEncouragementMessages(),
        ]);
        dispatch({ type: 'SET_REPORTS', payload: reports });
        dispatch({ type: 'SET_MESSAGES', payload: messages });
      } catch (err) {
        console.error('[WeeklyReportContext] Init failed:', err);
        dispatch({ type: 'SET_REPORTS', payload: [] });
        dispatch({ type: 'SET_MESSAGES', payload: DEFAULT_ENCOURAGEMENT_MESSAGES });
      }
    }
    init();
  }, []);

  const selectEncouragementMessage = (totalCount: number): string => {
    const matching = state.encouragementMessages.filter(
      (m) => totalCount >= m.minCount && totalCount <= m.maxCount
    );
    if (matching.length === 0) return '继续努力！';
    return matching[Math.floor(Math.random() * matching.length)].text;
  };

  const generateCurrentWeekReport = (analysisCount: number, materialCount: number): WeeklyReport => {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    // Check if report already exists
    const existing = state.reports.find((r) => r.weekStart === weekStart);
    if (existing) {
      // Update counts if changed
      if (existing.analysisCount !== analysisCount || existing.materialCount !== materialCount) {
        const updated: WeeklyReport = {
          ...existing,
          analysisCount,
          materialCount,
          message: selectEncouragementMessage(analysisCount + materialCount),
          generatedAt: new Date().toISOString(),
        };
        const newReports = state.reports.map((r) => (r.weekStart === weekStart ? updated : r));
        saveWeeklyReports(newReports);
        dispatch({ type: 'SET_REPORTS', payload: newReports });
        return updated;
      }
      return existing;
    }

    // Create new report
    const report: WeeklyReport = {
      weekStart,
      weekEnd,
      analysisCount,
      materialCount,
      message: selectEncouragementMessage(analysisCount + materialCount),
      generatedAt: new Date().toISOString(),
    };

    const newReports = [report, ...state.reports];
    saveWeeklyReports(newReports);
    dispatch({ type: 'ADD_REPORT', payload: report });
    return report;
  };

  const getReportForWeek = (weekStart: string): WeeklyReport | undefined => {
    return state.reports.find((r) => r.weekStart === weekStart);
  };

  const hasCurrentWeekReport = (): boolean => {
    const weekStart = getWeekStart();
    return state.reports.some((r) => r.weekStart === weekStart);
  };

  return (
    <WeeklyReportContext.Provider
      value={{
        state,
        generateCurrentWeekReport,
        getReportForWeek,
        hasCurrentWeekReport,
      }}
    >
      {children}
    </WeeklyReportContext.Provider>
  );
}

export function useWeeklyReportContext() {
  const ctx = useContext(WeeklyReportContext);
  if (!ctx) throw new Error('useWeeklyReportContext must be used within WeeklyReportProvider');
  return ctx;
}
