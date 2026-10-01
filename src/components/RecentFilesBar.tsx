import React, { useState, useEffect } from 'react';
import {
  Clock,
  Download,
  Trash2,
  FileText,
  Layers,
  Scissors,
  RotateCw,
  Crop,
  Image as ImageIcon,
  Stamp,
  PenTool,
  SlidersHorizontal,
  Archive,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import {
  getRecentFiles,
  removeRecentFile,
  clearRecentFiles,
  downloadCachedRecentFile,
  hasCachedBlob,
  type RecentFileRecord,
} from '../utils/recentFiles';
import { formatBytes } from '../utils/pdfOperations';
import type { ToolId } from '../types';

interface RecentFilesBarProps {
  onOpenTool?: (toolId: ToolId) => void;
}

export const RecentFilesBar: React.FC<RecentFilesBarProps> = ({ onOpenTool }) => {
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
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
          <span>Historique des 5 derniers fichiers traités</span>
        </div>
        <span className="italic">Aucun fichier récent pour le moment. Traitez un document pour le voir apparaître ici.</span>
      </div>
    );
  }

  const getToolIcon = (toolId: ToolId) => {
    switch (toolId) {
      case 'merge':
        return <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'split':
        return <Scissors className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
      case 'organize':
        return <RotateCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'crop':
        return <Crop className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
      case 'images-to-pdf':
        return <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'watermark':
        return <Stamp className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />;
      case 'sign':
        return <PenTool className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case 'metadata':
        return <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />;
      case 'qr':
        return <QrCode className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />;
    }
  };

  const formatTime = (ts: number): string => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>5 derniers fichiers traités</span>
        </div>

        <button
          type="button"
          onClick={clearRecentFiles}
          className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
        >
          Effacer l'historique
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {recentFiles.map((file) => {
          const canDownload = hasCachedBlob(file.id);

          return (
            <div
              key={file.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-3 flex flex-col justify-between space-y-2 transition-all shadow-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getToolIcon(file.toolId)}
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      {file.toolName}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-mono">
                    {formatTime(file.timestamp)}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate" title={file.name}>
                  {file.name}
                </p>

                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  <span>{formatBytes(file.size)}</span>
                  {file.pageCount && (
                    <>
                      <span className="mx-1">·</span>
                      <span className="font-mono tabular-nums">{file.pageCount} p.</span>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                {canDownload ? (
                  <button
                    type="button"
                    onClick={() => downloadCachedRecentFile(file.id, file.name)}
                    className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Télécharger</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Prêt</span>
                )}

                <button
                  type="button"
                  onClick={() => removeRecentFile(file.id)}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                  title="Supprimer de l'historique"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
