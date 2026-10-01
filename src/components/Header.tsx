import React from 'react';
import { FileText, Sun, Moon } from 'lucide-react';
import type { ToolId } from '../types';

interface HeaderProps {
  currentTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTool,
  onSelectTool,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs w-full overflow-hidden">
      <div className="w-full px-3.5 h-14 flex items-center justify-between">
        <button
          onClick={() => onSelectTool('home')}
          className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            PDF Tools
          </span>
        </button>

        {onToggleDarkMode && (
          <button
            type="button"
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-amber-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:scale-95 shrink-0"
            aria-label="Basculer le mode sombre"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}
      </div>
    </header>
  );
};
