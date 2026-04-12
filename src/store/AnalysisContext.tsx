import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { AnalysisRecord, Highlight, Comment, HighlightColor } from '../types';
import { loadAnalyses, saveAnalyses } from '../services/storage';

// State shape
interface AnalysisState {
  analyses: AnalysisRecord[];
  currentAnalysisId: string | null;
  loading: boolean;
  hasUnsavedChanges: boolean;
}

// Actions
type AnalysisAction =
  | { type: 'SET_ANALYSES'; payload: AnalysisRecord[] }
  | { type: 'ADD_ANALYSIS'; payload: AnalysisRecord }
  | { type: 'UPDATE_ANALYSIS'; payload: AnalysisRecord }
  | { type: 'DELETE_ANALYSIS'; payload: string }
  | { type: 'SET_CURRENT_ANALYSIS'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_UNSAVED'; payload: boolean };

const initialState: AnalysisState = {
  analyses: [],
  currentAnalysisId: null,
  loading: true,
  hasUnsavedChanges: false,
};

function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case 'SET_ANALYSES':
      return { ...state, analyses: action.payload, loading: false };
    case 'ADD_ANALYSIS':
      return { ...state, analyses: [action.payload, ...state.analyses], hasUnsavedChanges: false };
    case 'UPDATE_ANALYSIS': {
      const updated = state.analyses.map((a) =>
        a.id === action.payload.id ? action.payload : a
      );
      return { ...state, analyses: updated, hasUnsavedChanges: false };
    }
    case 'DELETE_ANALYSIS':
      return {
        ...state,
        analyses: state.analyses.filter((a) => a.id !== action.payload),
        currentAnalysisId: state.currentAnalysisId === action.payload ? null : state.currentAnalysisId,
        hasUnsavedChanges: false,
      };
    case 'SET_CURRENT_ANALYSIS':
      return { ...state, currentAnalysisId: action.payload, hasUnsavedChanges: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_UNSAVED':
      return { ...state, hasUnsavedChanges: action.payload };
    default:
      return state;
  }
}

// Context value
interface AnalysisContextValue {
  state: AnalysisState;
  addAnalysis: (title: string, content: string) => Promise<AnalysisRecord>;
  updateAnalysis: (analysis: AnalysisRecord) => Promise<void>;
  deleteAnalysis: (id: string) => Promise<void>;
  addHighlight: (analysisId: string, startOffset: number, endOffset: number, color: HighlightColor) => Promise<void>;
  removeHighlight: (analysisId: string, highlightId: string) => Promise<void>;
  addComment: (analysisId: string, highlightId: string, color: HighlightColor) => Promise<void>;
  updateComment: (analysisId: string, commentId: string, text: string) => Promise<void>;
  deleteComment: (analysisId: string, commentId: string) => Promise<void>;
  setCurrentAnalysis: (id: string | null) => void;
  markUnsaved: () => void;
  getCurrentAnalysis: () => AnalysisRecord | undefined;
  refreshAnalyses: () => Promise<void>;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(analysisReducer, initialState);

  // Load data on mount
  useEffect(() => {
    async function init() {
      try {
        const analyses = await loadAnalyses();
        dispatch({ type: 'SET_ANALYSES', payload: analyses });
      } catch (err) {
        console.error('[AnalysisContext] Init failed:', err);
        dispatch({ type: 'SET_ANALYSES', payload: [] });
      }
    }
    init();
  }, []);

  const getCurrentAnalysis = (): AnalysisRecord | undefined => {
    return state.analyses.find((a) => a.id === state.currentAnalysisId);
  };

  const addAnalysis = async (title: string, content: string): Promise<AnalysisRecord> => {
    const now = new Date().toISOString().split('T')[0];
    const analysis: AnalysisRecord = {
      id: uuidv4(),
      title,
      content,
      highlights: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    };
    const updated = [analysis, ...state.analyses];
    await saveAnalyses(updated);
    dispatch({ type: 'ADD_ANALYSIS', payload: analysis });
    return analysis;
  };

  const updateAnalysis = async (analysis: AnalysisRecord) => {
    const updated = analysis.updatedAt !== new Date().toISOString().split('T')[0]
      ? { ...analysis, updatedAt: new Date().toISOString().split('T')[0] }
      : analysis;
    const newAnalyses = state.analyses.map((a) => (a.id === updated.id ? updated : a));
    await saveAnalyses(newAnalyses);
    dispatch({ type: 'UPDATE_ANALYSIS', payload: updated });
  };

  const deleteAnalysis = async (id: string) => {
    const filtered = state.analyses.filter((a) => a.id !== id);
    await saveAnalyses(filtered);
    dispatch({ type: 'DELETE_ANALYSIS', payload: id });
  };

  const addHighlight = async (
    analysisId: string,
    startOffset: number,
    endOffset: number,
    color: HighlightColor
  ) => {
    const analysis = state.analyses.find((a) => a.id === analysisId);
    if (!analysis) return;

    const highlight: Highlight = {
      id: uuidv4(),
      startOffset,
      endOffset,
      color,
      isActive: true,
    };

    // Auto-create an empty comment linked to this highlight
    const comment: Comment = {
      id: uuidv4(),
      highlightId: highlight.id,
      text: '',
      color,
    };

    const updated: AnalysisRecord = {
      ...analysis,
      highlights: [...analysis.highlights, highlight],
      comments: [...analysis.comments, comment],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    // Save to storage (debounced - mark as unsaved instead of immediate save)
    const newAnalyses = state.analyses.map((a) => (a.id === updated.id ? updated : a));
    await saveAnalyses(newAnalyses);
    dispatch({ type: 'UPDATE_ANALYSIS', payload: updated });
  };

  const removeHighlight = async (analysisId: string, highlightId: string) => {
    const analysis = state.analyses.find((a) => a.id === analysisId);
    if (!analysis) return;

    const updated: AnalysisRecord = {
      ...analysis,
      highlights: analysis.highlights.map((h) =>
        h.id === highlightId ? { ...h, isActive: false } : h
      ),
      updatedAt: new Date().toISOString().split('T')[0],
    };

    const newAnalyses = state.analyses.map((a) => (a.id === updated.id ? updated : a));
    await saveAnalyses(newAnalyses);
    dispatch({ type: 'UPDATE_ANALYSIS', payload: updated });
  };

  const addComment = async (analysisId: string, highlightId: string, color: HighlightColor) => {
    const analysis = state.analyses.find((a) => a.id === analysisId);
    if (!analysis) return;

    const comment: Comment = {
      id: uuidv4(),
      highlightId,
      text: '',
      color,
    };

    const updated: AnalysisRecord = {
      ...analysis,
      comments: [...analysis.comments, comment],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    const newAnalyses = state.analyses.map((a) => (a.id === updated.id ? updated : a));
    await saveAnalyses(newAnalyses);
    dispatch({ type: 'UPDATE_ANALYSIS', payload: updated });
  };

  const updateComment = async (analysisId: string, commentId: string, text: string) => {
    const analysis = state.analyses.find((a) => a.id === analysisId);
    if (!analysis) return;

    const updated: AnalysisRecord = {
      ...analysis,
      comments: analysis.comments.map((c) =>
        c.id === commentId ? { ...c, text } : c
      ),
      updatedAt: new Date().toISOString().split('T')[0],
    };

    const newAnalyses = state.analyses.map((a) => (a.id === updated.id ? updated : a));
    await saveAnalyses(newAnalyses);
    dispatch({ type: 'UPDATE_ANALYSIS', payload: updated });
  };

  const deleteComment = async (analysisId: string, commentId: string) => {
    const analysis = state.analyses.find((a) => a.id === analysisId);
    if (!analysis) return;

    const updated: AnalysisRecord = {
      ...analysis,
      comments: analysis.comments.filter((c) => c.id !== commentId),
      updatedAt: new Date().toISOString().split('T')[0],
    };

    const newAnalyses = state.analyses.map((a) => (a.id === updated.id ? updated : a));
    await saveAnalyses(newAnalyses);
    dispatch({ type: 'UPDATE_ANALYSIS', payload: updated });
  };

  const setCurrentAnalysis = (id: string | null) => {
    dispatch({ type: 'SET_CURRENT_ANALYSIS', payload: id });
  };

  const markUnsaved = () => {
    dispatch({ type: 'SET_UNSAVED', payload: true });
  };

  const refreshAnalyses = async () => {
    const analyses = await loadAnalyses();
    dispatch({ type: 'SET_ANALYSES', payload: analyses });
  };

  return (
    <AnalysisContext.Provider
      value={{
        state,
        addAnalysis,
        updateAnalysis,
        deleteAnalysis,
        addHighlight,
        removeHighlight,
        addComment,
        updateComment,
        deleteComment,
        setCurrentAnalysis,
        markUnsaved,
        getCurrentAnalysis,
        refreshAnalyses,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysisContext() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysisContext must be used within AnalysisProvider');
  return ctx;
}
