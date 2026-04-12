import type { Highlight, Comment } from '../types';

// A segment of text, potentially covered by one or more highlights
export interface TextSegment {
  start: number;
  end: number;
  text: string;
  activeHighlights: Highlight[];
  inactiveHighlights: Highlight[];
}

// Result of aligning a comment
export interface AlignedComment {
  comment: Comment;
  desiredTop: number;
  actualTop: number;
  estimatedHeight: number;
  isOrphaned: boolean;
}

const MIN_COMMENT_HEIGHT = 60;
const COMMENT_GAP = 8;

/**
 * Split text into segments based on highlight boundaries.
 * Each segment knows which highlights cover it.
 */
export function renderHighlightedContent(
  content: string,
  highlights: Highlight[]
): TextSegment[] {
  if (highlights.length === 0) {
    return [{
      start: 0,
      end: content.length,
      text: content,
      activeHighlights: [],
      inactiveHighlights: [],
    }];
  }

  // Collect all boundary points
  const boundaries = new Set<number>([0, content.length]);
  for (const h of highlights) {
    boundaries.add(Math.max(0, h.startOffset));
    boundaries.add(Math.min(content.length, h.endOffset));
  }

  // Sort and deduplicate
  const sorted = [...boundaries].sort((a, b) => a - b);

  // Generate segments
  const segments: TextSegment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start === end) continue;

    const text = content.substring(start, end);
    const activeHighlights = highlights.filter(
      (h) => h.isActive && h.startOffset <= start && h.endOffset >= end
    );
    const inactiveHighlights = highlights.filter(
      (h) => !h.isActive && h.startOffset <= start && h.endOffset >= end
    );

    segments.push({ start, end, text, activeHighlights, inactiveHighlights });
  }

  return segments;
}

/**
 * Align comments to avoid overlapping.
 * Uses a greedy algorithm: process comments in order of desired position,
 * push down if overlapping with the previous comment.
 */
export function alignComments(
  comments: Comment[],
  positionMap: Map<string, number>,
  scrollTop: number,
  containerTop: number = 0
): AlignedComment[] {
  const results: AlignedComment[] = [];

  // Build list with desired positions
  const withPositions = comments.map((comment) => {
    const pos = positionMap.get(comment.highlightId);
    return {
      comment,
      desiredTop: pos !== undefined ? pos - scrollTop - containerTop : -1,
      isOrphaned: pos === undefined,
    };
  });

  // Sort: non-orphaned by desired position, orphaned at end
  const nonOrphaned = withPositions
    .filter((c) => !c.isOrphaned)
    .sort((a, b) => a.desiredTop - b.desiredTop);
  const orphaned = withPositions.filter((c) => c.isOrphaned);

  // Greedy stacking for non-orphaned
  let nextAvailableTop = 0;
  for (const item of nonOrphaned) {
    const estimatedHeight = estimateCommentHeight(item.comment.text);
    const actualTop = Math.max(item.desiredTop, nextAvailableTop);

    results.push({
      comment: item.comment,
      desiredTop: item.desiredTop,
      actualTop,
      estimatedHeight,
      isOrphaned: false,
    });

    nextAvailableTop = actualTop + estimatedHeight + COMMENT_GAP;
  }

  // Orphaned comments stack at the bottom
  for (const item of orphaned) {
    const estimatedHeight = estimateCommentHeight(item.comment.text);
    results.push({
      comment: item.comment,
      desiredTop: -1,
      actualTop: nextAvailableTop,
      estimatedHeight,
      isOrphaned: true,
    });
    nextAvailableTop += estimatedHeight + COMMENT_GAP;
  }

  return results;
}

/**
 * Estimate the rendered height of a comment based on text length.
 */
function estimateCommentHeight(text: string): number {
  if (!text) return MIN_COMMENT_HEIGHT;
  const lines = Math.ceil(text.length / 20); // ~20 chars per line
  return Math.max(MIN_COMMENT_HEIGHT, lines * 22 + 32); // 22px per line + 32px padding
}

/**
 * Compute character offsets of a DOM Selection within a container element.
 * Returns null if selection is outside the container or empty.
 */
export function getCharacterOffsets(
  selection: Selection,
  container: HTMLElement
): { start: number; end: number } | null {
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  if (range.collapsed) return null;

  // Create a range from container start to selection start
  const preRange = document.createRange();
  preRange.setStart(container, 0);
  preRange.setEnd(range.startContainer, range.startOffset);

  // Measure text content length to get offset
  const startOffset = getTextLength(preRange.toString());
  const selectedText = range.toString();
  const endOffset = startOffset + getTextLength(selectedText);

  if (startOffset === endOffset) return null;

  return { start: startOffset, end: endOffset };
}

/**
 * Get actual character count (treating CRLF as single char).
 */
function getTextLength(text: string): number {
  return text.replace(/\r\n/g, '\n').length;
}
