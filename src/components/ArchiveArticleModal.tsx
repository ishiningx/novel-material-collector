import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { ArticleMetadata, ArticleRecord } from '../types';
import { DEFAULT_ARTICLE_GENRES } from '../types';

interface ArchiveArticleModalProps {
  visible: boolean;
  article: ArticleRecord | null;
  genres: string[];
  allGimmicks: string[];
  onConfirm: (metadata: ArticleMetadata) => void | Promise<void>;
  onClose: () => void;
  addGenre: (name: string) => Promise<void>;
  deleteGenre: (name: string) => Promise<void>;
}

const EMPTY_META: ArticleMetadata = {
  categories: [],
  platform: '',
  author: '',
  coreGimmick: [],
  payPoint: '',
  synopsis: '',
  highlight: '',
  isClassic: false,
};

export function ArchiveArticleModal({
  visible,
  article,
  genres,
  allGimmicks,
  onConfirm,
  onClose,
  addGenre,
  deleteGenre,
}: ArchiveArticleModalProps) {
  const [meta, setMeta] = useState<ArticleMetadata>(EMPTY_META);
  const [showAddGenre, setShowAddGenre] = useState(false);
  const [newGenreName, setNewGenreName] = useState('');
  const [addingGenre, setAddingGenre] = useState(false);
  const [saving, setSaving] = useState(false);

  const [gimmickInput, setGimmickInput] = useState('');
  const [showGimmickDropdown, setShowGimmickDropdown] = useState(false);

  const filteredSuggestions = useMemo(() => {
    const selected = new Set(meta.coreGimmick);
    const candidates = allGimmicks.filter((g) => !selected.has(g));
    if (!gimmickInput.trim()) return candidates.slice(0, 8);
    const q = gimmickInput.toLowerCase();
    return candidates.filter((g) => g.toLowerCase().includes(q)).slice(0, 8);
  }, [allGimmicks, meta.coreGimmick, gimmickInput]);

  // Hydrate form when opened
  useEffect(() => {
    if (!visible) return;
    if (article && article.status === 'archived') {
      setMeta({
        categories: article.categories || [],
        platform: article.platform || '',
        author: article.author || '',
        coreGimmick: article.coreGimmick || [],
        payPoint: article.payPoint || '',
        synopsis: article.synopsis || '',
        highlight: article.highlight || '',
        isClassic: !!article.isClassic,
      });
    } else {
      setMeta(EMPTY_META);
    }
  }, [visible, article?.id]);

  if (!visible || !article) return null;

  const toggleCategory = (name: string) => {
    setMeta((m) => {
      const has = m.categories.includes(name);
      return {
        ...m,
        categories: has ? m.categories.filter((c) => c !== name) : [...m.categories, name],
      };
    });
  };

  const handleAddGenre = async () => {
    const name = newGenreName.trim();
    if (!name) return;
    setAddingGenre(true);
    try {
      await addGenre(name);
      setMeta((m) => (m.categories.includes(name) ? m : { ...m, categories: [...m.categories, name] }));
      setNewGenreName('');
      setShowAddGenre(false);
    } catch (err) {
      console.error('[ArchiveArticleModal] Failed to add genre:', err);
    } finally {
      setAddingGenre(false);
    }
  };

  const addGimmick = (g: string) => {
    const trimmed = g.trim();
    if (!trimmed || meta.coreGimmick.includes(trimmed)) return;
    setMeta((m) => ({ ...m, coreGimmick: [...m.coreGimmick, trimmed] }));
    setGimmickInput('');
  };

  const removeGimmick = (g: string) => {
    setMeta((m) => ({ ...m, coreGimmick: m.coreGimmick.filter((x) => x !== g) }));
  };

  const handleGimmickKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (gimmickInput.trim()) {
        addGimmick(gimmickInput);
        setShowGimmickDropdown(false);
      }
    }
  };

  const handleConfirm = async () => {
    if (meta.categories.length === 0 && !meta.platform.trim() && meta.coreGimmick.length === 0) {
      return;
    }
    setSaving(true);
    try {
      await onConfirm(meta);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    meta.categories.length > 0 || meta.platform.trim() || meta.coreGimmick.length > 0;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-dark-50 rounded-[14px] shadow-2xl w-[520px] max-h-[85vh] animate-modal-in overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-dark-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {article.status === 'archived' ? '编辑例文信息' : '加入例文库'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[400px]">{article.title}</p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost-icon"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Genres */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 font-medium">
              题材分类 <span className="text-gray-400">（可多选，如现言/古言/悬疑）</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {genres.map((g) => {
                const active = meta.categories.includes(g);
                const isDefault = DEFAULT_ARTICLE_GENRES.includes(g);
                return (
                  <div key={g} className="relative group">
                    <button
                      onClick={() => toggleCategory(g)}
                      className={`chip !py-1.5 !text-sm ${active ? 'chip-active' : 'chip-inactive'}`}
                    >
                      {g}
                      {!isDefault && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteGenre(g);
                            if (active) toggleCategory(g);
                          }}
                          className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                          title="删除此题材"
                        >
                          <Trash2 size={10} strokeWidth={2} />
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
              <button
                onClick={() => setShowAddGenre(!showAddGenre)}
                className="chip chip-inactive !py-1.5 !text-sm flex items-center gap-1"
              >
                <Plus size={12} />
                新题材
              </button>
            </div>
            {showAddGenre && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={newGenreName}
                  onChange={(e) => setNewGenreName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddGenre();
                    if (e.key === 'Escape') setShowAddGenre(false);
                  }}
                  placeholder="输入题材名称"
                  autoFocus
                  className="flex-1 text-sm px-3 py-1.5 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
                />
                <button
                  onClick={handleAddGenre}
                  disabled={!newGenreName.trim() || addingGenre}
                  className="btn-primary text-sm"
                >
                  {addingGenre ? '...' : '添加'}
                </button>
              </div>
            )}
          </div>

          {/* Platform & Author */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">平台</label>
              <input
                type="text"
                value={meta.platform}
                onChange={(e) => setMeta((m) => ({ ...m, platform: e.target.value }))}
                placeholder="如：番茄、七猫、知乎"
                className="w-full text-sm px-3 py-2 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">作者</label>
              <input
                type="text"
                value={meta.author}
                onChange={(e) => setMeta((m) => ({ ...m, author: e.target.value }))}
                placeholder="作者笔名"
                className="w-full text-sm px-3 py-2 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
              />
            </div>
          </div>

          {/* Core Gimmick */}
          <div className="relative">
            <label className="block text-xs text-gray-500 mb-1 font-medium">核心梗</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {meta.coreGimmick.map((g) => (
                <span key={g} className="chip chip-active flex items-center gap-1 text-xs">
                  {g}
                  <button
                    onClick={() => removeGimmick(g)}
                    className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                  >
                    <X size={10} strokeWidth={2} />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                value={gimmickInput}
                onChange={(e) => {
                  setGimmickInput(e.target.value);
                  setShowGimmickDropdown(true);
                }}
                onFocus={() => setShowGimmickDropdown(true)}
                onBlur={() => setTimeout(() => setShowGimmickDropdown(false), 150)}
                onKeyDown={handleGimmickKeyDown}
                placeholder="输入核心梗，回车添加"
                className="w-full text-sm px-3 py-2 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
              />
              {showGimmickDropdown && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-50 border border-gray-200 dark:border-dark-100 rounded-xl shadow-lg py-1 z-50 max-h-40 overflow-y-auto">
                  {filteredSuggestions.map((g) => (
                    <button
                      key={g}
                      onMouseDown={() => {
                        addGimmick(g);
                        setShowGimmickDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pay point */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">付费点</label>
            <input
              type="text"
              value={meta.payPoint}
              onChange={(e) => setMeta((m) => ({ ...m, payPoint: e.target.value }))}
              placeholder="付费章节位置 / 设计"
              className="w-full text-sm px-3 py-2 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
            />
          </div>

          {/* Synopsis */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">梗概</label>
            <textarea
              rows={3}
              value={meta.synopsis}
              onChange={(e) => setMeta((m) => ({ ...m, synopsis: e.target.value }))}
              placeholder="故事主要情节"
              className="w-full text-sm px-3 py-2 rounded-[14px] ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30 resize-none"
            />
          </div>

          {/* Highlight */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">亮点</label>
            <textarea
              rows={2}
              value={meta.highlight}
              onChange={(e) => setMeta((m) => ({ ...m, highlight: e.target.value }))}
              placeholder="值得学习的点"
              className="w-full text-sm px-3 py-2 rounded-[14px] ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30 resize-none"
            />
          </div>

          {/* Classic toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={meta.isClassic}
              onChange={(e) => setMeta((m) => ({ ...m, isClassic: e.target.checked }))}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">标记为经典热文</span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-100/60 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="btn-ghost"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit || saving}
            className={`btn-primary ${
              canSubmit && !saving
                ? ''
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {saving ? '保存中...' : article.status === 'archived' ? '保存修改' : '加入例文库'}
          </button>
        </div>
      </div>
    </>
  );
}
