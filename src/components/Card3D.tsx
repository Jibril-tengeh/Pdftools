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
      className="w-full rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between select-none"
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text}`}
          >
            <Icon className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {category}
            </span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
            {name}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
          100% Local
        </span>
        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
          Ouvrir →
        </span>
      </div>
    </div>
  );
};
