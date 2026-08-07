import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  ArticleRecord,
  ArticleMetadata,
  ArticleStatus,
  ArticleDateFilter,
  Highlight,
  Comment,
  HighlightColor,
} from '../types';
import {
  loadArticles,
  saveArticles,
  migrateAnalysesToArticles,
  loadMigrationFlags,
  saveMigrationFlags,
  loadArticleGenres,
  saveArticleGenres,
} from '../services/storage';
import { DEFAULT_ARTICLE_GENRES, DEPRECATED_ARTICLE_GENRES } from '../types';

// State shape
interface ArticleState {
  articles: ArticleRecord[];
  currentArticleId: string | null;
  loading: boolean;
  hasUnsavedChanges: boolean;
  migratedCount: number; // 本次启动从旧数据迁移的数量（0 表示没有迁移）
  genres: string[]; // 例文题材分类
  // 素材库“返回原文”定位目标：进入详情页后滚动到该 offset 并闪烁提示
  readerTarget: { offset: number } | null;
}

// Actions
type ArticleAction =
  | { type: 'SET_ARTICLES'; payload: ArticleRecord[] }
  | { type: 'ADD_ARTICLE'; payload: ArticleRecord }
  | { type: 'UPDATE_ARTICLE'; payload: ArticleRecord }
  | { type: 'DELETE_ARTICLE'; payload: string }
  | { type: 'SET_CURRENT_ARTICLE'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_UNSAVED'; payload: boolean }
  | { type: 'SET_MIGRATED_COUNT'; payload: number }
  | { type: 'SET_GENRES'; payload: string[] }
  | { type: 'SET_READER_TARGET'; payload: { offset: number } | null };

const initialState: ArticleState = {
  articles: [],
  currentArticleId: null,
  loading: true,
  hasUnsavedChanges: false,
  migratedCount: 0,
  genres: [],
  readerTarget: null,
};

function articleReducer(state: ArticleState, action: ArticleAction): ArticleState {
  switch (action.type) {
    case 'SET_ARTICLES':
      return { ...state, articles: action.payload, loading: false };
    case 'ADD_ARTICLE':
      return { ...state, articles: [action.payload, ...state.articles], hasUnsavedChanges: false };
    case 'UPDATE_ARTICLE': {
      const updated = state.articles.map((a) =>
        a.id === action.payload.id ? action.payload : a
      );
      return { ...state, articles: updated, hasUnsavedChanges: false };
    }
    case 'DELETE_ARTICLE':
      return {
        ...state,
        articles: state.articles.filter((a) => a.id !== action.payload),
        currentArticleId: state.currentArticleId === action.payload ? null : state.currentArticleId,
        hasUnsavedChanges: false,
      };
    case 'SET_CURRENT_ARTICLE':
      return { ...state, currentArticleId: action.payload, hasUnsavedChanges: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_UNSAVED':
      return { ...state, hasUnsavedChanges: action.payload };
    case 'SET_MIGRATED_COUNT':
      return { ...state, migratedCount: action.payload };
    case 'SET_GENRES':
      return { ...state, genres: action.payload };
    case 'SET_READER_TARGET':
      return { ...state, readerTarget: action.payload };
    default:
      return state;
  }
}

// Context value
interface ArticleContextValue {
  state: ArticleState;
  // 素材库“返回原文”定位目标（顶层透出，供编辑器消费）
  readerTarget: ArticleState['readerTarget'];
  // CRUD
  addArticle: (title: string, content: string) => Promise<ArticleRecord>;
  updateArticle: (article: ArticleRecord) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  // Status transitions
  archiveArticle: (id: string, metadata: ArticleMetadata) => Promise<void>;
  unarchiveArticle: (id: string) => Promise<void>;
  // Highlight / Comment
  addHighlight: (articleId: string, startOffset: number, endOffset: number, color: HighlightColor) => Promise<void>;
  removeHighlight: (articleId: string, highlightId: string) => Promise<void>;
  addComment: (articleId: string, highlightId: string, color: HighlightColor) => Promise<void>;
  updateComment: (articleId: string, commentId: string, text: string) => Promise<void>;
  deleteComment: (articleId: string, commentId: string) => Promise<void>;
  // Navigation
  setCurrentArticle: (id: string | null) => void;
  markUnsaved: () => void;
  getCurrentArticle: () => ArticleRecord | undefined;
  refreshArticles: () => Promise<void>;
  // 素材库“返回原文”定位
  setReaderTarget: (offset: number) => void;
  clearReaderTarget: () => void;
  // 长篇小说阅读进度（不更新 updatedAt）
  updateReadingProgress: (articleId: string, page: number) => Promise<void>;
  // Query helpers
  getArticlesByStatus: (status: ArticleStatus) => ArticleRecord[];
  filterArchived: (query: {
    keyword?: string;
    coreGimmicks?: string[];
    categories?: string[];
    platform?: string;
    dateFilter?: ArticleDateFilter;
    onlyClassic?: boolean;
  }) => ArticleRecord[];
  // Genre management
  addGenre: (name: string) => Promise<void>;
  deleteGenre: (name: string) => Promise<void>;
}

const ArticleContext = createContext<ArticleContextValue | null>(null);

export function ArticleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(articleReducer, initialState);

  // Load data on mount (runs migration first)
  useEffect(() => {
    async function init() {
      try {
        const migratedCount = await migrateAnalysesToArticles();
        if (migratedCount > 0) {
          dispatch({ type: 'SET_MIGRATED_COUNT', payload: migratedCount });
        } else {
          // 新安装用户（无旧数据可迁）：直接标记已看过升级引导，避免弹窗
          try {
            const flags = await loadMigrationFlags();
            if (!flags.hasSeenV2Intro) {
              await saveMigrationFlags({ ...flags, hasSeenV2Intro: true });
            }
          } catch (_) {
            /* ignore */
          }
        }
        const articles = await loadArticles();
        // 数据迁移：清洗每篇例文 categories 中的废弃题材
        const DEPRECATED = new Set(DEPRECATED_ARTICLE_GENRES);
        let articlesChanged = false;
        const cleanedArticles = articles.map((a) => {
          if (!a.categories || a.categories.length === 0) return a;
          const filtered = a.categories.filter((c) => !DEPRECATED.has(c));
          if (filtered.length !== a.categories.length) {
            articlesChanged = true;
            return { ...a, categories: filtered };
          }
          return a;
        });
        if (articlesChanged) {
          try { await saveArticles(cleanedArticles); } catch (_) { /* ignore */ }
        }
        // 数据迁移：coreGimmick string → string[]
        let gimmickChanged = false;
        const gimmickCleaned = cleanedArticles.map((a) => {
          const raw = (a as any).coreGimmick;
          if (typeof raw === 'string') {
            gimmickChanged = true;
            return { ...a, coreGimmick: raw ? [raw] : [] };
          }
          if (!Array.isArray(a.coreGimmick)) {
            gimmickChanged = true;
            return { ...a, coreGimmick: [] };
          }
          return a;
        });
        const finalArticles = gimmickChanged ? gimmickCleaned : cleanedArticles;
        if (gimmickChanged) {
          try { await saveArticles(finalArticles); } catch (_) { /* ignore */ }
        }
        dispatch({ type: 'SET_ARTICLES', payload: finalArticles });
        // Load genres
        try {
          const genres = await loadArticleGenres();
          // 数据迁移：移除已废弃的默认题材
          const cleaned = genres.filter((g) => !DEPRECATED.has(g));
          const final = cleaned.length > 0 ? cleaned : [...DEFAULT_ARTICLE_GENRES];
          if (cleaned.length !== genres.length) {
            try { await saveArticleGenres(final); } catch (_) { /* ignore */ }
          }
          dispatch({ type: 'SET_GENRES', payload: final });
        } catch (genreErr) {
          console.error('[ArticleContext] load genres failed:', genreErr);
          dispatch({ type: 'SET_GENRES', payload: [...DEFAULT_ARTICLE_GENRES] });
        }
      } catch (err) {
        console.error('[ArticleContext] Init failed:', err);
        dispatch({ type: 'SET_ARTICLES', payload: [] });
      }
    }
    init();
  }, []);

  const todayStr = () => new Date().toISOString().split('T')[0];

  const getCurrentArticle = (): ArticleRecord | undefined => {
    return state.articles.find((a) => a.id === state.currentArticleId);
  };

  const addArticle = async (title: string, content: string): Promise<ArticleRecord> => {
    const now = todayStr();
    const article: ArticleRecord = {
      id: uuidv4(),
      title,
      content,
      highlights: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
      status: 'draft',
    };
    const updated = [article, ...state.articles];
    await saveArticles(updated);
    dispatch({ type: 'ADD_ARTICLE', payload: article });
    return article;
  };

  const updateArticle = async (article: ArticleRecord) => {
    const today = todayStr();
    const updated = article.updatedAt !== today ? { ...article, updatedAt: today } : article;
    const newArticles = state.articles.map((a) => (a.id === updated.id ? updated : a));
    await saveArticles(newArticles);
    dispatch({ type: 'UPDATE_ARTICLE', payload: updated });
  };

  const deleteArticle = async (id: string) => {
    const filtered = state.articles.filter((a) => a.id !== id);
    await saveArticles(filtered);
    dispatch({ type: 'DELETE_ARTICLE', payload: id });
  };

  const archiveArticle = async (id: string, metadata: ArticleMetadata) => {
    const article = state.articles.find((a) => a.id === id);
    if (!article) return;
    const now = new Date().toISOString();
    const updated: ArticleRecord = {
      ...article,
      status: 'archived',
      categories: metadata.categories,
      platform: metadata.platform,
      author: metadata.author,
      coreGimmick: metadata.coreGimmick,
      payPoint: metadata.payPoint,
      synopsis: metadata.synopsis,
      highlight: metadata.highlight,
      isClassic: metadata.isClassic,
      archivedAt: now,
      updatedAt: todayStr(),
    };
    const newArticles = state.articles.map((a) => (a.id === id ? updated : a));
    await saveArticles(newArticles);
    dispatch({ type: 'UPDATE_ARTICLE', payload: updated });
  };

  const unarchiveArticle = async (id: string) => {
    const article = state.articles.find((a) => a.id === id);
    if (!article) return;
    const updated: ArticleRecord = {
      ...article,
      status: 'draft',
      archivedAt: undefined,
      updatedAt: todayStr(),
    };
    const newArticles = state.articles.map((a) => (a.id === id ? updated : a));
    await saveArticles(newArticles);
    dispatch({ type: 'UPDATE_ARTICLE', payload: updated });
  };

  const addHighlight = async (
    articleId: string,
    startOffset: number,
    endOffset: number,
    color: HighlightColor
  ) => {
    const article = state.articles.find((a) => a.id === articleId);
    if (!article) return;

    const highlight: Highlight = {
      id: uuidv4(),
      startOffset,
      endOffset,
      color,
      isActive: true,
    };
    const comment: Comment = {
      id: uuidv4(),
      highlightId: highlight.id,
      text: '',
      color,
    };
    const updated: ArticleRecord = {
      ...article,
      highlights: [...article.highlights, highlight],
      comments: [...article.comments, comment],
      updatedAt: todayStr(),
    };
    const newArticles = state.articles.map((a) => (a.id === updated.id ? updated : a));
    await saveArticles(newArticles);
    dispatch({ type: 'UPDATE_ARTICLE', payload: updated });
  };

  const removeHighlight = async (articleId: string, highlightId: string) => {
    const article = state.articles.find((a) => a.id === articleId);
    if (!article) return;
    const updated: ArticleRecord = {
      ...article,
      highlights: article.highlights.map((h) =>
        h.id === highlightId ? { ...h, isActive: false } : h
      ),
      updatedAt: todayStr(),
    };
    const newArticles = state.articles.map((a) => (a.id === updated.id ? updated : a));
    await saveArticles(newArticles);
    dispatch({ type: 'UPDATE_ARTICLE', payload: updated });
  };

  const addComment = async (articleId: string, highlightId: string, color: HighlightColor) => {
    const article = state.articles.find((a) => a.id === articleId);
    if (!article) return;
    const comment: Comment = {
      id: uuidv4(),
      highlightId,
      text: '',
      color,
    };
    const updated: ArticleRecord = {
      ...article,
      comments: [...article.comments, comment],
      updatedAt: todayStr(),
    };
    const newArticles = state.articles.map((a) => (a.id === updated.id ? updated : a));
    await saveArticles(newArticles);
    dispatch({ type: 'UPDATE_ARTICLE', payload: updated });
  };

  const updateComment = async (articleId: string, commentId: string, text: string) => {
    const article = state.articles.find((a) => a.id === articleId);
    if (!article) return;
    const updated: ArticleRecord = {
      ...article,
      comments: article.comments.map((c) => (c.id === commentId ? { ...c, text } : c)),
      updatedAt: todayStr(),
    };
    const newArticles = state.articles.map((a) => (a.id === updated.id ? updated : a));
    await saveArticles(newArticles);
    dispatch({ type: 'UPDATE_ARTICLE', payload: updated });
  };

  const deleteComment = async (articleId: string, commentId: string) => {
    const article = state.articles.find((a) => a.id === articleId);
    if (!article) return;
    const updated: ArticleRecord = {
      ...article,
      comments: article.comments.filter((c) => c.id !== commentId),
      updatedAt: todayStr(),
    };
    const newArticles = state.articles.map((a) => (a.id === updated.id ? updated : a));
    await saveArticles(newArticles);
    dispatch({ type: 'UPDATE_ARTICLE', payload: updated });
  };

  const setCurrentArticle = (id: string | null) => {
    dispatch({ type: 'SET_CURRENT_ARTICLE', payload: id });
  };

  const setReaderTarget = (offset: number) => {
    dispatch({ type: 'SET_READER_TARGET', payload: { offset } });
  };

  const clearReaderTarget = () => {
    dispatch({ type: 'SET_READER_TARGET', payload: null });
  };

  // 仅更新阅读页码，不触碰 updatedAt（避免污染“最近更新”排序）
  const updateReadingProgress = async (articleId: string, page: number) => {
    const article = state.articles.find((a) => a.id === articleId);
    if (!article || article.lastReadPage === page) return;
    const updated: ArticleRecord = { ...article, lastReadPage: page };
    const newArticles = state.articles.map((a) => (a.id === articleId ? updated : a));
    await saveArticles(newArticles);
    dispatch({ type: 'UPDATE_ARTICLE', payload: updated });
  };

  const markUnsaved = () => {
    dispatch({ type: 'SET_UNSAVED', payload: true });
  };

  const refreshArticles = async () => {
    const articles = await loadArticles();
    dispatch({ type: 'SET_ARTICLES', payload: articles });
  };

  const getArticlesByStatus = (status: ArticleStatus): ArticleRecord[] => {
    return state.articles.filter((a) => a.status === status);
  };

  const filterArchived = (query: {
    keyword?: string;
    coreGimmicks?: string[];
    categories?: string[];
    platform?: string;
    dateFilter?: ArticleDateFilter;
    onlyClassic?: boolean;
  }): ArticleRecord[] => {
    const archived = state.articles.filter((a) => a.status === 'archived');
    const { keyword, coreGimmicks, categories, platform, dateFilter, onlyClassic } = query;

    return archived.filter((a) => {
      if (keyword && keyword.trim()) {
        const k = keyword.toLowerCase();
        const hit =
          a.title.toLowerCase().includes(k) ||
          (a.coreGimmick || []).join(' ').toLowerCase().includes(k) ||
          (a.author || '').toLowerCase().includes(k);
        if (!hit) return false;
      }
      if (coreGimmicks && coreGimmicks.length > 0) {
        const articleGimmicks = a.coreGimmick || [];
        const hit = coreGimmicks.every((g) =>
          articleGimmicks.some((ag) => ag.toLowerCase().includes(g.toLowerCase()))
        );
        if (!hit) return false;
      }
      if (categories && categories.length > 0) {
        const articleCats = a.categories || [];
        const hit = categories.some((c) => articleCats.includes(c));
        if (!hit) return false;
      }
      if (platform && platform.trim()) {
        if ((a.platform || '').trim() !== platform.trim()) return false;
      }
      if (dateFilter && dateFilter !== 'all') {
        const archivedAt = a.archivedAt ? new Date(a.archivedAt) : new Date(a.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - archivedAt.getTime();
        const days = diffMs / (1000 * 60 * 60 * 24);
        if (dateFilter === 'month' && days > 30) return false;
        if (dateFilter === 'halfYear' && days > 180) return false;
      }
      if (onlyClassic && !a.isClassic) return false;
      return true;
    });
  };

  const addGenre = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (state.genres.includes(trimmed)) return;
    const next = [...state.genres, trimmed];
    await saveArticleGenres(next);
    dispatch({ type: 'SET_GENRES', payload: next });
  };

  const deleteGenre = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = state.genres.filter((g) => g !== trimmed);
    await saveArticleGenres(next);
    dispatch({ type: 'SET_GENRES', payload: next });
  };

  return (
    <ArticleContext.Provider
      value={{
        state,
        readerTarget: state.readerTarget,
        addArticle,
        updateArticle,
        deleteArticle,
        archiveArticle,
        unarchiveArticle,
        addHighlight,
        removeHighlight,
        addComment,
        updateComment,
        deleteComment,
        setCurrentArticle,
        markUnsaved,
        getCurrentArticle,
        refreshArticles,
        setReaderTarget,
        clearReaderTarget,
        updateReadingProgress,
        getArticlesByStatus,
        filterArchived,
        addGenre,
        deleteGenre,
      }}
    >
      {children}
    </ArticleContext.Provider>
  );
}

export function useArticleContext() {
  const ctx = useContext(ArticleContext);
  if (!ctx) throw new Error('useArticleContext must be used within ArticleProvider');
  return ctx;
}
