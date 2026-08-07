import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, BookOpen, Calendar, StickyNote, Search, Star, Download, X as XIcon, CheckSquare, Square } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useArticleContext } from '../../store/ArticleContext';
import { parseFile } from '../../services/fileParser';
import { Toast, ConfirmDialog, getCategoryColor } from '../SharedUI';
import type { ArticleDateFilter, ArticleRecord } from '../../types';
import { DEPRECATED_ARTICLE_GENRES } from '../../types';
import { exportArticles, type ExportFormat } from '../../services/articleExporter';

interface AnalysisListViewProps {
  onOpenArticle: (id: string) => void;
}

type TabKey = 'draft' | 'archived';

export function AnalysisListView({ onOpenArticle }: AnalysisListViewProps) {
  const { state, addArticle, deleteArticle, getArticlesByStatus, filterArchived } = useArticleContext();

  const [tab, setTab] = useState<TabKey>('archived');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Archived tab filters
  const [keyword, setKeyword] = useState('');
  const [selectedGimmicks, setSelectedGimmicks] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [platform, setPlatform] = useState('');
  const [dateFilter, setDateFilter] = useState<ArticleDateFilter>('all');
  const [onlyClassic, setOnlyClassic] = useState(false);
  const [gimmickExpanded, setGimmickExpanded] = useState(false);

  // Batch selection (archived tab)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  const drafts = useMemo(() => getArticlesByStatus('draft'), [state.articles]);
  const archivedAll = useMemo(() => getArticlesByStatus('archived'), [state.articles]);
  const archivedFiltered = useMemo(
    () => filterArchived({ keyword, coreGimmicks: selectedGimmicks.length > 0 ? selectedGimmicks : undefined, categories: selectedCats, platform, dateFilter, onlyClassic }),
    [keyword, selectedGimmicks, selectedCats, platform, dateFilter, onlyClassic, state.articles]
  );

  // All archived platforms / categories for filter dropdowns
  const platforms = useMemo(() => {
    const set = new Set<string>();
    archivedAll.forEach((a) => a.platform && set.add(a.platform));
    return Array.from(set);
  }, [archivedAll]);
  const availableCats = useMemo(() => {
    const DEPRECATED = new Set(DEPRECATED_ARTICLE_GENRES);
    const set = new Set<string>();
    state.genres.forEach((g) => set.add(g));
    archivedAll.forEach((a) => (a.categories || []).forEach((c) => set.add(c)));
    return Array.from(set).filter((c) => !DEPRECATED.has(c));
  }, [archivedAll, state.genres]);
  const availableGimmicks = useMemo(() => {
    const set = new Set<string>();
    archivedAll.forEach((a) => {
      (a.coreGimmick || []).forEach((g) => {
        if (g.trim()) set.add(g.trim());
      });
    });
    return Array.from(set);
  }, [archivedAll]);

  // Create new article (draft)
  const handleNewArticle = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: '文档', extensions: ['txt', 'docx'] }],
    });
    if (!selected) return;

    setLoading(true);
    try {
      const filePath = selected as string;
      const fileName = filePath.split(/[/\\]/).pop() || 'untitled';
      const doc = await parseFile(filePath, fileName);
      const article = await addArticle(doc.title, doc.content);
      onOpenArticle(article.id);
    } catch (err) {
      console.error('Failed to create article:', err);
      setToast('文档解析失败，请确认文件格式正确');
    } finally {
      setLoading(false);
    }
  }, [addArticle, onOpenArticle]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteArticle(id);
      setConfirmDeleteId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setToast('例文记录已删除');
    },
    [deleteArticle]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBatchExport = async (format: ExportFormat) => {
    setShowFormatMenu(false);
    if (selectedIds.size === 0) return;
    const targets = archivedAll.filter((a) => selectedIds.has(a.id));
    setExporting(true);
    try {
      const result = await exportArticles(targets, format);
      if (result.cancelled) return;
      setToast(`已导出 ${result.success} / ${targets.length}${result.failed > 0 ? `（${result.failed} 失败）` : ''}`);
      clearSelection();
    } catch (err) {
      console.error('Batch export failed:', err);
      setToast('批量导出失败');
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setKeyword('');
    setSelectedGimmicks([]);
    setSelectedCats([]);
    setPlatform('');
    setDateFilter('all');
    setOnlyClassic(false);
  };

  const hasActiveFilters = keyword || selectedGimmicks.length > 0 || selectedCats.length > 0 || platform || dateFilter !== 'all' || onlyClassic;

  return (
    <div className="relative flex flex-col h-full">
      {/* 列表页底部底纹（森系 footer 图，例文草稿/例文库共用） */}
      <div className="skin-app-footer" aria-hidden />
      {/* Toolbar */}
      <header className="h-16 glass-panel border-b border-gray-200/50 dark:border-gray-700 flex items-center px-4 gap-3 shrink-0">
        <span className="relative inline-flex skin-btn-spacer">
          <span className="skin-btn-deco" aria-hidden />
          <button
            onClick={handleNewArticle}
            disabled={loading}
            className="btn-primary skin-btn-primary flex items-center gap-2"
          >
            <Plus size={15} strokeWidth={1.5} className="skin-hide-btn-icon" />
            {loading ? '导入中...' : '导入文章'}
          </button>
        </span>

        {/* Tabs */}
        <div className="flex items-center gap-1 ml-3 bg-gray-100 dark:bg-dark-200 rounded-lg p-0.5">
          <button
            onClick={() => setTab('draft')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              tab === 'draft'
                ? 'bg-white dark:bg-dark-50 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            例文草稿
            <span className="ml-1 text-[10px] opacity-60">{drafts.length}</span>
          </button>
          <button
            onClick={() => setTab('archived')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              tab === 'archived'
                ? 'bg-white dark:bg-dark-50 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            例文库
            <span className="ml-1 text-[10px] opacity-60">{archivedAll.length}</span>
          </button>
        </div>

          <span className="text-xs text-gray-400 ml-auto">
          {state.loading ? '加载中...' : `共 ${state.articles.length} 篇`}
        </span>
      </header>

      {/* Archived tab filter bar (flat, unified chip style) */}
      {tab === 'archived' && archivedAll.length > 0 && (
        <div className="border-b border-gray-200/50 dark:border-gray-700 bg-white/50 dark:bg-dark-50/50 px-4 py-3 shrink-0 space-y-2.5">
          {/* Search + summary row */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索标题 / 核心梗 / 作者"
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
              />
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2"
              >
                <XIcon size={12} />
                清空筛选
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400">
              {hasActiveFilters ? `${archivedFiltered.length} / ${archivedAll.length}` : `${archivedAll.length} 篇例文`}
            </span>
          </div>

          {/* Flat chip groups */}
          <div className="flex flex-wrap items-start gap-x-4 gap-y-1.5">
            {/* Genres */}
            {availableCats.length > 0 && (
              <FilterGroup label="题材">
                {availableCats.map((c) => {
                  const active = selectedCats.includes(c);
                  return (
                    <FilterChip
                      key={c}
                      active={active}
                      onClick={() =>
                        setSelectedCats((prev) => (active ? prev.filter((x) => x !== c) : [...prev, c]))
                      }
                    >
                      {c}
                    </FilterChip>
                  );
                })}
              </FilterGroup>
            )}

            {/* Platforms */}
            {platforms.length > 0 && (
              <FilterGroup label="平台">
                <FilterChip active={platform === ''} onClick={() => setPlatform('')}>全部</FilterChip>
                {platforms.map((p) => (
                  <FilterChip key={p} active={platform === p} onClick={() => setPlatform(p)}>
                    {p}
                  </FilterChip>
                ))}
              </FilterGroup>
            )}

            {/* Core gimmicks */}
            {availableGimmicks.length > 0 && (
              <FilterGroup label="核心梗">
                {(() => {
                  const maxVisible = 8;
                  const collapsed = !gimmickExpanded && availableGimmicks.length > maxVisible;
                  const visible = collapsed ? availableGimmicks.slice(0, maxVisible) : availableGimmicks;
                  const toggleGimmick = (g: string) => {
                    setSelectedGimmicks((prev) =>
                      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
                    );
                  };
                  return (
                    <>
                      {visible.map((g) => (
                        <FilterChip
                          key={g}
                          active={selectedGimmicks.includes(g)}
                          onClick={() => toggleGimmick(g)}
                        >
                          <span className="inline-block max-w-[140px] truncate align-middle" title={g}>{g}</span>
                        </FilterChip>
                      ))}
                      {collapsed && (
                        <button
                          onClick={() => setGimmickExpanded(true)}
                          className="chip chip-inactive text-xs"
                        >
                          展开更多 ({availableGimmicks.length - maxVisible})
                        </button>
                      )}
                      {gimmickExpanded && availableGimmicks.length > maxVisible && (
                        <button
                          onClick={() => setGimmickExpanded(false)}
                          className="chip chip-inactive text-xs"
                        >
                          收起
                        </button>
                      )}
                    </>
                  );
                })()}
              </FilterGroup>
            )}

            {/* Date */}
            <FilterGroup label="时间">
              <FilterChip active={dateFilter === 'all'} onClick={() => setDateFilter('all')}>全部</FilterChip>
              <FilterChip active={dateFilter === 'month'} onClick={() => setDateFilter('month')}>近一月</FilterChip>
              <FilterChip active={dateFilter === 'halfYear'} onClick={() => setDateFilter('halfYear')}>近半年</FilterChip>
            </FilterGroup>

            {/* Classic */}
            <FilterGroup label="标记">
              <FilterChip
                active={onlyClassic}
                onClick={() => setOnlyClassic(!onlyClassic)}
                accent="amber"
              >
                <Star size={11} className={onlyClassic ? 'fill-amber-500' : ''} />
                <span>经典热文</span>
              </FilterChip>
            </FilterGroup>
          </div>
        </div>
      )}

      {/* Batch action bar */}
      {tab === 'archived' && selectedIds.size > 0 && (
        <div className="border-b border-gray-200/50 dark:border-gray-700 bg-gray-50/80 dark:bg-dark-50/80 px-4 py-2.5 flex items-center gap-3 shrink-0">
          <span className="text-sm text-gray-700 font-medium">已选 {selectedIds.size} 项</span>
          <div className="relative">
            <button
              onClick={() => setShowFormatMenu(!showFormatMenu)}
              disabled={exporting}
              className="btn-primary flex items-center gap-1.5"
            >
              <Download size={13} strokeWidth={1.5} />
              {exporting ? '导出中...' : '批量导出'}
            </button>
            {showFormatMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFormatMenu(false)} />
                <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-dark-50 border border-gray-200 dark:border-dark-100 rounded-xl shadow-lg py-1 min-w-[160px]">
                  <button
                    onClick={() => handleBatchExport('txt')}
                    className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200"
                  >
                    仅正文 (.txt)
                  </button>
                  <button
                    onClick={() => handleBatchExport('md')}
                    className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200"
                  >
                    带评论 (.md)
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={clearSelection}
            className="btn-ghost"
          >
            取消选择
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-surface dark:bg-dark">
        {state.loading ? (
          <div className="text-center text-gray-400 py-12">加载中...</div>
        ) : tab === 'draft' ? (
          <DraftList
            items={drafts}
            onOpen={onOpenArticle}
            onDelete={(id) => setConfirmDeleteId(id)}
            onNew={handleNewArticle}
          />
        ) : (
          <ArchivedList
            items={archivedFiltered}
            totalCount={archivedAll.length}
            onOpen={onOpenArticle}
            onDelete={(id) => setConfirmDeleteId(id)}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Confirm delete */}
      {confirmDeleteId && (
        <ConfirmDialog
          title="删除例文记录"
          message="确定要删除这篇例文记录吗？所有高亮和笔记将被删除，此操作不可撤销。"
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

// ---------- Sub components ----------

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  accent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent?: 'amber';
  children: React.ReactNode;
}) {
  const activeCls =
    accent === 'amber'
      ? 'bg-amber-50 border-amber-400 text-amber-600 dark:bg-amber-900/20'
      : 'bg-primary/15 ring-1 ring-inset ring-primary/40 text-primary dark:bg-primary/25 dark:text-gray-200';
  const hoverCls = accent === 'amber' ? 'hover:border-amber-300' : '';
  return (
    <button
      onClick={onClick}
      className={`chip ${
        active
          ? activeCls
          : 'chip-inactive'
      }`}
    >
      {children}
    </button>
  );
}

function DraftList({
  items,
  onOpen,
  onDelete,
  onNew,
}: {
  items: ArticleRecord[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mx-auto bg-primary/5 dark:bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <BookOpen size={32} className="text-primary/30" />
        </div>
        <p className="text-gray-400 dark:text-gray-500 text-base">还没有例文草稿</p>
        <p className="text-gray-400 dark:text-gray-600 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
          导入一篇文章，高亮、批注、收集素材，随后可加入例文库
        </p>
        <button
          onClick={onNew}
          className="btn-primary"
        >
          开始分析
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-w-3xl mx-auto">
      {items.map((article) => {
        const noteCount = article.comments.filter((c) => c.text).length;
        return (
          <div
            key={article.id}
            className="card card-hover px-3.5 py-2.5 flex items-center group cursor-pointer"
            onClick={() => onOpen(article.id)}
          >
            <BookOpen size={13} strokeWidth={1.5} className="text-gray-400 shrink-0 mr-2.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] font-normal text-gray-700 dark:text-gray-200 truncate tracking-[0.01em]">
                {article.title}
              </h3>
            </div>
            <div className="flex items-center gap-2.5 ml-3 shrink-0">
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Calendar size={10} strokeWidth={1.5} />
                {article.updatedAt}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <StickyNote size={10} strokeWidth={1.5} />
                {noteCount}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(article.id);
                }}
                className="btn-ghost-icon opacity-0 group-hover:opacity-100"
                title="删除草稿"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ArchivedList({
  items,
  totalCount,
  onOpen,
  onDelete,
  selectedIds,
  onToggleSelect,
}: {
  items: ArticleRecord[];
  totalCount: number;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  if (totalCount === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mx-auto bg-primary/5 dark:bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <BookOpen size={32} className="text-primary/30" />
        </div>
        <p className="text-gray-400 dark:text-gray-500 text-base">例文库还是空的</p>
        <p className="text-gray-400 dark:text-gray-600 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
          打开一篇草稿，点击右上角"加入例文库"填入分类、平台、核心梗等信息即可升级为例文
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        没有符合筛选条件的例文
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-w-6xl mx-auto">
      {items.map((article) => {
        const selected = selectedIds.has(article.id);
        return (
          <div
            key={article.id}
            className={`relative card card-hover p-3 group cursor-pointer ${
              selected ? 'card-selected' : ''
            }`}
            onClick={() => onOpen(article.id)}
          >
            {/* Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(article.id);
              }}
              className="absolute top-2 left-2 btn-ghost-icon"
              title={selected ? '取消选择' : '选择'}
            >
              {selected ? <CheckSquare size={18} strokeWidth={1.5} className="text-primary" /> : <Square size={18} strokeWidth={1.5} />}
            </button>

            {/* Classic star */}
            {article.isClassic && (
              <span title="经典热文" className="absolute top-2.5 right-2.5 text-amber-500">
                <Star size={14} strokeWidth={1.5} className="fill-amber-500" />
              </span>
            )}

            <div className="pl-7 pr-6">
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1 mb-2">
                {article.title}
              </h3>

              {/* Categories */}
              {article.categories && article.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {article.categories.slice(0, 3).map((c) => (
                    <span key={c} className={`px-1.5 py-0 text-[11px] rounded ${getCategoryColor(c)}`}>
                      {c}
                    </span>
                  ))}
                  {article.categories.length > 3 && (
                    <span className="text-[11px] text-gray-400">+{article.categories.length - 3}</span>
                  )}
                </div>
              )}

              {/* 正文前 200 字摘要 */}
              {article.content && (
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 mb-1.5 break-words">
                  {article.content.replace(/\s+/g, ' ').slice(0, 200)}
                </p>
              )}

              {/* Platform + Core Gimmick */}
              <div className="space-y-0.5 text-xs">
                {article.author && (
                  <div className="text-gray-500 dark:text-gray-400 truncate">
                    <span className="text-gray-400">作者：</span>{article.author}
                  </div>
                )}
                {article.platform && (
                  <div className="text-gray-500 dark:text-gray-400 truncate">
                    <span className="text-gray-400">平台：</span>{article.platform}
                  </div>
                )}
                {(article.coreGimmick && article.coreGimmick.length > 0) && (
                  <div className="text-gray-600 dark:text-gray-300 line-clamp-2">
                    <span className="text-gray-400">核心梗：</span>{(article.coreGimmick || []).join('、')}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-dark-100 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {article.archivedAt ? article.archivedAt.split('T')[0] : article.updatedAt}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(article.id);
                  }}
                  className="btn-ghost-icon opacity-0 group-hover:opacity-100"
                  title="删除例文"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
