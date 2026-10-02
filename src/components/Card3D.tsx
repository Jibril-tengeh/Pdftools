import React from 'react';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import type { ToolId } from '../types';

interface Card3DProps {
  id: ToolId;
  name: string;
  description: string;
  category: string;
  icon: LucideIcon;
  colorTheme: {
    text: string;
    bg: string;
    border: string;
    glow: string;
  };
  index: number;
  onSelect: (id: ToolId) => void;
}

export const Card3D: React.FC<Card3DProps> = ({
  id,
  name,
  description,
  category,
  icon: Icon,
  colorTheme,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(id)}
      className="w-full rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between select-none group"
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text}`}
          >
            <Icon className="w-5 h-5" />
          </div>

          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
            {category}
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
            {name}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 w-full">
        <button
          type="button"
          className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <span>Ouvrir</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
