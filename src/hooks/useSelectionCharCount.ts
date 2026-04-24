import { useState, useEffect } from 'react';

/**
 * 监听文本选区变化，返回选中文本的字数
 */
export function useSelectionCharCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleSelectionChange = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim() ?? '';
        setCount(text.length);
      }, 150);
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return count;
}
