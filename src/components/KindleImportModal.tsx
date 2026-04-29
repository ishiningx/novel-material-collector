import React, { useMemo, useState } from 'react';
import { X, BookOpen, FileText, ChevronDown, ChevronRight, Upload, CheckCircle2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import {
  parseMyClippings,
  buildSource,
  type PairedClipping,
} from '../services/kindleClippingsParser';
import type { MaterialDraft, BatchImportResult } from '../store/MaterialContext';

interface KindleImportModalProps {
  visible: boolean;
  onImport: (drafts: MaterialDraft[], dedup: boolean) => Promise<BatchImportResult>;
  onClose: () => void;
  onDone: (result: BatchImportResult) => void;
}

// 导入的标注统一落入默认分类，用户后续可在素材库调整
const DEFAULT_IMPORT_CATEGORY = '未分类';

type Step = 'select' | 'preview' | 'importing';

export function KindleImportModal({
  visible,
  onImport,
  onClose,
  onDone,
}: KindleImportModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [clippings, setClippings] = useState<PairedClipping[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());
  const [dedup, setDedup] = useState(true);
  const [onlyWithNote, setOnlyWithNote] = useState(false);
  const [timeRange, setTimeRange] = useState<'all' | '7d' | '30d'>('all');
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [busy, setBusy] = useState(false);

  // 按书分组
  const grouped = useMemo(() => {
    const map = new Map<string, PairedClipping[]>();
    for (const c of clippings) {
      // 时间过滤
      if (timeRange !== 'all') {
        const days = timeRange === '7d' ? 7 : 30;
        const cutoff = Date.now() - days * 24 * 3600 * 1000;
        if (c.createdAt.getTime() < cutoff) continue;
      }
      if (onlyWithNote && !c.note) continue;
      const key = `${c.bookTitle}|||${c.author}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const [bookTitle, author] = key.split('|||');
      return { bookTitle, author, items };
    });
  }, [clippings, onlyWithNote, timeRange]);

  const visibleIds = useMemo(
    () => new Set(grouped.flatMap((g) => g.items.map((i) => i.id))),
    [grouped]
  );

  const selectedCount = useMemo(
    () => Array.from(selectedIds).filter((id) => visibleIds.has(id)).length,
    [selectedIds, visibleIds]
  );

  if (!visible) return null;

  const reset = () => {
    setStep('select');
    setClippings([]);
    setSelectedIds(new Set());
    setExpandedBooks(new Set());
    setFileName('');
    setParseError('');
    setOnlyWithNote(false);
    setTimeRange('all');
    setDedup(true);
    setBusy(false);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  // Step 1: 选文件 + 解析
  const handlePickFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Kindle Clippings', extensions: ['txt'] }],
      });
      if (!selected || typeof selected !== 'string') return;

      setBusy(true);
      setParseError('');

      const buffer = await readFile(selected);
      const text = decodeText(buffer);
      const parsed = parseMyClippings(text);

      if (parsed.length === 0) {
        setParseError('未解析出任何标注，请确认文件来自 Kindle 设备的 My Clippings.txt');
        setBusy(false);
        return;
      }

      const name = selected.split(/[/\\]/).pop() || 'My Clippings.txt';
      setFileName(name);
      setClippings(parsed);
      setSelectedIds(new Set(parsed.map((c) => c.id)));
      // 默认所有书籍收起，点击书名才展开具体条目
      setExpandedBooks(new Set());
      setStep('preview');
      setBusy(false);
    } catch (err) {
      console.error('[KindleImportModal] parse failed:', err);
      setParseError(err instanceof Error ? err.message : '文件读取失败');
      setBusy(false);
    }
  };

  // 勾选切换
  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleBook = (bookKey: string, ids: string[]) => {
    const allSelected = ids.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelected) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    setSelectedIds(next);
  };

  const toggleBookExpand = (bookKey: string) => {
    const next = new Set(expandedBooks);
    if (next.has(bookKey)) next.delete(bookKey);
    else next.add(bookKey);
    setExpandedBooks(next);
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(visibleIds));
  };

  const invertSelection = () => {
    const next = new Set(selectedIds);
    for (const id of visibleIds) {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    }
    setSelectedIds(next);
  };

  // Step 3: 执行导入
  const handleImport = async () => {
    if (selectedCount === 0) return;
    setBusy(true);
    setStep('importing');

    const drafts: MaterialDraft[] = clippings
      .filter((c) => selectedIds.has(c.id) && visibleIds.has(c.id))
      .map((c) => ({
        content: c.content,
        category: DEFAULT_IMPORT_CATEGORY,
        source: buildSource(c.bookTitle, c.author),
        note: buildNote(c),
        // 日期统一为“加入素材库的时间”（本周成果按此统计）
      }));

    try {
      const result = await onImport(drafts, dedup);
      reset();
      onDone(result);
    } catch (err) {
      console.error('[KindleImportModal] import failed:', err);
      setBusy(false);
      setStep('preview');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={handleClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-dark-50 rounded-xl shadow-2xl border border-gray-200 dark:border-dark-100 w-[760px] h-[92vh] max-h-[92vh] flex flex-col animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-dark-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              导入 Kindle 标注
            </h3>
            {step === 'preview' && (
              <span className="text-xs text-gray-400">· {fileName}</span>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={busy}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {step === 'select' && (
          <SelectStep
            busy={busy}
            parseError={parseError}
            onPick={handlePickFile}
          />
        )}

        {step === 'preview' && (
          <PreviewStep
            grouped={grouped}
            totalCount={clippings.length}
            visibleCount={visibleIds.size}
            selectedCount={selectedCount}
            selectedIds={selectedIds}
            expandedBooks={expandedBooks}
            dedup={dedup}
            onlyWithNote={onlyWithNote}
            timeRange={timeRange}
            onToggleItem={toggleItem}
            onToggleBook={toggleBook}
            onToggleBookExpand={toggleBookExpand}
            onSelectAll={selectAllVisible}
            onInvert={invertSelection}
            onDedupChange={setDedup}
            onOnlyWithNoteChange={setOnlyWithNote}
            onTimeRangeChange={setTimeRange}
            onCancel={handleClose}
            onBack={() => setStep('select')}
            onConfirm={handleImport}
          />
        )}

        {step === 'importing' && (
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm">正在导入 {selectedCount} 条标注...</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ========== Step 1: 选文件 ==========
function SelectStep({
  busy,
  parseError,
  onPick,
}: {
  busy: boolean;
  parseError: string;
  onPick: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="border-2 border-dashed border-gray-200 dark:border-dark-100 rounded-xl p-8 text-center">
        <div className="w-14 h-14 mx-auto bg-primary/5 dark:bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
          <Upload size={24} className="text-primary/60" />
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
          选择 Kindle 的「My Clippings.txt」
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mb-5 leading-relaxed">
          用数据线将 Kindle 连接到电脑，文件位于设备的
          <br />
          <code className="text-gray-500 bg-gray-50 dark:bg-dark-200 px-1.5 py-0.5 rounded mx-0.5">
            Kindle/documents/My Clippings.txt
          </code>
        </p>
        <button
          onClick={onPick}
          disabled={busy}
          className="px-4 py-2 text-sm bg-primary-200 text-primary-700 hover:bg-primary-300 rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          {busy ? '解析中...' : '选择文件'}
        </button>
        {parseError && (
          <p className="text-xs text-red-500 mt-4">{parseError}</p>
        )}
      </div>

      <div className="mt-5 text-xs text-gray-400 dark:text-gray-600 space-y-1">
        <p>• 支持中文 / 英文 Kindle 导出格式</p>
        <p>• 自动把书中同位置的「笔记」合并到「标注」的备注里</p>
        <p>• 已存在的标注会自动跳过（可在下一步关闭）</p>
      </div>
    </div>
  );
}

// ========== Step 2: 预览 ==========
interface GroupedBook {
  bookTitle: string;
  author: string;
  items: PairedClipping[];
}

function PreviewStep(props: {
  grouped: GroupedBook[];
  totalCount: number;
  visibleCount: number;
  selectedCount: number;
  selectedIds: Set<string>;
  expandedBooks: Set<string>;
  dedup: boolean;
  onlyWithNote: boolean;
  timeRange: 'all' | '7d' | '30d';
  onToggleItem: (id: string) => void;
  onToggleBook: (bookKey: string, ids: string[]) => void;
  onToggleBookExpand: (bookKey: string) => void;
  onSelectAll: () => void;
  onInvert: () => void;
  onDedupChange: (v: boolean) => void;
  onOnlyWithNoteChange: (v: boolean) => void;
  onTimeRangeChange: (v: 'all' | '7d' | '30d') => void;
  onCancel: () => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const {
    grouped,
    totalCount,
    visibleCount,
    selectedCount,
    selectedIds,
    expandedBooks,
    dedup,
    onlyWithNote,
    timeRange,
    onToggleItem,
    onToggleBook,
    onToggleBookExpand,
    onSelectAll,
    onInvert,
    onDedupChange,
    onOnlyWithNoteChange,
    onTimeRangeChange,
    onCancel,
    onBack,
    onConfirm,
  } = props;

  return (
    <>
      {/* 筛选栏 */}
      <div className="px-5 py-2.5 border-b border-gray-100 dark:border-dark-100 flex items-center gap-3 text-xs shrink-0 flex-wrap">
        <span className="text-gray-400">
          共 {totalCount} 条 · 当前可见 {visibleCount} · 已选 {selectedCount}
        </span>
        <div className="flex-1" />
        <button
          onClick={onSelectAll}
          className="text-gray-500 hover:text-primary px-2 py-1 rounded hover:bg-primary/5"
        >
          全选
        </button>
        <button
          onClick={onInvert}
          className="text-gray-500 hover:text-primary px-2 py-1 rounded hover:bg-primary/5"
        >
          反选
        </button>
        <label className="flex items-center gap-1 text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyWithNote}
            onChange={(e) => onOnlyWithNoteChange(e.target.checked)}
            className="accent-primary"
          />
          只看带笔记
        </label>
        <select
          value={timeRange}
          onChange={(e) => onTimeRangeChange(e.target.value as 'all' | '7d' | '30d')}
          className="px-2 py-1 rounded border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark text-gray-600 dark:text-gray-400 focus:outline-none"
        >
          <option value="all">全部时间</option>
          <option value="7d">最近 7 天</option>
          <option value="30d">最近 30 天</option>
        </select>
      </div>

      {/* 列表区 */}
      <div className="flex-1 overflow-y-auto px-5 py-3 bg-surface dark:bg-dark">
        {grouped.length === 0 ? (
          <div className="text-center text-gray-400 py-10 text-sm">当前筛选条件下没有条目</div>
        ) : (
          <div className="space-y-2">
            {grouped.map((g) => {
              const bookKey = `${g.bookTitle}|||${g.author}`;
              const ids = g.items.map((i) => i.id);
              const allSelected = ids.every((id) => selectedIds.has(id));
              const someSelected = ids.some((id) => selectedIds.has(id));
              const expanded = expandedBooks.has(bookKey);
              return (
                <div
                  key={bookKey}
                  className="bg-white dark:bg-dark-50 rounded-lg border border-gray-100 dark:border-dark-100 overflow-hidden"
                >
                  {/* 书标题行 */}
                  <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-200">
                    <button
                      onClick={() => onToggleBookExpand(bookKey)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allSelected && someSelected;
                      }}
                      onChange={() => onToggleBook(bookKey, ids)}
                      className="accent-primary"
                    />
                    <BookOpen size={13} className="text-primary/60 shrink-0" />
                    <span className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">
                      {g.bookTitle}
                    </span>
                    {g.author && (
                      <span className="text-xs text-gray-400 truncate">— {g.author}</span>
                    )}
                    <span className="ml-auto text-xs text-gray-400 shrink-0">
                      {g.items.length} 条
                    </span>
                  </div>

                  {/* 条目列表 */}
                  {expanded && (
                    <div className="border-t border-gray-100 dark:border-dark-100 divide-y divide-gray-50 dark:divide-dark-100">
                      {g.items.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-start gap-2 px-3 py-2 pl-10 hover:bg-gray-50 dark:hover:bg-dark-200"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => onToggleItem(c.id)}
                            className="accent-primary mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                              {c.content || <span className="text-gray-400 italic">（无正文）</span>}
                            </p>
                            {c.note && (
                              <p className="mt-1 text-xs text-primary/80 bg-primary/5 rounded px-2 py-1 whitespace-pre-wrap">
                                📝 {c.note}
                              </p>
                            )}
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                              <span>{typeLabel(c.type)}</span>
                              {c.locationLabel && <span>· {c.locationLabel}</span>}
                              {c.createdAt.getTime() > 0 && (
                                <span>· {formatCreatedAt(c.createdAt)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-100 bg-white dark:bg-dark-50 shrink-0 space-y-2">
        <p className="text-xs text-gray-500 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2 leading-relaxed">
          ℹ／导入的标注将统一落入 <span className="font-medium text-primary">未分类</span>，可在素材库中随时调整分类。
        </p>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={dedup}
              onChange={(e) => onDedupChange(e.target.checked)}
              className="accent-primary"
            />
            跳过素材库中已存在的（按来源+正文匹配）
          </label>
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
            >
              返回
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={selectedCount === 0}
              className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ${
                selectedCount === 0
                  ? 'bg-gray-200 dark:bg-dark-200 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-200 text-primary-700 hover:bg-primary-300 shadow-sm'
              }`}
            >
              <CheckCircle2 size={13} />
              导入 {selectedCount} 条
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ========== Helpers ==========

function typeLabel(t: PairedClipping['type']): string {
  if (t === 'highlight') return '📌 标注';
  if (t === 'note') return '📝 笔记';
  return '🔖 书签';
}

function formatCreatedAt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 备注只保留 Kindle 中的手写笔记，无笔记时留空
function buildNote(c: PairedClipping): string {
  return c.note || '';
}

// UTF-8 优先，若有替换字符则尝试 GBK
function decodeText(buffer: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  if (!utf8.includes('\uFFFD')) return utf8;
  try {
    return new TextDecoder('gbk').decode(buffer);
  } catch {
    return utf8;
  }
}

// 避免未使用变量的 warning
void FileText;
