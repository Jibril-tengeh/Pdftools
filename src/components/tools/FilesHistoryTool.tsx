import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  Download,
  FileText,
  FileArchive,
  FileImage,
  Clock,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { getRecentFiles, clearRecentFiles, type RecentFileRecord } from '../../utils/recentFiles';

export const FilesHistoryTool: React.FC = () => {
  const [files, setFiles] = useState<RecentFileRecord[]>([]);

  useEffect(() => {
    setFiles(getRecentFiles());
  }, []);

  const handleClear = () => {
    if (confirm('Voulez-vous réinitialiser l’historique des fichiers traités ?')) {
      clearRecentFiles();
      setFiles([]);
    }
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-2xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Historique & Coffre-fort Local
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  Stockage session
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consultez la liste des documents, images et médias traités durant votre session de travail.
              </p>
            </div>
          </div>

          {files.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vider l'historique</span>
            </button>
          )}
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Aucun fichier traité pour le moment
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Utilisez les outils PDF, Image ou Vidéo pour commencer à traiter et sauvegarder vos créations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="text-[11px] text-slate-400 font-semibold">Total Fichiers</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{files.length}</div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="text-[11px] text-slate-400 font-semibold">Volume Traité</div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {(totalSize / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs col-span-2 sm:col-span-1">
              <div className="text-[11px] text-slate-400 font-semibold">Sécurité Locale</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">100% Mémoire</div>
            </div>
          </div>

          {/* List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
            {files.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{item.toolName}</span>
                      <span>·</span>
                      <span className="font-mono">{(item.size / 1024).toFixed(1)} KB</span>
                      <span>·</span>
                      <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold">
                    Traité
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
