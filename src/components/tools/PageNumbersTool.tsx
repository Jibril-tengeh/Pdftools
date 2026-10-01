import React, { useState, useEffect } from 'react';
import {
  Hash,
  Download,
  Loader2,
  CheckCircle2,
  FileText,
  Type,
  Layout,
  Sparkles,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { addPageNumbersToPdf, downloadFile, getPdfPageCount, formatBytes, renderPdfThumbnail } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';

interface PageNumbersToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const PageNumbersTool: React.FC<PageNumbersToolProps> = ({
  onUseSample,
  isGeneratingSample,
  sampleBuffer,
}) => {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(1);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);

  // Numbering settings
  const [format, setFormat] = useState<'page-x-y' | 'page-x' | 'x-y' | 'x'>('page-x-y');
  const [position, setPosition] = useState<'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left'>('bottom-center');
  const [fontSize, setFontSize] = useState<number>(10);
  const [color, setColor] = useState<string>('#475569');
  const [margin, setMargin] = useState<number>(25);
  const [startPageNumber, setStartPageNumber] = useState<number>(1);
  const [excludeFirstPage, setExcludeFirstPage] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
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
      const count = await getPdfPageCount(rawBuffer);
      setPageCount(count);

      const thumb = await renderPdfThumbnail(rawBuffer, 1, 0.4);
      setPreviewThumbnail(thumb);
    } catch (e) {
      console.error('Error loading PDF:', e);
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buf = await f.arrayBuffer();
    loadBuffer(buf, f.name);
  };

  const handleApply = async () => {
    if (!buffer) return;
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      const numberedBytes = await addPageNumbersToPdf(buffer, {
        format,
        position,
        fontSize,
        color,
        margin,
        startPageNumber,
        excludeFirstPage,
      });

      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const outName = `${baseName}_numerote.pdf`;

      downloadFile(numberedBytes, outName);

      addRecentFile({
        name: outName,
        toolName: 'Numéroter les pages',
        toolId: 'page-numbers',
        size: numberedBytes.byteLength,
        pageCount,
        data: numberedBytes,
      });

      setSuccessMessage('Numérotation ajoutée et document téléchargé avec succès !');
    } catch (e) {
      console.error('Page numbering error:', e);
      alert('Impossible d’appliquer la numérotation au document.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Numéroter les Pages PDF</h1>
            <p className="text-xs text-slate-500">
              Insérez des numéros de page clairs et personnalisés à l’emplacement et au style de votre choix.
            </p>
          </div>
        </div>
      </div>

      {!buffer ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          title="Déposez le document PDF à numéroter"
          subtitle="Sélectionnez un document PDF"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
            {/* Document details */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 truncate block max-w-sm">
                    {fileName}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {pageCount} page{pageCount > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBuffer(null)}
                className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer self-start sm:self-auto"
              >
                Changer de fichier
              </button>
            </div>

            {/* Layout Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Format */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Modèle de numérotation</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                >
                  <option value="page-x-y">Page 1 sur {pageCount}</option>
                  <option value="x-y">1 / {pageCount}</option>
                  <option value="page-x">Page 1</option>
                  <option value="x">1 (Chiffre seul)</option>
                </select>
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Emplacement sur la page</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                >
                  <option value="bottom-center">En bas au centre</option>
                  <option value="bottom-right">En bas à droite</option>
                  <option value="bottom-left">En bas à gauche</option>
                  <option value="top-center">En haut au centre</option>
                  <option value="top-right">En haut à droite</option>
                  <option value="top-left">En haut à gauche</option>
                </select>
              </div>

              {/* Font Size */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Taille de police</span>
                  <span className="font-mono text-[11px] text-slate-500">{fontSize} pt</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="18"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              {/* Margin */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Marge bord de page</span>
                  <span className="font-mono text-[11px] text-slate-500">{margin} pt</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              {/* Start Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Commencer à numéroter à</label>
                <input
                  type="number"
                  min="1"
                  value={startPageNumber}
                  onChange={(e) => setStartPageNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              {/* Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Couleur du texte</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded border-0 p-0 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-600 uppercase">{color}</span>
                </div>
              </div>
            </div>

            {/* Checkbox exclude cover page */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeFirstPage}
                  onChange={(e) => setExcludeFirstPage(e.target.checked)}
                  className="rounded text-sky-600 accent-sky-600"
                />
                <span>Exclure la première page (Ne pas numéroter la page de couverture)</span>
              </label>
            </div>
          </div>

          {/* Action button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
            <span className="text-xs text-slate-500">
              Numérotation instantanée appliquée directement dans votre navigateur.
            </span>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApply}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Appliquer et Télécharger le PDF</span>
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
