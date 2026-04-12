import React, { useEffect, useRef } from 'react';
import type { HighlightColor } from '../../types';
import { HIGHLIGHT_COLOR_CIRCLE } from '../../types';

const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'orange', 'purple'];

const COLOR_LABELS: Record<HighlightColor, string> = {
  yellow: '黄色',
  green: '绿色',
  blue: '蓝色',
  pink: '粉色',
  orange: '橙色',
  purple: '紫色',
};

interface ColorPickerProps {
  position: { x: number; y: number } | null;
  onSelect: (color: HighlightColor) => void;
  onClose: () => void;
}

export function ColorPicker({ position, onSelect, onClose }: ColorPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!position) return null;

  // Adjust position to keep picker within viewport
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const pickerWidth = 220;
  const pickerHeight = 52;

  let x = position.x;
  let y = position.y;

  if (x + pickerWidth > viewportWidth - 20) {
    x = viewportWidth - pickerWidth - 20;
  }
  if (y + pickerHeight > viewportHeight - 20) {
    y = y - pickerHeight - 10;
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white dark:bg-dark-50 rounded-xl shadow-xl border border-gray-200 dark:border-dark-100 px-3 py-2 animate-fade-in"
      style={{ left: x, top: y }}
    >
      <div className="flex items-center gap-2">
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onSelect(color)}
            className="w-8 h-8 rounded-full transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/30"
            style={{ backgroundColor: 'var(--tw-gradient-stops)' }}
            title={COLOR_LABELS[color]}
          >
            <div className={`w-full h-full rounded-full ${HIGHLIGHT_COLOR_CIRCLE[color]} border-2 border-white dark:border-dark-50 shadow-sm`} />
          </button>
        ))}
      </div>
    </div>
  );
}
