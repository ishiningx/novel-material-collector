import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { WorkRecord } from '../types';

interface WorkRecordModalProps {
  visible: boolean;
  work: WorkRecord | null;
  onConfirm: (data: Omit<WorkRecord, 'id' | 'createdAt' | 'updatedAt' | 'totalFee'>) => void;
  onUpdate: (work: WorkRecord) => void;
  onClose: () => void;
  saving?: boolean;
}

const EMPTY: Omit<WorkRecord, 'id' | 'createdAt' | 'updatedAt' | 'totalFee'> = {
  name: '',
  wordCount: 0,
  platform: '',
  publishDate: new Date().toISOString().split('T')[0],
  guaranteeFee: undefined,
  shareFee: undefined,
  fullAttendance: undefined,
  copyright: undefined,
  data: '',
  hypothesis: '',
  verificationResult: '',
};

export function WorkRecordModal({
  visible,
  work,
  onConfirm,
  onUpdate,
  onClose,
  saving,
}: WorkRecordModalProps) {
  const [form, setForm] = useState(EMPTY);
  const isEdit = !!work;

  useEffect(() => {
    if (!visible) return;
    if (work) {
      setForm({
        name: work.name,
        wordCount: work.wordCount,
        platform: work.platform,
        publishDate: work.publishDate,
        guaranteeFee: work.guaranteeFee,
        shareFee: work.shareFee,
        fullAttendance: work.fullAttendance,
        copyright: work.copyright,
        data: work.data,
        hypothesis: work.hypothesis,
        verificationResult: work.verificationResult,
      });
    } else {
      setForm(EMPTY);
    }
  }, [visible, work?.id]);

  if (!visible) return null;

  const canSubmit = form.name.trim() && form.platform.trim();

  const set = (key: string, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = () => {
    if (isEdit && work) {
      const { totalFee, ...rest } = work;
      onUpdate({ ...rest, ...form, totalFee: 0, updatedAt: '' });
    } else {
      onConfirm(form);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-dark-50 rounded-[14px] shadow-2xl w-[520px] max-h-[85vh] animate-modal-in overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-dark-100 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {isEdit ? '编辑作品' : '添加作品'}
          </h3>
          <button onClick={onClose} className="btn-ghost-icon">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">作品名</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="作品名"
                className="w-full text-sm px-3 py-2 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">字数</label>
              <input
                type="number"
                value={form.wordCount || ''}
                onChange={(e) => set('wordCount', Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full text-sm px-3 py-2 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">平台</label>
              <input
                type="text"
                value={form.platform}
                onChange={(e) => set('platform', e.target.value)}
                placeholder="如：番茄、七猫"
                className="w-full text-sm px-3 py-2 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">发布日期</label>
              <input
                type="date"
                value={form.publishDate}
                onChange={(e) => set('publishDate', e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">保底稿费</label>
              <input
                type="number"
                value={form.guaranteeFee ?? ''}
                onChange={(e) => set('guaranteeFee', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="可不填"
                className="w-full text-sm px-3 py-2 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">分成稿费</label>
              <input
                type="number"
                value={form.shareFee ?? ''}
                onChange={(e) => set('shareFee', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="可不填"
                className="w-full text-sm px-3 py-2 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">全勤</label>
              <input
                type="number"
                value={form.fullAttendance ?? ''}
                onChange={(e) => set('fullAttendance', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="可不填"
                className="w-full text-sm px-3 py-2 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">版权</label>
              <input
                type="number"
                value={form.copyright ?? ''}
                onChange={(e) => set('copyright', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="可不填"
                className="w-full text-sm px-3 py-2 rounded-full ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">数据 <span className="text-gray-400">（文本字段）</span></label>
            <textarea
              rows={2}
              value={form.data}
              onChange={(e) => set('data', e.target.value)}
              placeholder="留空"
              className="w-full text-sm px-3 py-2 rounded-[14px] ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">想要验证的假设</label>
            <textarea
              rows={2}
              value={form.hypothesis}
              onChange={(e) => set('hypothesis', e.target.value)}
              placeholder="想要验证的假设"
              className="w-full text-sm px-3 py-2 rounded-[14px] ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">验证结果</label>
            <textarea
              rows={2}
              value={form.verificationResult}
              onChange={(e) => set('verificationResult', e.target.value)}
              placeholder="验证结果"
              className="w-full text-sm px-3 py-2 rounded-[14px] ring-1 ring-inset ring-gray-200 dark:ring-dark-100 bg-white dark:bg-dark text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/30 resize-none"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-100/60 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="btn-ghost">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className={`btn-primary ${canSubmit && !saving ? '' : 'opacity-50 cursor-not-allowed'}`}
          >
            {saving ? '保存中...' : isEdit ? '保存修改' : '添加作品'}
          </button>
        </div>
      </div>
    </>
  );
}
