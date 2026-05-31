import React, { useState, useCallback } from 'react';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { WorkRecord } from '../types';

interface ColumnDef {
  key: string;
  label: string;
  align: 'left' | 'right';
  width?: string;
  type?: 'text' | 'number' | 'date';
  editable: boolean;
  breakWords?: boolean;
  nowrap?: boolean;
  hideHeader?: boolean;
  isTotalFee?: boolean;
  isDelete?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'name', label: '作品名', align: 'left', width: '10em', type: 'text', editable: true, breakWords: true },
  { key: 'platform', label: '平台', align: 'left', width: '6em', type: 'text', editable: true, nowrap: true },
  { key: 'wordCount', label: '字数', align: 'right', width: '4em', type: 'number', editable: true, nowrap: true },
  { key: 'guaranteeFee', label: '保底', align: 'right', width: '5em', type: 'number', editable: true, nowrap: true },
  { key: 'shareFee', label: '分成', align: 'right', width: '5em', type: 'number', editable: true, nowrap: true },
  { key: 'fullAttendance', label: '全勤', align: 'right', width: '5em', type: 'number', editable: true, nowrap: true },
  { key: 'totalFee', label: '总稿费', align: 'right', width: '5em', isTotalFee: true, editable: false, nowrap: true },
  { key: 'publishDate', label: '日期', align: 'left', width: '8em', type: 'date', editable: true, nowrap: true },
  { key: 'data', label: '数据记录', align: 'left', width: '10em', type: 'text', editable: true, breakWords: true },
  { key: 'hypothesis', label: '假设', align: 'left', width: '10em', type: 'text', editable: true, breakWords: true },
  { key: 'verificationResult', label: '验证结论', align: 'left', width: '10em', type: 'text', editable: true, breakWords: true },
  { key: 'delete', label: '', align: 'left', width: '48px', isDelete: true, editable: false, hideHeader: true, nowrap: true },
];

const COL_WIDTHS = COLUMNS.map(c => c.width).join(' ');

function getThClass(col: ColumnDef): string {
  const align = col.align === 'right' ? 'text-right' : 'text-left';
  return `${align} font-semibold px-4 py-2 text-sm whitespace-nowrap`.trim();
}

function getTdClass(col: ColumnDef, isName = false): string {
  const parts = ['px-4', 'py-2', 'text-xs'];
  if (col.align === 'right') parts.push('text-right');
  if (col.isTotalFee || col.type === 'number') parts.push('tabular-nums');
  if (col.breakWords) parts.push('break-words');
  if (col.nowrap) parts.push('truncate');
  if (isName) {
    parts.push('text-gray-800 dark:text-gray-100');
  } else {
    parts.push('text-gray-700 dark:text-gray-300');
  }
  return parts.join(' ');
}

const ROW_HOVER_BG = 'bg-[#f8f8f7] dark:bg-dark-100/10';

const inputClass = 'w-full bg-transparent border-0 border-b border-gray-300 dark:border-dark-100 focus:outline-none focus:border-gray-500 text-xs';
const numInputClass = `${inputClass} text-right [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;
const dateInputClass = `${inputClass} [&::-webkit-calendar-picker-indicator]:hidden`;

function displayValue(work: WorkRecord, col: ColumnDef): string {
  if (col.isTotalFee) return work.totalFee.toLocaleString();
  const val = (work as any)[col.key];
  if (col.type === 'number') return val != null ? Number(val).toLocaleString() : '';
  if (col.type === 'date') {
    if (!val) return '';
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return val;
  }
  return val ?? '';
}

interface WorkRecordTableProps {
  works: WorkRecord[];
  showNewRow: boolean;
  newRow: any;
  saving: boolean;
  onNewRowChange: (updater: (prev: any) => any) => void;
  onSaveNewRow: () => Promise<void>;
  onCancelNewRow: () => void;
  onUpdateWork: (work: WorkRecord) => Promise<void>;
  onDeleteWork: (id: string) => Promise<void>;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function WorkRecordTable({ works, showNewRow, newRow, saving, onNewRowChange, onSaveNewRow, onCancelNewRow, onUpdateWork, onDeleteWork, currentPage, totalPages, onPageChange }: WorkRecordTableProps) {
  const [editingCell, setEditingCell] = useState<{rowId: string; field: string} | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const handleCellEdit = useCallback((work: WorkRecord, field: string, _currentValue: any) => {
    setEditingCell({ rowId: work.id, field });
    const col = COLUMNS.find(c => c.key === field);
    const formatted = col ? displayValue(work, col) : String(_currentValue ?? '');
    setEditBuffer(formatted);
  }, []);

  const handleCellSave = useCallback(async (work: WorkRecord) => {
    const cell = editingCell;
    const buffer = editBuffer;
    if (!cell || cell.rowId !== work.id) return;

    const numberFields = ['wordCount', 'guaranteeFee', 'shareFee', 'fullAttendance', 'copyright'];
    let value: any;
    if (numberFields.includes(cell.field)) {
      if (buffer === '') {
        value = cell.field === 'wordCount' ? 0 : undefined;
      } else {
        const num = Number(buffer);
        value = isNaN(num) ? 0 : num;
      }
    } else {
      value = buffer;
    }

    await onUpdateWork({ ...work, [cell.field]: value, totalFee: 0, updatedAt: '' });
    setEditingCell((prev) => prev?.rowId === cell.rowId && prev?.field === cell.field ? null : prev);
  }, [editingCell, editBuffer, onUpdateWork]);

  const handleDelete = useCallback((id: string) => {
    onDeleteWork(id);
    setEditingCell((prev) => prev?.rowId === id ? null : prev);
  }, [onDeleteWork]);

  const newRowNameRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.focus();
  }, []);

  return (
    <div className="bg-white dark:bg-dark-50 rounded-lg shadow-sm border border-gray-200/50 dark:border-dark-100/50 overflow-hidden h-full flex flex-col">
      <div
        className="grid overflow-auto flex-1 min-h-0 content-start"
        style={{ gridTemplateColumns: COL_WIDTHS }}
        onMouseOver={(e) => {
          const cell = (e.target as HTMLElement).closest('[data-row-id]');
          if (cell) {
            const rowId = cell.getAttribute('data-row-id');
            if (rowId) setHoveredRowId(rowId);
          }
        }}
        onMouseLeave={() => setHoveredRowId(null)}
      >
        {/* Header row */}
        {COLUMNS.map((col) => (
          <div
            key={`h-${col.key}`}
            className={`${getThClass(col)} bg-[#f7f7f5] dark:bg-dark-200/30 text-gray-700 dark:text-gray-300 sticky top-0 z-20 ${col.key === 'name' ? 'sticky left-0' : ''}`}
          >
            {col.hideHeader ? '' : col.label}
          </div>
        ))}

        {/* New row (top) */}
        {showNewRow && (
          <div className="contents">
            {COLUMNS.map((col) => {
              if (col.isDelete) {
                return (
                  <div key={`new-${col.key}`} className={getTdClass(col)}>
                    <button
                      onClick={onCancelNewRow}
                      className="transition-opacity text-gray-300 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              }

              if (col.isTotalFee) {
                const feePreview = ((newRow.guaranteeFee || 0) + (newRow.shareFee || 0) + (newRow.fullAttendance || 0)).toLocaleString();
                return (
                  <div key={`new-${col.key}`} className={getTdClass(col)}>
                    {feePreview}
                  </div>
                );
              }

              if (!col.editable) {
                return <div key={`new-${col.key}`} className={getTdClass(col)} />;
              }

              const val = (newRow as any)[col.key];
              const isNumber = col.type === 'number';
              const isDate = col.type === 'date';
              const isName = col.key === 'name';

              return (
                <div key={`new-${col.key}`} className={`${getTdClass(col)} ${isName ? 'sticky left-0 z-10 bg-white dark:bg-dark-50' : ''}`}>
                  <input
                    ref={isName ? newRowNameRef : undefined}
                    type={isNumber ? 'number' : isDate ? 'date' : 'text'}
                    value={isNumber ? (val ?? '') : val}
                    onChange={(e) => {
                      if (isName) {
                        const value = e.target.value;
                        onNewRowChange((f: any) => ({
                          ...f,
                          name: value,
                          publishDate: f.publishDate || (value.trim() ? new Date().toISOString().split('T')[0] : ''),
                        }));
                      } else {
                        onNewRowChange((f: any) => ({
                          ...f,
                          [col.key]: isNumber
                            ? (e.target.value ? Number(e.target.value) : undefined)
                            : e.target.value,
                        }));
                      }
                    }}
                    onBlur={() => {
                      if (newRow.name.trim() && newRow.platform.trim()) onSaveNewRow();
                    }}
                    className={isNumber ? numInputClass : isDate ? dateInputClass : inputClass}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Data rows */}
        {works.length === 0 && !showNewRow ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-3 opacity-40"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            <span className="text-sm">还没有作品记录，点击右上角「新增作品」开始添加</span>
          </div>
        ) : (works.map((work) => {
          const isHovered = hoveredRowId === work.id;
          const rowBg = isHovered ? ROW_HOVER_BG : '';
          return (
          <div
            key={work.id}
            className="contents"
          >
            {COLUMNS.map((col) => {
              if (col.isDelete) {
                return (
                  <div key={`d-${work.id}-${col.key}`} data-row-id={work.id} className={`px-4 py-2 transition-colors ${rowBg}`}>
                    <button
                      onClick={() => handleDelete(work.id)}
                      className={`transition-opacity text-gray-300 hover:text-red-500 dark:hover:text-red-400 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              }

              if (col.isTotalFee) {
                const feeDisplay = work.totalFee.toLocaleString();
                return (
                  <div key={`d-${work.id}-${col.key}`} data-row-id={work.id} className={`${getTdClass(col)} transition-colors ${rowBg}`} title={col.nowrap ? feeDisplay : undefined}>
                    {feeDisplay}
                  </div>
                );
              }

              const isEditing = editingCell?.rowId === work.id && editingCell?.field === col.key;
              const rawValue = (work as any)[col.key];
              const isNumber = col.type === 'number';

              if (isEditing) {
                const isName = col.key === 'name';
                return (
                  <div key={`d-${work.id}-${col.key}`} data-row-id={work.id} className={`${getTdClass(col)} transition-colors ${isName ? (isHovered ? ROW_HOVER_BG : 'bg-white dark:bg-dark-50 sticky left-0 z-10') : rowBg}`}>
                    <input
                      value={editBuffer}
                      onChange={(e) => setEditBuffer(e.target.value)}
                      onBlur={() => handleCellSave(work)}
                      autoFocus
                      type={col.type === 'date' ? 'date' : 'text'}
                      className={isNumber ? numInputClass : col.type === 'date' ? dateInputClass : inputClass}
                    />
                  </div>
                );
              }

              const display = displayValue(work, col);
              const isName = col.key === 'name';
              return (
                <div
                  key={`d-${work.id}-${col.key}`}
                  data-row-id={work.id}
                  onClick={() => handleCellEdit(work, col.key, rawValue)}
                  className={`${getTdClass(col, isName)} transition-colors ${isName ? (isHovered ? ROW_HOVER_BG : 'bg-white dark:bg-dark-50') : rowBg} cursor-text ${isName ? 'sticky left-0 z-10' : ''}`}
                  title={col.nowrap ? display : undefined}
                >
                  <span className={`${col.breakWords ? 'break-words' : ''}`}>
                    {display}
                  </span>
                </div>
              );
            })}
          </div>
          );
        }))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-dark-100/50 text-xs text-gray-400">
          <span>第 {currentPage} / {totalPages} 页</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-dark-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-6 h-6 rounded transition-colors ${
                  p === currentPage
                    ? 'bg-gray-200 dark:bg-dark-100 text-gray-700 dark:text-gray-300'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-100'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-dark-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
