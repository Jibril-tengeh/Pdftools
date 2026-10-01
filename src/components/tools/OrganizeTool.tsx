import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Undo2,
  Download,
  Loader2,
  CheckCircle2,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { renderAllPdfThumbnails, reorderAndRotatePdf, downloadFile } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';
import { PDFDocument } from 'pdf-lib';
import type { PDFPageItem } from '../../types';

interface OrganizeToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const OrganizeTool: React.FC<OrganizeToolProps> = ({
  onUseSample,
  isGeneratingSample,
  sampleBuffer,
}) => {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pages, setPages] = useState<PDFPageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (sampleBuffer && !buffer) {
      loadBuffer(sampleBuffer, 'document_exemple.pdf');
    }
  }, [sampleBuffer]);

  const loadBuffer = async (rawBuffer: ArrayBuffer, name: string) => {
    setBuffer(rawBuffer);
    setFileName(name);
    setSuccessMessage(null);

    try {
      const pdfDoc = await PDFDocument.load(rawBuffer, { ignoreEncryption: true });
      const count = pdfDoc.getPageCount();

      const initialPages: PDFPageItem[] = [];
      for (let i = 0; i < count; i++) {
        initialPages.push({
          pageIndex: i,
          displayNumber: i + 1,
          rotation: 0,
          selected: true,
          isDeleted: false,
        });
      }
      setPages(initialPages);

      // Render all thumbnails safely without detaching the ArrayBuffer
      renderAllPdfThumbnails(rawBuffer, 0.35).then((thumbnails) => {
        setPages((prev) =>
          prev.map((p, idx) => ({
            ...p,
            thumbnailUrl: thumbnails[idx] || '',
          }))
        );
      }).catch((err) => {
        console.error('Error rendering thumbnails in OrganizeTool:', err);
      });
    } catch (e) {
      console.error('Error loading PDF for organize:', e);
      alert('Impossible de lire ce fichier PDF.');
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buf = await f.arrayBuffer();
    loadBuffer(buf, f.name);
  };

  const rotatePage = (indexInArray: number, angleChange: number) => {
    setPages((prev) => {
      const next = [...prev];
      const p = next[indexInArray];
      const newRotation = (p.rotation + angleChange + 360) % 360;
      next[indexInArray] = { ...p, rotation: newRotation };
      return next;
    });
  };

  const rotateAll = (angleChange: number) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + angleChange + 360) % 360,
      }))
    );
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const toggleDeletePage = (indexInArray: number) => {
    setPages((prev) => {
      const next = [...prev];
      next[indexInArray] = {
        ...next[indexInArray],
        isDeleted: !next[indexInArray].isDeleted,
      };
      return next;
    });
  };

  const activePages = pages.filter((p) => !p.isDeleted);

  const handleSave = async () => {
    if (!buffer) return;
    if (activePages.length === 0) {
      alert('Toutes les pages sont supprimées. Veuillez en conserver au moins une.');
      return;
    }

    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      const pagesToKeep = activePages.map((p) => ({
        originalIndex: p.pageIndex,
        rotation: p.rotation,
      }));

      const organizedBytes = await reorderAndRotatePdf(buffer, pagesToKeep);
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const outName = `${baseName}_organise.pdf`;
      downloadFile(organizedBytes, outName);
      addRecentFile({
        name: outName,
        toolName: 'Organiser',
        toolId: 'organize',
        size: organizedBytes.byteLength,
        pageCount: pagesToKeep.length,
        data: organizedBytes,
      });
      setSuccessMessage(`Document réorganisé avec succès (${pagesToKeep.length} pages sauvegardées) !`);
    } catch (e) {
      console.error('Error organizing PDF:', e);
      alert('Une erreur est survenue lors de la réorganisation du document.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <RotateCw className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Organiser & Faire Pivoter</h1>
            <p className="text-xs text-slate-500">
              Réorganisez l’ordre des pages, appliquez des rotations à 90° ou supprimez des pages indésirables.
            </p>
          </div>
        </div>
      </div>

      {!buffer ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          title="Déposez le fichier PDF à réorganiser"
          subtitle="Sélectionnez un document PDF"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">{fileName}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {activePages.length} active{activePages.length > 1 ? 's' : ''} sur {pages.length} pages
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Utilisez les flèches pour réordonner, pivoter ou supprimer.
              </p>
            </div>

            {/* Global Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => rotateAll(90)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Pivoter tout (+90°)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setPages((prev) =>
                    prev.map((p) => ({ ...p, rotation: 0, isDeleted: false }))
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Réinitialiser</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBuffer(null);
                  setPages([]);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1"
              >
                Autre document
              </button>
            </div>
          </div>

          {/* Interactive Pages Grid */}
          <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {pages.map((p, arrayIdx) => (
                <div
                  key={`${p.pageIndex}-${p.displayNumber}`}
                  className={`bg-white rounded-xl border-2 p-3 transition-all flex flex-col justify-between ${
                    p.isDeleted
                      ? 'border-dashed border-rose-300 opacity-40 bg-rose-50/20'
                      : 'border-slate-200 hover:border-slate-400 shadow-xs'
                  }`}
                >
                  {/* Card Header: Order and status */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-mono font-bold text-slate-700">
                      #{arrayIdx + 1}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Origine p.{p.displayNumber}
                    </span>
                  </div>

                  {/* Thumbnail with visual rotation */}
                  <div className="aspect-[3/4] bg-slate-50 rounded flex items-center justify-center overflow-hidden border border-slate-100 relative my-1">
                    {p.thumbnailUrl ? (
                      <div
                        className="w-full h-full flex items-center justify-center transition-transform duration-200"
                        style={{ transform: `rotate(${p.rotation}deg)` }}
                      >
                        <img
                          src={p.thumbnailUrl}
                          alt={`Page ${p.displayNumber}`}
                          className="max-w-full max-h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-mono">Page {p.displayNumber}</div>
                    )}

                    {p.rotation !== 0 && (
                      <span className="absolute top-1 left-1 bg-slate-900/80 text-white text-[9px] font-mono px-1 rounded">
                        {p.rotation}°
                      </span>
                    )}

                    {p.isDeleted && (
                      <div className="absolute inset-0 bg-rose-900/30 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
                          Supprimée
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Toolbar for this page */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                    {p.isDeleted ? (
                      <button
                        type="button"
                        onClick={() => toggleDeletePage(arrayIdx)}
                        className="w-full py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        Restaurer
                      </button>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={arrayIdx === 0}
                            onClick={() => movePage(arrayIdx, arrayIdx - 1)}
                            title="Déplacer vers la gauche"
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={arrayIdx === pages.length - 1}
                            onClick={() => movePage(arrayIdx, arrayIdx + 1)}
                            title="Déplacer vers la droite"
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => rotatePage(arrayIdx, 90)}
                            title="Pivoter à droite (+90°)"
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleDeletePage(arrayIdx)}
                            title="Supprimer cette page"
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">{activePages.length} pages</span> prêtes pour le document final.
            </div>

            <button
              type="button"
              disabled={isProcessing || activePages.length === 0}
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement en cours...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Télécharger le PDF réorganisé</span>
                </>
              )}
            </button>
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
