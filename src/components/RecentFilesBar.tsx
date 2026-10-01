import React, { useState, useEffect } from 'react';
import { Clock, Download, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { getRecentFiles, removeRecentFile, clearRecentFiles, downloadCachedRecentFile, hasCachedBlob, type RecentFileRecord } from '../utils/recentFiles';
import { formatBytes } from '../utils/pdfOperations';
import type { ToolId } from '../types';

export const RecentFilesBar: React.FC = () => {
  const [recentFiles, setRecentFiles] = useState<RecentFileRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const refreshList = () => {
    setRecentFiles(getRecentFiles());
  };

  useEffect(() => {
    refreshList();
    const handleUpdate = () => refreshList();
    window.addEventListener('recent_files_updated', handleUpdate);
    return () => window.removeEventListener('recent_files_updated', handleUpdate);
  }, []);

  return (
    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 w-full overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer select-none text-left"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Derniers fichiers traités
          </span>
          {recentFiles.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
              {recentFiles.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="text-[11px] font-medium hidden sm:inline">{isOpen ? 'Masquer' : 'Afficher'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2.5">
          {recentFiles.length === 0 ? (
            <div className="p-3 text-center rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-400 italic">
              Aucun fichier traité récemment.
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearRecentFiles}
                  className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  Effacer l'historique
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recentFiles.map((file) => (
                  <div key={file.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2 shadow-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[11px] font-medium text-slate-500 truncate">{file.toolName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">{formatBytes(file.size)}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      {hasCachedBlob(file.id) ? (
                        <button type="button" onClick={() => downloadCachedRecentFile(file.id, file.name)} className="inline-flex items-center gap-1 text-rose-600 font-semibold cursor-pointer">
                          <Download className="w-3 h-3" />
                          <span>Télécharger</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Prêt</span>
                      )}
                      <button type="button" onClick={() => removeRecentFile(file.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
