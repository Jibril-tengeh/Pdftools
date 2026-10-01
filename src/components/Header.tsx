import React from 'react';
import { FileText, ShieldCheck, Sparkles, Sun, Moon } from 'lucide-react';
import type { ToolId } from '../types';

interface HeaderProps {
  currentTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  onGenerateSample: () => void;
  isGeneratingSample: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTool,
  onSelectTool,
  onGenerateSample,
  isGeneratingSample,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const navItems: { id: ToolId; label: string }[] = [
    { id: 'merge', label: 'Fusionner' },
    { id: 'split', label: 'Diviser' },
    { id: 'compress', label: 'Compresser' },
    { id: 'images-to-pdf', label: 'Images en PDF' },
    { id: 'qr', label: 'QR Code' },
    { id: 'yt-thumbnail-extractor', label: 'Miniatures YouTube' },
    { id: 'universal-converter', label: 'Convertisseur' },
    { id: 'video-trim', label: 'Vidéo' },
    { id: 'viewer', label: 'Visionneuse & OCR' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-6 shrink-0">
          <button
            onClick={() => onSelectTool('home')}
            className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              PDF & Media Studio
            </span>
          </button>
        </div>

        {/* Zone 2: Clean navigation links */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
          <button
            onClick={() => onSelectTool('home')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              currentTool === 'home'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Tous les outils
          </button>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTool(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                currentTool === item.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1-2 primary actions + Dark Mode Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Dark Mode Toggle Button */}
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-amber-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 transition-all cursor-pointer shadow-2xs active:scale-95"
              aria-label="Basculer mode sombre / clair"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={onGenerateSample}
            disabled={isGeneratingSample}
            title="Créer un fichier PDF de démonstration pour tester immédiatement"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{isGeneratingSample ? 'Création...' : 'Exemple de test'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 px-2.5 py-1.5 rounded-xl shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold whitespace-nowrap">100% Local</span>
          </div>
        </div>
      </div>
    </header>
  );
};
