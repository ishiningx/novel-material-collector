import React, { useCallback, useRef, useState, useLayoutEffect, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { Highlight, HighlightColor } from '../../types';
import { HIGHLIGHT_COLOR_MAP } from '../../types';
import { renderHighlightedContent, getCharacterOffsets, type TextSegment } from '../../services/highlightRenderer';
import { ColorPicker } from './ColorPicker';

interface HighlightedTextProps {
  content: string;
  highlights: Highlight[];
  /** Ranges that have been collected into the material library; rendered with a dotted underline. */
  materialRanges?: { start: number; end: number }[];
  onAddHighlight: (startOffset: number, endOffset: number, color: HighlightColor) => void;
  onRemoveHighlight: (highlightId: string) => void;
  onHighlightPositionsUpdate: (positions: Map<string, number>) => void;
  onScroll?: (scrollTop: number) => void;
  onContextMenu?: (e: React.MouseEvent, selectedText: string) => void;
  fontFamily?: string;
  fontSize?: number;
}

export function HighlightedText({
  content,
  highlights,
  materialRanges,
  onAddHighlight,
  onRemoveHighlight,
  onHighlightPositionsUpdate,
  onScroll,
  onContextMenu,
  fontFamily,
  fontSize,
}: HighlightedTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [colorPickerPos, setColorPickerPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{ start: number; end: number } | null>(null);
  const [hoveredHighlightId, setHoveredHighlightId] = useState<string | null>(null);
  const hideHoverTimerRef = useRef<number | null>(null);

  const cancelHideHover = useCallback(() => {
    if (hideHoverTimerRef.current !== null) {
      window.clearTimeout(hideHoverTimerRef.current);
      hideHoverTimerRef.current = null;
    }
  }, []);

  const scheduleHideHover = useCallback(() => {
    cancelHideHover();
    hideHoverTimerRef.current = window.setTimeout(() => {
      setHoveredHighlightId(null);
      hideHoverTimerRef.current = null;
    }, 500);
  }, [cancelHideHover]);

  useEffect(() => {
    return () => cancelHideHover();
  }, [cancelHideHover]);

  // Render text segments (segmentation is driven by highlight boundaries)
  const rawSegments = renderHighlightedContent(content, highlights);

  // Secondary segmentation: also split at material-range boundaries so we can
  // mark each resulting segment with an `isMaterial` flag independently.
  type RichSegment = TextSegment & { isMaterial: boolean };
  const segments: RichSegment[] = useMemo(() => {
    const ranges = (materialRanges || []).filter((r) => r.end > r.start);
    if (ranges.length === 0) {
      return rawSegments.map((s) => ({ ...s, isMaterial: false }));
    }
    const boundarySet = new Set<number>();
    ranges.forEach((r) => {
      boundarySet.add(r.start);
      boundarySet.add(r.end);
    });
    const result: RichSegment[] = [];
    rawSegments.forEach((seg) => {
      const inner = Array.from(boundarySet)
        .filter((b) => b > seg.start && b < seg.end)
        .sort((a, b) => a - b);
      const pts = [seg.start, ...inner, seg.end];
      for (let i = 0; i < pts.length - 1; i++) {
        const s = pts[i];
        const e = pts[i + 1];
        if (s === e) continue;
        const mid = (s + e) / 2;
        const isMaterial = ranges.some((r) => mid >= r.start && mid < r.end);
        result.push({
          start: s,
          end: e,
          text: content.substring(s, e),
          activeHighlights: seg.activeHighlights,
          inactiveHighlights: seg.inactiveHighlights,
          isMaterial,
        });
      }
    });
    return result;
  }, [rawSegments, materialRanges, content]);

  // Compute the last segment index for each active highlight id, so the cancel
  // button is only rendered right after the last character of the highlight.
  const lastSegmentIdxByHighlightId = useMemo(() => {
    const map = new Map<string, number>();
    segments.forEach((seg, idx) => {
      seg.activeHighlights.forEach((h) => map.set(h.id, idx));
    });
    return map;
  }, [segments]);

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
  const renderSegment = (segment: RichSegment, index: number) => {
    if (
      segment.activeHighlights.length === 0 &&
      segment.inactiveHighlights.length === 0 &&
      !segment.isMaterial
    ) {
      return <span key={index}>{segment.text}</span>;
    }
    if (
      segment.activeHighlights.length === 0 &&
      segment.inactiveHighlights.length === 0 &&
      segment.isMaterial
    ) {
      return (
        <span
          key={index}
          className="underline decoration-wavy decoration-gray-300 dark:decoration-gray-500 decoration-1 underline-offset-[3px]"
        >
          {segment.text}
        </span>
      );
    }

    const primaryHighlight = segment.activeHighlights.length > 0
      ? segment.activeHighlights[segment.activeHighlights.length - 1]
      : null;

    const highlightIds = segment.activeHighlights.map((h) => h.id).join(',');
    const isHovered = segment.activeHighlights.some((h) => h.id === hoveredHighlightId);
    const bgClass = primaryHighlight ? HIGHLIGHT_COLOR_MAP[primaryHighlight.color].bg : '';
    const materialCls = segment.isMaterial
      ? 'underline decoration-wavy decoration-gray-300 dark:decoration-gray-500 decoration-1 underline-offset-[3px]'
      : '';
    const isLastSegmentOfPrimary =
      !!primaryHighlight && lastSegmentIdxByHighlightId.get(primaryHighlight.id) === index;

    return (
      <span
        key={index}
        data-highlight-ids={highlightIds}
        className={`relative inline ${bgClass} ${materialCls} ${isHovered ? 'ring-1 ring-gray-400/30 rounded-sm' : ''} transition-all`}
        onMouseEnter={() => {
          if (segment.activeHighlights.length > 0) {
            cancelHideHover();
            setHoveredHighlightId(segment.activeHighlights[segment.activeHighlights.length - 1].id);
          }
        }}
        onMouseLeave={() => scheduleHideHover()}
      >
        {segment.text}
        {/* Cancel button pinned right after the last character of the highlight */}
        {isHovered && primaryHighlight && isLastSegmentOfPrimary && (
          <button
            className="inline-flex items-center justify-center align-middle ml-0.5 w-4 h-4 bg-gray-400/70 hover:bg-red-500 text-white rounded-full cursor-pointer transition-colors"
            onMouseEnter={() => cancelHideHover()}
            onMouseLeave={() => scheduleHideHover()}
            onClick={(e) => {
              e.stopPropagation();
              cancelHideHover();
              onRemoveHighlight(primaryHighlight.id);
              setHoveredHighlightId(null);
            }}
            title="取消高亮"
          >
            <X size={9} strokeWidth={2.5} />
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
          <div
            className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap"
            style={{
              fontFamily: fontFamily || undefined,
              fontSize: fontSize ? `${fontSize}px` : undefined,
            }}
          >
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
