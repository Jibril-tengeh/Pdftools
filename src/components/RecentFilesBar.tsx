import React, { useState, useEffect } from 'react';
import { Clock, Download, Trash2, FileText } from 'lucide-react';
import { getRecentFiles, removeRecentFile, clearRecentFiles, downloadCachedRecentFile, hasCachedBlob, type RecentFileRecord } from '../utils/recentFiles';
import { formatBytes } from '../utils/pdfOperations';
import type { ToolId } from '../types';

interface RecentFilesBarProps {
  onOpenTool?: (toolId: ToolId) => void;
}

export const RecentFilesBar: React.FC<RecentFilesBarProps> = () => {
  const [recentFiles, setRecentFiles] = useState<RecentFileRecord[]>([]);

  const refreshList = () => {
    setRecentFiles(getRecentFiles());
  };

  useEffect(() => {
    refreshList();
    const handleUpdate = () => refreshList();
    window.addEventListener('recent_files_updated', handleUpdate);
    return () => window.removeEventListener('recent_files_updated', handleUpdate);
  }, []);

  if (recentFiles.length === 0) {
    return (
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 flex flex-col gap-1 w-full overflow-hidden">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-medium">Fichiers récents</span>
        </div>
        <p className="text-[11px] italic text-slate-400">Aucun fichier récent pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Fichiers récents</span>
        </div>
        <button
          type="button"
          onClick={clearRecentFiles}
          className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors"
        >
          Effacer
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {recentFiles.map((file) => (
          <div
            key={file.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2 shadow-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-medium text-slate-500 truncate">
                  {file.toolName}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                  {formatBytes(file.size)}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {file.name}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              {hasCachedBlob(file.id) ? (
                <button
                  type="button"
                  onClick={() => downloadCachedRecentFile(file.id, file.name)}
                  className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold"
                >
                  <Download className="w-3 h-3" />
                  <span>Télécharger</span>
                </button>
              ) : (
                <span className="text-[10px] text-slate-400">Prêt</span>
              )}
              <button
                type="button"
                onClick={() => removeRecentFile(file.id)}
                className="text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
