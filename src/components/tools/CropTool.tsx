import React, { useState, useEffect, useRef } from 'react';
import {
  Crop,
  Download,
  Loader2,
  CheckCircle2,
  Sliders,
  Eye,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { renderPdfThumbnail, cropPdf, downloadFile } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';
import { PDFDocument } from 'pdf-lib';

interface CropToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const CropTool: React.FC<CropToolProps> = ({
  onUseSample,
  isGeneratingSample,
  sampleBuffer,
}) => {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(1);
  const [previewPageNumber, setPreviewPageNumber] = useState<number>(1);
  const [pageThumbnail, setPageThumbnail] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Crop margins in percentage of page dimensions (0% to 40%)
  const [cropLeft, setCropLeft] = useState<number>(10);
  const [cropRight, setCropRight] = useState<number>(10);
  const [cropTop, setCropTop] = useState<number>(0);
  const [cropBottom, setCropBottom] = useState<number>(0);
  const [syncSides, setSyncSides] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      setTotalPages(count);
      setPreviewPageNumber(1);

      const thumb = await renderPdfThumbnail(rawBuffer, 1, 0.85);
      setPageThumbnail(thumb);
    } catch (e) {
      console.error('Error loading PDF for crop:', e);
      alert('Impossible d’ouvrir ce document PDF.');
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buf = await f.arrayBuffer();
    loadBuffer(buf, f.name);
  };

  const handlePageChange = async (newPage: number) => {
    if (!buffer || newPage < 1 || newPage > totalPages) return;
    setPreviewPageNumber(newPage);
    const thumb = await renderPdfThumbnail(buffer, newPage, 0.85);
    setPageThumbnail(thumb);
  };

  // Live Canvas Preview of crop area
  useEffect(() => {
    if (!pageThumbnail || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw full original page
      ctx.drawImage(img, 0, 0);

      // Draw dimmed overlay outside cropped rectangle
      const x1 = (canvas.width * cropLeft) / 100;
      const x2 = canvas.width - (canvas.width * cropRight) / 100;
      const y1 = (canvas.height * cropTop) / 100;
      const y2 = canvas.height - (canvas.height * cropBottom) / 100;

      ctx.save();
      // Semi-transparent dark overlay over cut-off areas
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';

      // Top band
      ctx.fillRect(0, 0, canvas.width, y1);
      // Bottom band
      ctx.fillRect(0, y2, canvas.width, canvas.height - y2);
      // Left band
      ctx.fillRect(0, y1, x1, y2 - y1);
      // Right band
      ctx.fillRect(x2, y1, canvas.width - x2, y2 - y1);

      // Crop border indicator
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      // Label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('Zone conservée', x1 + 10, y1 + 20);

      ctx.restore();
    };
    img.src = pageThumbnail;
  }, [pageThumbnail, cropLeft, cropRight, cropTop, cropBottom]);

  const handleLeftChange = (val: number) => {
    setCropLeft(val);
    if (syncSides) {
      setCropRight(val);
    }
  };

  const handleRightChange = (val: number) => {
    setCropRight(val);
    if (syncSides) {
      setCropLeft(val);
    }
  };

  const handleCrop = async () => {
    if (!buffer) return;
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      const croppedBytes = await cropPdf(buffer, {
        left: cropLeft,
        right: cropRight,
        top: cropTop,
        bottom: cropBottom,
      });

      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const outName = `${baseName}_rogne.pdf`;
      downloadFile(croppedBytes, outName);
      addRecentFile({
        name: outName,
        toolName: 'Recadrage / Marges',
        toolId: 'crop',
        size: croppedBytes.byteLength,
        pageCount: totalPages,
        data: croppedBytes,
      });
      setSuccessMessage('Marges découpées avec succès sur toutes les pages du document !');
    } catch (e) {
      console.error('Error cropping PDF:', e);
      alert('Une erreur est survenue lors du recadrage du document.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <Crop className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Rogner / Supprimer les marges</h1>
            <p className="text-xs text-slate-500">
              Supprimez les bordures blanches ou découpez les marges latérales pour un affichage plein écran sur smartphone ou liseuse.
            </p>
          </div>
        </div>
      </div>

      {!buffer ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          title="Déposez le PDF dont vous souhaitez retirer les marges"
          subtitle="Sélectionnez un document PDF"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Controls (6 cols) */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="text-xs">
                  <span className="font-semibold text-slate-900">{fileName}</span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span className="font-mono tabular-nums text-slate-500">{totalPages} pages</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setBuffer(null);
                    setPageThumbnail(null);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Changer de fichier
                </button>
              </div>

              {/* Quick Explanation Note */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pourquoi ces bandes blanches apparaissent-elles ?</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Les bandes blanches sur les côtés apparaissent lorsqu'une image verticale (format smartphone) est placée sur une page A4 plus large. Ajustez les curseurs ci-dessous pour découper ces bandes blanches latérales !
                </p>
              </div>

              {/* Sliders */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Découpe des côtés gauche & droit
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncSides}
                      onChange={(e) => setSyncSides(e.target.checked)}
                      className="rounded text-rose-600 accent-rose-600"
                    />
                    <span>Symétrique (G = D)</span>
                  </label>
                </div>

                {/* Left margin slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Marge gauche à retirer</span>
                    <span className="font-mono tabular-nums text-slate-800 font-semibold">{cropLeft} %</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    step="1"
                    value={cropLeft}
                    onChange={(e) => handleLeftChange(Number(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>

                {/* Right margin slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Marge droite à retirer</span>
                    <span className="font-mono tabular-nums text-slate-800 font-semibold">{cropRight} %</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    step="1"
                    value={cropRight}
                    onChange={(e) => handleRightChange(Number(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>

                {/* Top and Bottom sliders */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Haut</span>
                      <span className="font-mono text-slate-800">{cropTop} %</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="1"
                      value={cropTop}
                      onChange={(e) => setCropTop(Number(e.target.value))}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Bas</span>
                      <span className="font-mono text-slate-800">{cropBottom} %</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="1"
                      value={cropBottom}
                      onChange={(e) => setCropBottom(Number(e.target.value))}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Preset buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCropLeft(0);
                      setCropRight(0);
                      setCropTop(0);
                      setCropBottom(0);
                    }}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                  >
                    Réinitialiser (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCropLeft(10);
                      setCropRight(10);
                      setCropTop(0);
                      setCropBottom(0);
                    }}
                    className="px-2.5 py-1 text-xs bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded text-rose-700 font-medium cursor-pointer"
                  >
                    Bandes latérales (-10%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCropLeft(15);
                      setCropRight(15);
                      setCropTop(0);
                      setCropBottom(0);
                    }}
                    className="px-2.5 py-1 text-xs bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded text-rose-700 font-medium cursor-pointer"
                  >
                    Bandes latérales (-15%)
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Canvas Preview (6 cols) */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between space-y-4">
              <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-rose-600" />
                  Aperçu du recadrage
                </span>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={previewPageNumber <= 1}
                      onClick={() => handlePageChange(previewPageNumber - 1)}
                      className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer"
                    >
                      ←
                    </button>
                    <span className="font-mono text-xs">
                      {previewPageNumber} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={previewPageNumber >= totalPages}
                      onClick={() => handlePageChange(previewPageNumber + 1)}
                      className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>

              {/* Rendered Preview Box */}
              <div className="w-full max-h-[460px] overflow-auto flex items-center justify-center p-3 bg-slate-100 rounded-lg">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[420px] object-contain shadow-md rounded border border-slate-300 bg-white"
                />
              </div>

              <div className="w-full text-[11px] text-center text-slate-400">
                La zone encadrée en pointillés roses représente le PDF final après découpe.
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-500">
              Le recadrage supprime définitivement les marges blanches sans modifier la résolution ou la netteté du texte.
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleCrop}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Découpe en cours...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Appliquer la découpe et Télécharger</span>
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
