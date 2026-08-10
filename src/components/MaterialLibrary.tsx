import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, X, Calendar, FileText, Download, BookOpen, Scissors, ExternalLink, FolderCog, Edit3 } from 'lucide-react';
import { useMaterialContext } from '../store/MaterialContext';
import { useArticleContext } from '../store/ArticleContext';
import { getCategoryColor, ConfirmDialog, Toast } from './SharedUI';
import { AddMaterialModal } from './AddMaterialModal';
import { ManageCategoriesModal } from './ManageCategoriesModal';
import { KindleImportModal } from './KindleImportModal';
import type { MaterialItem } from '../types';
import { exportToCSV, exportToMarkdown, exportToTxt, exportToExcel } from '../services/export';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

export function MaterialLibrary({ onOpenArticle }: { onOpenArticle?: (articleId: string, offset: number) => void }) {
  const {
    state,
    addMaterial,
    addMaterialsBatch,
    deleteMaterial,
    updateMaterial,
    getMaterialCountByCategory,
  } = useMaterialContext();
  const { state: articleState } = useArticleContext();

  // Build articleId -> title map for reverse link display
  const articleTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    articleState.articles.forEach((a) => map.set(a.id, a.title));
    return map;
  }, [articleState.articles]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null); // null = all
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showKindleImport, setShowKindleImport] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    let items = state.materials;
    if (activeCategory) {
      items = items.filter((m) => m.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.source.toLowerCase().includes(q) ||
          m.note.toLowerCase().includes(q)
      );
    }
    return items;
  }, [state.materials, activeCategory, searchQuery]);

  // Handle delete material
  const handleDelete = async (id: string) => {
    await deleteMaterial(id);
    setConfirmDelete(null);
    setToast('素材已删除');
  };

  // 分类的新增/改名/删除/排序统一在「整理分类」弹窗中完成

  // Handle add material from modal
  const handleAddMaterial = async (content: string, category: string, source: string, note: string) => {
    await addMaterial(content, category, source || '手动添加', note);
    setShowAddMaterial(false);
    setToast('素材已添加');
  };

  // Handle change material category
  const handleChangeCategory = async (materialId: string, newCategory: string) => {
    const item = state.materials.find((m) => m.id === materialId);
    if (item && item.category !== newCategory) {
      await updateMaterial({ ...item, category: newCategory });
      setToast('分类已修改');
    }
    setEditingCatId(null);
  };

  const handleUpdateNote = async (materialId: string) => {
    const item = state.materials.find((m) => m.id === materialId);
    if (item && item.note !== noteDraft) {
      await updateMaterial({ ...item, note: noteDraft });
      setToast('备注已更新');
    }
    setEditingNoteId(null);
    setNoteDraft('');
  };

  const handleStartEditNote = (id: string, note: string) => {
    setEditingNoteId(id);
    setNoteDraft(note);
  };

  // 返回原文：跳转到例文详情页并定位到素材位置
  const handleOpenOriginal = (item: MaterialItem) => {
    if (!item.articleId || !onOpenArticle) {
      setToast('未保存原文，无法跳转');
      return;
    }
    const article = articleState.articles.find((a) => a.id === item.articleId);
    if (!article) {
      setToast('未保存原文，无法跳转');
      return;
    }
    const offset = article.content.indexOf(item.content);
    if (offset < 0) {
      setToast('原文内容已变动，已定位到文章开头');
      onOpenArticle(item.articleId, 0);
      return;
    }
    onOpenArticle(item.articleId, offset);
  };

  // Export handler
  const handleExport = async (format: 'csv' | 'xlsx' | 'md' | 'txt') => {
    const items = activeCategory
      ? state.materials.filter((m) => m.category === activeCategory)
      : state.materials;

    if (items.length === 0) {
      setToast('没有可导出的素材');
      return;
    }

    let content = '';
    let defaultName = '素材库';
    let extension = format;

    switch (format) {
      case 'csv':
        content = exportToCSV(items);
        extension = 'csv';
        break;
      case 'xlsx':
        content = exportToExcel(items);
        extension = 'xlsx';
        break;
      case 'md':
        content = exportToMarkdown(items);
        extension = 'md';
        break;
      case 'txt':
        content = exportToTxt(items);
        extension = 'txt';
        break;
    }

    const catSuffix = activeCategory ? `_${activeCategory}` : '';
    defaultName = `${defaultName}${catSuffix}_${new Date().toISOString().split('T')[0]}.${extension}`;

    const filePath = await save({
      defaultPath: defaultName,
      filters: [{ name: format === 'xlsx' ? 'Excel' : format.toUpperCase(), extensions: [extension] }],
    });

    if (filePath) {
      await writeTextFile(filePath as string, content);
      setToast(`已导出 ${items.length} 条素材`);
    }
    setShowExportMenu(false);
  };

  return (
    <div className="flex h-full">
      {/* Left sidebar: category navigation */}
      <aside className="w-52 glass-panel border-r border-gray-200/50 dark:border-gray-700 flex flex-col shrink-0">
        <div className="p-3 flex-1 overflow-y-auto">
          <button
            onClick={() => setActiveCategory(null)}
            className={`nav-item w-full mb-0.5 ${
              activeCategory === null
                ? 'nav-item-active'
                : 'nav-item-inactive'
            }`}
          >
            全部素材
            <span className="ml-auto text-xs opacity-50">({state.materials.length})</span>
          </button>

          <div className="h-px bg-gray-200/50 dark:bg-white/10 my-2" />

          <div className="space-y-0.5">
            {state.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                className={`nav-item w-full ${
                  activeCategory === cat.name
                    ? 'nav-item-active'
                    : 'nav-item-inactive'
                }`}
              >
                <span className="truncate flex-1">{cat.name}</span>
                <span className="text-xs opacity-50 w-5 text-right shrink-0">{getMaterialCountByCategory(cat.name)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category management */}
        <div className="p-3 border-t border-gray-200 dark:border-dark-100">
          <button
            onClick={() => setShowManageCategories(true)}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full transition-colors border border-dashed border-gray-200 dark:border-dark-100 hover:border-primary/30"
          >
            <FolderCog size={14} />
            整理分类
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search bar, add material, and export */}
        <div className="h-16 glass-panel border-b border-gray-200/50 dark:border-gray-700 flex items-center px-4 gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索素材内容、来源或备注..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-surface dark:bg-dark ring-1 ring-inset ring-gray-200 dark:ring-dark-100 rounded-full text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Add material button */}
          <button
            onClick={() => setShowAddMaterial(true)}
            className="btn-ghost"
          >
            <Plus size={14} />
            添加新素材
          </button>

          {/* Import from Kindle */}
          <button
            onClick={() => setShowKindleImport(true)}
            className="btn-ghost"
            title="从 Kindle 的 My Clippings.txt 导入标注"
          >
            <BookOpen size={14} />
            导入 Kindle 标注
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-ghost"
            >
              <Download size={14} />
              导出素材
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-dark-50 rounded-xl shadow-xl border border-gray-200 dark:border-dark-100 py-1 w-40 z-40 animate-fade-in">
                  <button
                    onClick={() => handleExport('xlsx')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-200 hover:text-primary transition-colors"
                  >
                    导出为 Excel
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-200 hover:text-primary transition-colors"
                  >
                    导出为 CSV
                  </button>
                  <button
                    onClick={() => handleExport('md')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-200 hover:text-primary transition-colors"
                  >
                    导出为 Markdown
                  </button>
                  <button
                    onClick={() => handleExport('txt')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-200 hover:text-primary transition-colors"
                  >
                    导出为 TXT
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Material list */}
        <div className="flex-1 overflow-y-auto p-4 bg-surface dark:bg-dark">
          {state.loading ? (
            <div className="text-center text-gray-400 py-12">加载中...</div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-20">
              {searchQuery || activeCategory ? (
                <>
                  <Search size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-400 dark:text-gray-600">
                    没有找到匹配的素材
                  </p>
                  <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">
                    {searchQuery && `当前搜索："${searchQuery}"`}
                    {activeCategory && ` · 分类：${activeCategory}`}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto bg-primary/5 dark:bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <FileText size={32} className="text-primary/30" />
                  </div>
                  <p className="text-gray-400 dark:text-gray-500 text-base">还没有收藏任何素材</p>
                  <p className="text-gray-400 dark:text-gray-600 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                    在「文档阅读」中导入一篇小说，选中想收藏的文字，右键点击即可添加到素材库
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-w-3xl mx-auto">
              {filteredMaterials.map((item) => (
                <div
                  key={item.id}
                  className={`card card-hover overflow-hidden ${
                    expandedId === item.id ? 'card-selected' : ''
                  }`}
                >
                  {/* Card header */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                        <p className={`text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap ${
                          expandedId !== item.id ? 'line-clamp-2' : ''
                        }`}>
                          {item.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(item.category)}`}>
                          {item.category}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenOriginal(item);
                          }}
                          className="text-xs text-primary hover:underline flex items-center gap-1 transition-colors shrink-0"
                          title="跳转到例文详情页并定位到该素材位置"
                        >
                          <ExternalLink size={12} />
                          返回原文
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400 dark:text-gray-600 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                      <span className="flex items-center gap-1">
                        <FileText size={12} />
                        {expandedId === item.id ? item.source : (item.source.length > 10 ? item.source.slice(0, 10) + '...' : item.source)}
                      </span>
                      {item.articleId && articleTitleMap.has(item.articleId) && (
                        <span className="flex items-center gap-1 text-primary/70" title={`来自例文：${articleTitleMap.get(item.articleId)}`}>
                          <Scissors size={11} />
                          例文
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {item.date}
                      </span>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedId === item.id && (
                    <div className="px-4 pb-4 pt-3 animate-fade-in">
                      <div className="pt-3">
                        {/* Category section */}
                        <div className="flex items-start gap-2 mb-3">
                          <span className="text-xs text-gray-400 mt-1 shrink-0">分类：</span>
                          {editingCatId === item.id ? (
                            <div className="flex flex-wrap gap-1.5">
                              {state.categories.map((cat) => (
                                <button
                                  key={cat.id}
                                  onClick={() => handleChangeCategory(item.id, cat.name)}
                                  className={`chip ${
                                    item.category === cat.name
                                      ? 'chip-active'
                                      : 'chip-inactive'
                                  }`}
                                >
                                  {cat.name}
                                </button>
                              ))}
                              <button
                                onClick={() => setEditingCatId(null)}
                                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => setEditingCatId(item.id)}
                              className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-primary transition-colors"
                            >
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(item.category)}`}>
                                {item.category}
                              </span>
                              <span className="text-xs text-gray-400 ml-1">
                                <Edit3 size={11} className="inline-block opacity-70" />
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Note section */}
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-gray-400 mt-0.5 shrink-0">备注：</span>
                          {editingNoteId === item.id ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                onBlur={() => handleUpdateNote(item.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setEditingNoteId(null);
                                    setNoteDraft('');
                                  }
                                }}
                                autoFocus
                                className="flex-1 text-sm px-3 py-1.5 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <button
                                onClick={() => { setEditingNoteId(null); setNoteDraft(''); }}
                                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => handleStartEditNote(item.id, item.note || '')}
                              className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-primary transition-colors flex-1"
                            >
                              {item.note ? (
                                <span className="leading-relaxed">{item.note}</span>
                              ) : (
                                <span className="text-gray-400 italic">未填写</span>
                              )}
                              <span className="text-xs text-gray-400 ml-1">
                                <Edit3 size={11} className="inline-block opacity-70" />
                              </span>
                            </span>
                          )}
                        </div>

                        {/* 来源信息 + 删除素材 */}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-gray-400 truncate">
                            {item.articleId && articleTitleMap.has(item.articleId)
                              ? `来自例文：${articleTitleMap.get(item.articleId)}`
                              : '未关联已保存的例文'}
                          </span>
                          <button
                            onClick={() => setConfirmDelete(item.id)}
                            className="text-xs text-red-500 hover:text-red-600 hover:underline flex items-center gap-1 transition-colors shrink-0"
                            title="删除素材"
                          >
                            <Trash2 size={12} />
                            删除素材
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status bar */}
        <footer className="h-8 border-t border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-50 flex items-center px-4 text-xs text-gray-400 dark:text-gray-600 shrink-0">
          <span>
            {activeCategory ? `「${activeCategory}」` : '全部'} 共 {filteredMaterials.length} 条
            {searchQuery && ` · 搜索"${searchQuery}"`}
          </span>
        </footer>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Add material modal */}
      <AddMaterialModal
        visible={showAddMaterial}
        categories={state.categories}
        onConfirm={handleAddMaterial}
        onClose={() => setShowAddMaterial(false)}
      />

      {/* Manage categories modal */}
      <ManageCategoriesModal
        visible={showManageCategories}
        onClose={() => setShowManageCategories(false)}
      />

      {/* Kindle import modal */}
      <KindleImportModal
        visible={showKindleImport}
        onImport={(drafts, dedup) => addMaterialsBatch(drafts, dedup)}
        onClose={() => setShowKindleImport(false)}
        onDone={(result) => {
          setShowKindleImport(false);
          if (result.added === 0 && result.skipped > 0) {
            setToast(`${result.skipped} 条已存在，均已跳过`);
          } else if (result.skipped > 0) {
            setToast(`已导入 ${result.added} 条，跳过 ${result.skipped} 条重复`);
          } else {
            setToast(`已导入 ${result.added} 条 Kindle 标注`);
          }
        }}
      />

      {/* Confirm delete material */}
      {confirmDelete && (
        <ConfirmDialog
          title="删除素材"
          message="确定要删除这条素材吗？此操作不可撤销。"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
