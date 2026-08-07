// 长篇小说分页工具：按字符数切页，尽量落在段落边界

/** 单页字符数上限（约 2 屏阅读量） */
export const LONG_FORM_CHARS_PER_PAGE = 8000;

/** 超过该字符数视为长篇小说，启用分页阅读模式 */
export const LONG_FORM_THRESHOLD = 50000;

/**
 * 计算每页起始 offset 列表（含第 0 页起点）。
 * 例如 [0, 8123, 16007, ...] 表示第 0 页从 0 开始、第 1 页从 8123 开始……
 * 页数 = boundaries.length - 1，最后一项恒为 content.length。
 */
export function buildPageBoundaries(content: string, charsPerPage = LONG_FORM_CHARS_PER_PAGE): number[] {
  const boundaries: number[] = [0];
  const length = content.length;
  let start = 0;

  while (start < length) {
    let end = Math.min(start + charsPerPage, length);
    if (end < length) {
      // 尽量在段落边界切分：从 end 向前找最近的换行（最多回退 500 字符）
      const searchStart = Math.max(start, end - 500);
      const newlineIdx = content.lastIndexOf('\n', end - 1);
      if (newlineIdx >= searchStart) {
        end = newlineIdx + 1;
      }
    }
    boundaries.push(end);
    start = end;
  }

  // 空内容兜底：至少一页
  if (boundaries.length === 1) {
    boundaries.push(0);
  }
  return boundaries;
}

/**
 * 二分查找 offset 所在页（0 起）。
 * 找到最后一个 <= offset 的 boundary 的索引；越界时夹取到合法范围。
 */
export function findPageForOffset(boundaries: number[], offset: number): number {
  if (boundaries.length === 0) return 0;
  let lo = 0;
  let hi = boundaries.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (boundaries[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  // lo 是最后一个 <= offset 的 boundary；offset 位于该页起始与其后之间
  const page = lo < boundaries.length - 1 ? lo : boundaries.length - 2;
  return Math.max(0, page);
}
