import React from 'react';

interface StatusBarProps {
  totalChars: number;
  selectionChars: number;
  leftContent?: React.ReactNode;
  rightPrefix?: React.ReactNode;
}

export function StatusBar({ totalChars, selectionChars, leftContent, rightPrefix }: StatusBarProps) {
  return (
    <footer className="h-8 border-t border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-50 flex items-center px-4 text-xs text-gray-400 dark:text-gray-600 shrink-0">
      {leftContent && <div className="flex-1 flex items-center">{leftContent}</div>}
      <div className="flex items-center gap-1.5">
        {rightPrefix && <>{rightPrefix}<span>·</span></>}
        {totalChars > 0 && (
          <>
            <span>{totalChars} 字</span>
            {selectionChars > 0 && (
              <>
                <span>·</span>
                <span>选中 {selectionChars} 字</span>
              </>
            )}
          </>
        )}
      </div>
    </footer>
  );
}
