import React, { useState, useEffect } from 'react';
import {
  Clock,
  Download,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Layers,
  PenTool,
  Hash,
  Minimize2,
  X,
  Sparkles,
} from 'lucide-react';
import {
  getRecentFiles,
  removeRecentFile,
  clearRecentFiles,
  downloadCachedRecentFile,
  hasCachedBlob,
  getCachedArrayBuffer,
  openPdfInTool,
  type RecentFileRecord,
} from '../utils/recentFiles';
import { formatBytes } from '../utils/pdfOperations';
import type { ToolId } from '../types';

export const RecentFilesBar: React.FC = () => {
  const [recentFiles, setRecentFiles] = useState<RecentFileRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeModalFile, setActiveModalFile] = useState<RecentFileRecord | null>(null);

  const refreshList = () => {
    setRecentFiles(getRecentFiles());
  };

  useEffect(() => {
    refreshList();
    const handleUpdate = () => refreshList();
    window.addEventListener('recent_files_updated', handleUpdate);
    return () => window.removeEventListener('recent_files_updated', handleUpdate);
  }, []);

  const handleOpenTool = async (toolId: ToolId) => {
    if (!activeModalFile) return;
    const buffer = await getCachedArrayBuffer(activeModalFile.id);
    if (buffer) {
      openPdfInTool(toolId, buffer, activeModalFile.name);
      setActiveModalFile(null);
    }
  };

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
                  <div
                    key={file.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2.5 shadow-xs"
                  >
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

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {hasCachedBlob(file.id) && (
                          <>
                            {/* Bouton Modifier ou Ajouter */}
                            <button
                              type="button"
                              onClick={() => setActiveModalFile(file)}
                              className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors cursor-pointer text-[11px]"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                              <span>Modifier ou Ajouter</span>
                            </button>

                            {/* Bouton Télécharger */}
                            <button
                              type="button"
                              onClick={() => downloadCachedRecentFile(file.id, file.name)}
                              className="inline-flex items-center gap-1 py-1 px-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer text-[11px]"
                            >
                              <Download className="w-3 h-3" />
                              <span>Télécharger</span>
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeRecentFile(file.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer ml-auto"
                        title="Supprimer"
                      >
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

      {/* MODAL MODIFIER OU AJOUTER UN PDF */}
      {activeModalFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Modifier ou Enrichir
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
                    {activeModalFile.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalFile(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Que souhaitez-vous faire avec ce document ?
              </p>

              {/* Action 1 : Modifier & Réorganiser les pages */}
              <button
                type="button"
                onClick={() => handleOpenTool('organize')}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3 transition-colors text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                    Modifier les pages (Organiser)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Pivoter, déplacer, réordonner ou supprimer des pages
                  </div>
                </div>
              </button>

              {/* Action 2 : Ajouter d'autres documents / Fusionner */}
              <button
                type="button"
                onClick={() => handleOpenTool('merge')}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3 transition-colors text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                    Ajouter d'autres PDF (Fusionner)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Ajouter d'autres documents à la suite de celui-ci
                  </div>
                </div>
              </button>

              {/* Action 3 : Signer */}
              <button
                type="button"
                onClick={() => handleOpenTool('sign')}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3 transition-colors text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                  <PenTool className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    Signer ou Annoter
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Apposer une signature manuscrite ou un texte
                  </div>
                </div>
              </button>

              {/* Action 4 : Numéroter */}
              <button
                type="button"
                onClick={() => handleOpenTool('page-numbers')}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3 transition-colors text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                  <Hash className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                    Numéroter les pages
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Ajouter des numéros en bas ou en haut des pages
                  </div>
                </div>
              </button>

              {/* Action 5 : Compresser */}
              <button
                type="button"
                onClick={() => handleOpenTool('compress')}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3 transition-colors text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center shrink-0">
                  <Minimize2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                    Compresser le document
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Réduire le poids en Ko/Mo du fichier
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
