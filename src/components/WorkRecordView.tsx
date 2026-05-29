import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Download, Upload, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { WorkRecord } from '../types';
import { useWorkContext } from '../store/WorkContext';
import { WorkRecordTable } from './WorkRecordTable';

type FilterType = 'all' | 'week' | 'month' | 'year';

function getWeekRange() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getFilterStart(filter: FilterType): Date {
  if (filter === 'all') return new Date(0);
  const now = new Date();
  if (filter === 'week') return getWeekRange();
  if (filter === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), 0, 1);
}

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const YEAR_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

function formatFee(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(2)}万`;
  return n.toLocaleString();
}

const HEADER_MAP: Record<string, string> = {
  '作品名': 'name',
  '平台': 'platform',
  '字数': 'wordCount',
  '保底稿费': 'guaranteeFee',
  '分成稿费': 'shareFee',
  '全勤稿费': 'fullAttendance',
  '发表日期': 'publishDate',
  '备注数据': 'data',
  '假设': 'hypothesis',
  '验证结论': 'verificationResult',
};

const TEMPLATE_HEADERS = Object.keys(HEADER_MAP);

function downloadTemplate() {
  const csv = '\uFEFF' + TEMPLATE_HEADERS.join(',') + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '作品数据导入模板.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseRows(headers: string[], rows: any[][]): any[] {
  const fieldMap: { idx: number; field: string }[] = [];
  headers.forEach((h, i) => {
    const mapped = HEADER_MAP[h.trim()];
    if (mapped) fieldMap.push({ idx: i, field: mapped });
  });

  return rows
    .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row) => {
      const record: any = {
        name: '', wordCount: 0, platform: '', publishDate: '',
        guaranteeFee: undefined, shareFee: undefined, fullAttendance: undefined,
        copyright: undefined, data: '', hypothesis: '', verificationResult: '',
      };

      fieldMap.forEach(({ idx, field }) => {
        let val = row[idx];
        if (val == null) return;

        if (field === 'wordCount') {
          const n = Number(val);
          record.wordCount = isNaN(n) ? 0 : n;
        } else if (['guaranteeFee', 'shareFee', 'fullAttendance'].includes(field)) {
          const n = Number(val);
          record[field] = isNaN(n) ? undefined : n;
        } else if (field === 'publishDate') {
          if (typeof val === 'number') {
            // Excel serial date
            const d = new Date((val - 25569) * 86400 * 1000);
            record.publishDate = d.toISOString().split('T')[0];
          } else {
            const s = String(val).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
              record.publishDate = s;
            } else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)) {
              const parts = s.split('/');
              record.publishDate = `${parts[0]}-${String(Number(parts[1])).padStart(2, '0')}-${String(Number(parts[2])).padStart(2, '0')}`;
            } else {
              record.publishDate = s;
            }
          }
        } else {
          record[field] = String(val).trim();
        }
      });

      return record;
    })
    .filter((r) => r.name && r.platform);
}

function formInit() {
  return {
    name: '', wordCount: 0, platform: '', publishDate: '',
    guaranteeFee: undefined as number | undefined,
    shareFee: undefined as number | undefined,
    fullAttendance: undefined as number | undefined,
    copyright: undefined as number | undefined,
    data: '', hypothesis: '', verificationResult: '',
  };
}

export function WorkRecordView() {
  const { state, addWork, addWorksBatch, updateWork, deleteWork, getMonthlyStats } = useWorkContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [selectedYears, setSelectedYears] = useState<number[]>(() => [new Date().getFullYear()]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [showNewRow, setShowNewRow] = useState(false);
  const [newRow, setNewRow] = useState(formInit);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => { setPage(1); }, [filter]);

  const updateNewRow = useCallback((updater: (prev: any) => any) => {
    setNewRow((prev) => updater(prev));
  }, []);

  const handleCancelNewRow = useCallback(() => {
    setShowNewRow(false);
    setNewRow(formInit());
  }, []);

  const handleSaveRow = useCallback(async () => {
    if (!newRow.name.trim() || !newRow.platform.trim()) return;
    setSaving(true);
    try {
      await addWork(newRow);
      setShowNewRow(false);
      setNewRow(formInit());
    } catch (err) {
      console.error('[WorkRecord] Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }, [newRow, addWork]);

  const PAGE_SIZE = 20;

  const filterStart = useMemo(() => getFilterStart(filter), [filter]);

  const filteredWorks = useMemo(() => {
    return state.works
      .filter((w) => new Date(w.publishDate) >= filterStart)
      .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
  }, [state.works, filterStart]);

  const totalPages = Math.max(1, Math.ceil(filteredWorks.length / PAGE_SIZE));

  const displayWorks = useMemo(() => {
    return filteredWorks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredWorks, page]);

  const stats = useMemo(() => ({
    count: filteredWorks.length,
    words: filteredWorks.reduce((s, w) => s + w.wordCount, 0),
    fee: filteredWorks.reduce((s, w) => s + w.totalFee, 0),
  }), [filteredWorks]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    state.works.forEach((w) => {
      const y = new Date(w.publishDate).getFullYear();
      if (!isNaN(y)) years.add(y);
    });
    const sorted = [...years].sort((a, b) => b - a);
    return sorted.length === 0 ? [new Date().getFullYear()] : sorted.slice(0, 5);
  }, [state.works]);

  const streamYears = useMemo(() => {
    return selectedYears.filter((y) => availableYears.includes(y)).length > 0
      ? selectedYears.filter((y) => availableYears.includes(y))
      : [availableYears[0]];
  }, [selectedYears, availableYears]);

  React.useEffect(() => {
    setSelectedYears((prev) => {
      if (prev.length === streamYears.length && prev.every((y, i) => y === streamYears[i])) {
        return prev;
      }
      return streamYears;
    });
  }, [streamYears]);

  const chartData = useMemo(() => {
    const stats = getMonthlyStats(streamYears);
    return MONTHS.map((name, i) => {
      const entry: Record<string, string | number> = { month: name };
      stats.forEach(({ year }) => {
        const ms = stats.find((s) => s.year === year)?.months || [];
        entry[`${year}年`] = ms[i]?.totalFee || 0;
      });
      return entry;
    });
  }, [streamYears, getMonthlyStats]);

  const chartYears = streamYears;

  const toggleYear = (year: number) => {
    setSelectedYears((prev) => {
      if (prev.includes(year)) {
        if (prev.length <= 1) return prev;
        return prev.filter((y) => y !== year);
      }
      return [...prev, year].sort();
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError('');
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let records: any[] = [];

      if (ext === 'csv') {
        const text = await file.text();
        records = parseCSV(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        records = parseExcel(buffer);
      } else {
        setImportError('不支持的文件格式，请使用 .csv 或 .xlsx 文件');
        return;
      }

      if (records.length === 0) {
        setImportError('未找到有效数据，请检查 CSV 表头是否与下载的模板一致');
        return;
      }

      await addWorksBatch(records);
    } catch (err) {
      console.error('[WorkRecord] Import failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setImportError(`导入失败：${msg}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasData = state.works.length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleImport}
        className="hidden"
      />

      <div className="flex items-center justify-between px-6 pt-6 pb-1 shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">我的作品记录</h2>
        <div className="flex items-center gap-3">
          {importError && <span className="text-xs text-red-400">{importError}</span>}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <Upload size={15} />
            {importing ? '导入中...' : '导入历史数据'}
          </button>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <Download size={15} />
            下载模板
          </button>
        </div>
      </div>

      <div className="px-6 pb-4 shrink-0">
        <div className="bg-white dark:bg-dark-50 rounded-[14px] p-4 ring-1 ring-inset ring-gray-200/60 dark:ring-dark-100/60">
          <div className="flex items-center gap-2 mb-3">
            {availableYears.map((year, i) => (
              <button
                key={year}
                onClick={() => toggleYear(year)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full transition-colors border"
                style={{
                  backgroundColor: chartYears.includes(year) ? YEAR_COLORS[i % YEAR_COLORS.length] + '16' : undefined,
                  color: chartYears.includes(year) ? YEAR_COLORS[i % YEAR_COLORS.length] : undefined,
                  borderColor: chartYears.includes(year) ? YEAR_COLORS[i % YEAR_COLORS.length] : 'rgb(229,231,235)',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: YEAR_COLORS[i % YEAR_COLORS.length] }}
                />
                {year}年
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v === 0 ? '0' : formatFee(v)} />
              <Tooltip
                formatter={((value: any, name: any) => [`¥${formatFee(Number(value) || 0)}`, String(name || '')]) as any}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
              />
              {chartYears.map((year, i) => (
                <Line
                  key={year}
                  type="monotone"
                  dataKey={`${year}年`}
                  stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="shrink-0 px-6 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {(['all', 'week', 'month', 'year'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === type
                    ? 'bg-gray-200 dark:bg-dark-100 text-gray-700 dark:text-gray-300'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-100'
                }`}
              >
                {type === 'all' ? '全部' : type === 'week' ? '本周' : type === 'month' ? '本月' : '本年'}
              </button>
            ))}
          </div>
          {hasData && (
            <button
              onClick={() => {
                setShowNewRow(true);
                setNewRow(formInit());
              }}
              className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <Plus size={15} />
              新增作品
            </button>
          )}
        </div>
      </div>

      {hasData && (
        <div className="shrink-0 px-6 pb-3 text-xs text-gray-500 dark:text-gray-400">
          {filter === 'all' ? '全部' : filter === 'week' ? '本周' : filter === 'month' ? '本月' : '本年'}作品 {stats.count} 篇，总字数 {stats.words.toLocaleString()}，总稿费 ¥{stats.fee.toLocaleString()}
        </div>
      )}

      <div className="flex-1 overflow-auto px-6 pb-4">
        <WorkRecordTable
          works={displayWorks}
          showNewRow={showNewRow}
          newRow={newRow}
          saving={saving}
          onNewRowChange={updateNewRow}
          onSaveNewRow={handleSaveRow}
          onCancelNewRow={handleCancelNewRow}
          onUpdateWork={updateWork}
          onDeleteWork={deleteWork}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

// --- CSV Parser ---

function parseCSV(text: string): any[] {
  text = text.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: any[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    rows.push(values);
  }

  return parseRows(headers, rows);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

// --- Excel Parser ---

function parseExcel(buffer: ArrayBuffer): any[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

  if (data.length < 2) return [];

  const headers = (data[0] || []).map((h: any) => String(h).trim());
  const rows = data.slice(1);

  return parseRows(headers, rows);
}
