import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { WorkRecord } from '../types';
import { loadWorks, saveWorks } from '../services/storage';

interface WorkState {
  works: WorkRecord[];
  loading: boolean;
}

type WorkAction =
  | { type: 'SET_WORKS'; payload: WorkRecord[] }
  | { type: 'ADD_WORK'; payload: WorkRecord }
  | { type: 'UPDATE_WORK'; payload: WorkRecord }
  | { type: 'DELETE_WORK'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: WorkState = {
  works: [],
  loading: true,
};

function workReducer(state: WorkState, action: WorkAction): WorkState {
  switch (action.type) {
    case 'SET_WORKS':
      return { ...state, works: action.payload, loading: false };
    case 'ADD_WORK':
      return { ...state, works: [action.payload, ...state.works] };
    case 'UPDATE_WORK':
      return {
        ...state,
        works: state.works.map((w) => (w.id === action.payload.id ? action.payload : w)),
      };
    case 'DELETE_WORK':
      return { ...state, works: state.works.filter((w) => w.id !== action.payload) };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

interface WorkContextValue {
  state: WorkState;
  addWork: (data: Omit<WorkRecord, 'id' | 'createdAt' | 'updatedAt' | 'totalFee'>) => Promise<void>;
  addWorksBatch: (dataList: Omit<WorkRecord, 'id' | 'createdAt' | 'updatedAt' | 'totalFee'>[]) => Promise<void>;
  updateWork: (work: WorkRecord) => Promise<void>;
  deleteWork: (id: string) => Promise<void>;
  refreshWorks: () => Promise<void>;
  getMonthlyStats: (years: number[]) => { year: number; months: { month: number; totalFee: number; totalWords: number }[] }[];
  getYearTotal: (year: number) => number;
  getCurrentMonthTotal: () => number;
}

const WorkContext = createContext<WorkContextValue | null>(null);

function calcTotalFee(w: Partial<WorkRecord>): number {
  return (w.guaranteeFee || 0) + (w.shareFee || 0) + (w.fullAttendance || 0) + (w.copyright || 0);
}

export function WorkProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workReducer, initialState);

  useEffect(() => {
    async function init() {
      try {
        const works = await loadWorks();
        dispatch({ type: 'SET_WORKS', payload: works });
      } catch (err) {
        console.error('[WorkContext] Init failed:', err);
        dispatch({ type: 'SET_WORKS', payload: [] });
      }
    }
    init();
  }, []);

  const addWork = async (data: Omit<WorkRecord, 'id' | 'createdAt' | 'updatedAt' | 'totalFee'>) => {
    const now = new Date().toISOString().split('T')[0];
    const work: WorkRecord = {
      ...data,
      id: uuidv4(),
      totalFee: calcTotalFee(data),
      createdAt: now,
      updatedAt: now,
    };
    const updated = [work, ...state.works];
    await saveWorks(updated);
    dispatch({ type: 'ADD_WORK', payload: work });
  };

  const addWorksBatch = async (dataList: Omit<WorkRecord, 'id' | 'createdAt' | 'updatedAt' | 'totalFee'>[]) => {
    const now = new Date().toISOString().split('T')[0];
    const newWorks: WorkRecord[] = dataList.map((d) => ({
      ...d,
      id: uuidv4(),
      totalFee: calcTotalFee(d),
      createdAt: now,
      updatedAt: now,
    }));
    const updated = [...newWorks, ...state.works];
    await saveWorks(updated);
    dispatch({ type: 'SET_WORKS', payload: updated });
  };

  const updateWork = async (work: WorkRecord) => {
    const today = new Date().toISOString().split('T')[0];
    const updated = { ...work, totalFee: calcTotalFee(work), updatedAt: today };
    const newWorks = state.works.map((w) => (w.id === updated.id ? updated : w));
    await saveWorks(newWorks);
    dispatch({ type: 'UPDATE_WORK', payload: updated });
  };

  const deleteWork = async (id: string) => {
    const filtered = state.works.filter((w) => w.id !== id);
    await saveWorks(filtered);
    dispatch({ type: 'DELETE_WORK', payload: id });
  };

  const getMonthlyStats = (years: number[]) => {
    const result: { year: number; months: { month: number; totalFee: number; totalWords: number }[] }[] = [];
    for (const year of years) {
      const months: { month: number; totalFee: number; totalWords: number }[] = [];
      for (let m = 1; m <= 12; m++) {
        let totalFee = 0;
        let totalWords = 0;
        state.works.forEach((w) => {
          const d = new Date(w.publishDate);
          if (d.getFullYear() === year && d.getMonth() + 1 === m) {
            totalFee += w.totalFee;
            totalWords += w.wordCount;
          }
        });
        months.push({ month: m, totalFee, totalWords });
      }
      result.push({ year, months });
    }
    return result;
  };

  const getYearTotal = (year: number): number => {
    return state.works.reduce((sum, w) => {
      const d = new Date(w.publishDate);
      return d.getFullYear() === year ? sum + w.totalFee : sum;
    }, 0);
  };

  const getCurrentMonthTotal = (): number => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return state.works.reduce((sum, w) => {
      const d = new Date(w.publishDate);
      return d.getFullYear() === year && d.getMonth() + 1 === month ? sum + w.totalFee : sum;
    }, 0);
  };

  const refreshWorks = async () => {
    const works = await loadWorks();
    dispatch({ type: 'SET_WORKS', payload: works });
  };

  return (
    <WorkContext.Provider
      value={{
        state,
        addWork,
        addWorksBatch,
        updateWork,
        deleteWork,
        refreshWorks,
        getMonthlyStats,
        getYearTotal,
        getCurrentMonthTotal,
      }}
    >
      {children}
    </WorkContext.Provider>
  );
}

export function useWorkContext() {
  const ctx = useContext(WorkContext);
  if (!ctx) throw new Error('useWorkContext must be used within WorkProvider');
  return ctx;
}
