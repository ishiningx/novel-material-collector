import React, { useCallback, useRef, useState, useLayoutEffect, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Highlight, HighlightColor } from '../../types';
import { HIGHLIGHT_COLOR_MAP } from '../../types';
import { renderHighlightedContent, getCharacterOffsets, type TextSegment } from '../../services/highlightRenderer';
import { ColorPicker } from './ColorPicker';

interface HighlightedTextProps {
  content: string;
  highlights: Highlight[];
  onAddHighlight: (startOffset: number, endOffset: number, color: HighlightColor) => void;
  onRemoveHighlight: (highlightId: string) => void;
  onHighlightPositionsUpdate: (positions: Map<string, number>) => void;
  onScroll?: (scrollTop: number) => void;
  onContextMenu?: (e: React.MouseEvent, selectedText: string) => void;
}

export function HighlightedText({
  content,
  highlights,
  onAddHighlight,
  onRemoveHighlight,
  onHighlightPositionsUpdate,
  onScroll,
  onContextMenu,
}: HighlightedTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [colorPickerPos, setColorPickerPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{ start: number; end: number } | null>(null);
  const [hoveredHighlightId, setHoveredHighlightId] = useState<string | null>(null);

  // Render text segments
  const segments = renderHighlightedContent(content, highlights);

  // Measure highlight positions relative to scroll container top
  const measurePositions = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const scrollTop = containerRef.current.scrollTop;
    const positionMap = new Map<string, number>();
    const spans = containerRef.current.querySelectorAll('[data-highlight-ids]');

    spans.forEach((span) => {
      const el = span as HTMLElement;
      const ids = el.dataset.highlightIds?.split(',').filter(Boolean) || [];
      if (ids.length === 0) return;

      // Calculate position relative to the scroll content top
      const spanRect = el.getBoundingClientRect();
      const top = spanRect.top - containerRect.top + scrollTop;

      const firstId = ids[0];
      if (!positionMap.has(firstId)) {
        positionMap.set(firstId, top);
      }
    });

    onHighlightPositionsUpdate(positionMap);
  }, [onHighlightPositionsUpdate]);

  useLayoutEffect(() => {
    measurePositions();
  }, [highlights, measurePositions]);

  // Remeasure on resize
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      measurePositions();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [measurePositions]);

  // Text selection → show color picker
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || !containerRef.current) return;

      const offsets = getCharacterOffsets(selection, containerRef.current);
      if (!offsets) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setPendingSelection(offsets);
      setColorPickerPos({
        x: rect.left + rect.width / 2 - 110,
        y: rect.bottom + 8,
      });
    },
    []
  );

  // Color selected → create highlight
  const handleColorSelect = useCallback(
    (color: HighlightColor) => {
      if (pendingSelection) {
        onAddHighlight(pendingSelection.start, pendingSelection.end, color);
        setPendingSelection(null);
        setColorPickerPos(null);
        window.getSelection()?.removeAllRanges();
      }
    },
    [pendingSelection, onAddHighlight]
  );

  // Close color picker
  const handleCloseColorPicker = useCallback(() => {
    setColorPickerPos(null);
    setPendingSelection(null);
  }, []);

  // Right-click for material collection
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!onContextMenu) return;
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 0) {
        e.preventDefault();
        onContextMenu(e, text);
      }
    },
    [onContextMenu]
  );

  // Render a text segment
  const renderSegment = (segment: TextSegment, index: number) => {
    if (segment.activeHighlights.length === 0 && segment.inactiveHighlights.length === 0) {
      return <span key={index}>{segment.text}</span>;
    }

    const primaryHighlight = segment.activeHighlights.length > 0
      ? segment.activeHighlights[segment.activeHighlights.length - 1]
      : null;

    const highlightIds = segment.activeHighlights.map((h) => h.id).join(',');
    const isHovered = segment.activeHighlights.some((h) => h.id === hoveredHighlightId);
    const bgClass = primaryHighlight ? HIGHLIGHT_COLOR_MAP[primaryHighlight.color].bg : '';

    return (
      <span
        key={index}
        data-highlight-ids={highlightIds}
        className={`relative inline ${bgClass} ${isHovered ? 'ring-1 ring-gray-400/30 rounded-sm' : ''} transition-all`}
        onMouseEnter={() => {
          if (segment.activeHighlights.length > 0) {
            setHoveredHighlightId(segment.activeHighlights[segment.activeHighlights.length - 1].id);
          }
        }}
        onMouseLeave={() => setHoveredHighlightId(null)}
      >
        {segment.text}
        {/* Cancel button on hover - always on right side */}
        {isHovered && primaryHighlight && (
          <button
            className="absolute right-0 -top-3 w-4 h-4 bg-gray-400/60 hover:bg-gray-500/80 text-white rounded-full flex items-center justify-center text-xs leading-none opacity-60 hover:opacity-100 transition-opacity z-10"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveHighlight(primaryHighlight.id);
              setHoveredHighlightId(null);
            }}
            title="取消高亮"
          >
            <X size={8} />
          </button>
        )}
      </span>
    );
  };

  return (
    <>
      <div
        ref={containerRef}
        className="h-full overflow-y-auto p-8 bg-surface dark:bg-dark cursor-text select-text"
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onScroll={(e) => {
          onScroll?.(e.currentTarget.scrollTop);
          // Remeasure on scroll for real-time position sync
          measurePositions();
        }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {segments.map((segment, index) => renderSegment(segment, index))}
          </div>
        </div>
      </div>

      <ColorPicker
        position={colorPickerPos}
        onSelect={handleColorSelect}
        onClose={handleCloseColorPicker}
      />
    </>
  );
}
