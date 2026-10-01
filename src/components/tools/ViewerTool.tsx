import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  FileText,
  ScanText,
  Copy,
  Check,
  X,
  Loader2,
  Languages,
  Sparkles,
  Search,
  Sliders,
  Layers,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { pdfjsLib } from '../../utils/pdfWorker';
import { downloadFile, performOcrOnCanvas } from '../../utils/pdfOperations';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface ContinuousPageItemProps {
  pdfDoc: PDFDocumentProxy;
  pageNum: number;
  scale: number;
  rotation: number;
  pageSpacing: number;
  isLast: boolean;
}

const ContinuousPageItem: React.FC<ContinuousPageItemProps> = ({
  pdfDoc,
  pageNum,
  scale,
  rotation,
  pageSpacing,
  isLast,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await (page as any).render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;
      } catch (err) {
        if (!isCancelled) {
          console.error(`Error rendering page ${pageNum}:`, err);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pageNum, scale, rotation]);

  return (
    <div
      className="flex flex-col items-center"
      style={{ marginBottom: isLast ? 0 : `${pageSpacing}px` }}
    >
      <div className="relative shadow-2xl rounded border border-slate-700 overflow-hidden bg-white group">
        <canvas ref={canvasRef} className="block max-w-full" />
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center text-white text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-slate-900/80 text-white font-mono text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          Page {pageNum}
        </div>
      </div>
    </div>
  );
};

interface ViewerToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const ViewerTool: React.FC<ViewerToolProps> = ({
  onUseSample,
  isGeneratingSample,
  sampleBuffer,
}) => {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('single');
  const [pageSpacing, setPageSpacing] = useState<number>(20); // space between pages in px
  const [showSpacingPopover, setShowSpacingPopover] = useState<boolean>(false);

  // OCR Feature State
  const [showOcrModal, setShowOcrModal] = useState<boolean>(false);
  const [ocrScope, setOcrScope] = useState<'current' | 'all'>('current');
  const [ocrLanguage, setOcrLanguage] = useState<string>('fra+eng');
  const [ocrIsProcessing, setOcrIsProcessing] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrStatusText, setOcrStatusText] = useState<string>('');
  const [ocrResultText, setOcrResultText] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [ocrWordCount, setOcrWordCount] = useState<number>(0);
  const [hasCopiedText, setHasCopiedText] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sampleBuffer && !buffer) {
      loadBuffer(sampleBuffer, 'document_exemple.pdf');
    }
  }, [sampleBuffer]);

  const loadBuffer = async (rawBuffer: ArrayBuffer, name: string) => {
    setBuffer(rawBuffer);
    setFileName(name);
    setCurrentPage(1);
    setRotation(0);
    setOcrResultText('');
    setOcrConfidence(null);

    try {
      const doc = await pdfjsLib.getDocument({
        data: new Uint8Array(rawBuffer.slice(0)),
        useWorkerFetch: false,
      }).promise;

      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    } catch (e) {
      console.error('Error loading PDF in viewer:', e);
      alert('Impossible d’ouvrir ce document PDF pour la lecture.');
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buf = await f.arrayBuffer();
    loadBuffer(buf, f.name);
  };

  // Render the current page on canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    setIsLoadingPage(true);

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await (page as any).render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;
      } catch (err) {
        if (!isCancelled) {
          console.error('Page render error:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPage(false);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, scale, rotation]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const handleZoomIn = () => {
    setScale((s) => Math.min(s + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(s - 0.2, 0.4));
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleFitWidth = () => {
    if (containerRef.current && canvasRef.current) {
      const containerWidth = containerRef.current.clientWidth - 48; // padding
      const naturalWidth = canvasRef.current.width / scale;
      if (naturalWidth > 0) {
        setScale(Math.max(0.4, Math.min(2.5, containerWidth / naturalWidth)));
      }
    }
  };

  const handleFitPage = () => {
    if (containerRef.current && canvasRef.current) {
      const containerWidth = containerRef.current.clientWidth - 48;
      const containerHeight = containerRef.current.clientHeight - 48;
      const naturalWidth = canvasRef.current.width / scale;
      const naturalHeight = canvasRef.current.height / scale;
      if (naturalWidth > 0 && naturalHeight > 0) {
        const scaleX = containerWidth / naturalWidth;
        const scaleY = containerHeight / naturalHeight;
        const fitScale = Math.min(scaleX, scaleY);
        setScale(Math.max(0.2, Math.min(3.0, Number(fitScale.toFixed(2)))));
      }
    } else {
      setScale(0.85);
    }
  };

  const toggleFullScreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  };

  // Run OCR on high-resolution canvas render
  const handleStartOcr = async () => {
    if (!pdfDoc) return;
    setOcrIsProcessing(true);
    setOcrProgress(5);
    setOcrStatusText('Initialisation du moteur de reconnaissance optique (Tesseract WebAssembly)...');
    setOcrResultText('');
    setOcrConfidence(null);
    setHasCopiedText(false);

    try {
      if (ocrScope === 'current') {
        // High-res rendering for optical character clarity (scale 1.8)
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.8 });

        const ocrCanvas = document.createElement('canvas');
        ocrCanvas.width = viewport.width;
        ocrCanvas.height = viewport.height;
        const ctx = ocrCanvas.getContext('2d');
        if (!ctx) throw new Error('Impossible de créer le contexte 2D');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, ocrCanvas.width, ocrCanvas.height);

        await (page as any).render({
          canvasContext: ctx,
          viewport,
          canvas: ocrCanvas,
        }).promise;

        setOcrProgress(30);
        setOcrStatusText('Numérisation et extraction du texte...');

        const result = await performOcrOnCanvas(ocrCanvas, ocrLanguage, (progress, status) => {
          setOcrProgress(progress);
          setOcrStatusText(status);
        });

        setOcrResultText(result.text || '(Aucun texte détecté sur cette page scannée)');
        setOcrConfidence(result.confidence);
        setOcrWordCount(result.wordCount);
      } else {
        // Multi-page OCR
        let fullCombinedText = '';
        let totalConfidence = 0;
        let countedPages = 0;

        for (let p = 1; p <= pdfDoc.numPages; p++) {
          setOcrStatusText(`Numérisation de la page ${p} sur ${pdfDoc.numPages}...`);
          setOcrProgress(Math.round(((p - 1) / pdfDoc.numPages) * 100));

          const page = await pdfDoc.getPage(p);
          const viewport = page.getViewport({ scale: 1.5 });
          const ocrCanvas = document.createElement('canvas');
          ocrCanvas.width = viewport.width;
          ocrCanvas.height = viewport.height;
          const ctx = ocrCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, ocrCanvas.width, ocrCanvas.height);
            await (page as any).render({
              canvasContext: ctx,
              viewport,
              canvas: ocrCanvas,
            }).promise;

            const res = await performOcrOnCanvas(ocrCanvas, ocrLanguage);
            if (res.text) {
              fullCombinedText += `\n\n--- Page ${p} ---\n\n` + res.text;
              totalConfidence += res.confidence;
              countedPages++;
            }
          }
        }

        const trimmed = fullCombinedText.trim();
        setOcrResultText(trimmed || '(Aucun texte détecté dans le document)');
        setOcrConfidence(countedPages > 0 ? Math.round(totalConfidence / countedPages) : 0);
        setOcrWordCount(trimmed.split(/\s+/).filter(Boolean).length);
        setOcrProgress(100);
      }
    } catch (err) {
      console.error('OCR Error:', err);
      alert('Une erreur est survenue lors de l’analyse OCR.');
    } finally {
      setOcrIsProcessing(false);
    }
  };

  const handleCopyOcrText = async () => {
    if (!ocrResultText) return;
    try {
      await navigator.clipboard.writeText(ocrResultText);
      setHasCopiedText(true);
      setTimeout(() => setHasCopiedText(false), 2000);
    } catch (e) {
      console.error('Clipboard copy failed:', e);
    }
  };

  const handleDownloadOcrTxt = () => {
    if (!ocrResultText) return;
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const blob = new Blob([ocrResultText], { type: 'text/plain;charset=utf-8' });
    downloadFile(blob, `${baseName}_ocr.txt`, 'text/plain');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Visionneuse PDF & Reconnaissance OCR</h1>
            <p className="text-xs text-slate-500">
              Consultez vos documents haute fidélité et extrayez le texte des pages scannées grâce au moteur OCR local 100% confidentiel.
            </p>
          </div>
        </div>
      </div>

      {!buffer ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          title="Déposez le document PDF à consulter ou numériser"
          subtitle="Sélectionnez un document PDF"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-4">
          {/* Top Floating Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            {/* Document details & pagination */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 font-semibold truncate max-w-[180px] sm:max-w-xs">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">{fileName}</span>
              </div>

              {viewMode === 'single' && (
                <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-3">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={handlePrevPage}
                    className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    title="Page précédente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1 text-xs">
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                          setCurrentPage(val);
                        }
                      }}
                      className="w-11 text-center py-0.5 border border-slate-300 dark:border-slate-700 rounded font-mono text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-slate-400">/ {totalPages}</span>
                  </div>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={handleNextPage}
                    className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    title="Page suivante"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* View Mode Switcher */}
              <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('single')}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer text-[11px] ${
                    viewMode === 'single'
                      ? 'bg-white dark:bg-slate-700 font-bold text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Afficher une page à la fois"
                >
                  Page unique
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('continuous')}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer text-[11px] ${
                    viewMode === 'continuous'
                      ? 'bg-white dark:bg-slate-700 font-bold text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Défilement continu de toutes les pages"
                >
                  Défilement continu ({totalPages}p)
                </button>
              </div>
            </div>

            {/* OCR & View Controls */}
            <div className="flex items-center gap-2 text-xs">
              {/* Spacing between pages configuration popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSpacingPopover(!showSpacingPopover)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                    showSpacingPopover
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                  title="Configurer l'espace entre les pages"
                >
                  <Sliders className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Espace : {pageSpacing}px</span>
                </button>

                {showSpacingPopover && (
                  <div className="absolute right-0 top-full mt-2 w-64 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Espace entre les pages</span>
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{pageSpacing} px</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="64"
                      step="4"
                      value={pageSpacing}
                      onChange={(e) => setPageSpacing(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      {[8, 16, 24, 32, 48].map((gap) => (
                        <button
                          key={gap}
                          type="button"
                          onClick={() => setPageSpacing(gap)}
                          className={`px-1.5 py-0.5 rounded cursor-pointer ${
                            pageSpacing === gap
                              ? 'bg-emerald-100 text-emerald-800 font-bold dark:bg-emerald-950 dark:text-emerald-300'
                              : 'hover:text-emerald-600'
                          }`}
                        >
                          {gap}px
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* OCR BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setShowOcrModal(true);
                  if (!ocrResultText) {
                    handleStartOcr();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Lancer la reconnaissance optique de caractères sur ce PDF"
              >
                <ScanText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Reconnaissance OCR</span>
              </button>

              <span className="text-slate-200 dark:text-slate-800">|</span>

              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                title="Zoom arrière (-20%)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleFitWidth}
                className="px-2 py-1 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded cursor-pointer"
                title="Ajuster à la largeur de l'écran"
              >
                Largeur ({Math.round(scale * 100)}%)
              </button>
              <button
                type="button"
                onClick={handleFitPage}
                className="px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded cursor-pointer"
                title="Ajuster à la page entière (voir toute l'image/page sans coupure)"
              >
                Page entière
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                title="Zoom avant (+20%)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <span className="text-slate-200 dark:text-slate-800">|</span>

              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                title="Faire pivoter la vue (+90°)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleFullScreen}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                title="Plein écran"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              <span className="text-slate-200 dark:text-slate-800">|</span>

              <button
                type="button"
                onClick={() => downloadFile(buffer, fileName)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded cursor-pointer"
                title="Télécharger une copie"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Télécharger</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBuffer(null);
                  setPdfDoc(null);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>

          {/* Canvas Rendering Viewer Area */}
          <div
            ref={containerRef}
            className="w-full min-h-[580px] max-h-[780px] overflow-auto bg-slate-800/95 dark:bg-slate-950/90 rounded-xl p-6 shadow-inner relative flex flex-col items-center"
          >
            {viewMode === 'single' ? (
              <div className="flex items-start justify-center w-full relative">
                {isLoadingPage && (
                  <div className="absolute top-4 right-4 bg-slate-900/80 text-white text-xs px-2.5 py-1 rounded shadow flex items-center gap-1.5 z-10">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>Rendu...</span>
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  className="bg-white shadow-2xl rounded border border-slate-700 transition-all max-w-full"
                />
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                {pdfDoc &&
                  Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                    <ContinuousPageItem
                      key={`page-${pNum}`}
                      pdfDoc={pdfDoc}
                      pageNum={pNum}
                      scale={scale}
                      rotation={rotation}
                      pageSpacing={pageSpacing}
                      isLast={pNum === totalPages}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* OCR EXTRACTION MODAL */}
      {showOcrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ScanText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Reconnaissance Optique de Caractères (OCR)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Extraction de texte directe depuis les scans et images du document
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowOcrModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-md cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Controls & Options Bar */}
            <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Scope selector */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                  <button
                    type="button"
                    onClick={() => setOcrScope('current')}
                    className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                      ocrScope === 'current'
                        ? 'bg-white font-semibold text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Page {currentPage}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOcrScope('all')}
                    className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                      ocrScope === 'all'
                        ? 'bg-white font-semibold text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Toutes les pages ({totalPages})
                  </button>
                </div>

                {/* Language selector */}
                <div className="flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={ocrLanguage}
                    onChange={(e) => setOcrLanguage(e.target.value)}
                    disabled={ocrIsProcessing}
                    className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="fra+eng">Français & Anglais</option>
                    <option value="fra">Français uniquement</option>
                    <option value="eng">English only</option>
                    <option value="spa">Español</option>
                    <option value="deu">Deutsch</option>
                  </select>
                </div>
              </div>

              {/* Relaunch button */}
              <button
                type="button"
                disabled={ocrIsProcessing}
                onClick={handleStartOcr}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {ocrIsProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Numérisation...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Relancer l’OCR</span>
                  </>
                )}
              </button>
            </div>

            {/* Modal Body: Processing State or Extracted Text */}
            <div className="flex-1 overflow-auto p-6 bg-slate-50/50 flex flex-col min-h-[300px] max-h-[500px]">
              {ocrIsProcessing ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                  <div className="text-center space-y-1 max-w-sm">
                    <p className="text-xs font-semibold text-slate-800">
                      {ocrStatusText || 'Traitement optique en cours...'}
                    </p>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-emerald-600 h-full transition-all duration-300"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 font-semibold">
                      {ocrProgress}%
                    </span>
                  </div>
                </div>
              ) : ocrResultText ? (
                <div className="flex-1 flex flex-col space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <span>{ocrWordCount} mots détectés</span>
                      {ocrConfidence !== null && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-emerald-700">
                            Précision : {ocrConfidence}%
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyOcrText}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer"
                      >
                        {hasCopiedText ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadOcrTxt}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Télécharger .TXT</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    readOnly
                    value={ocrResultText}
                    rows={12}
                    className="w-full flex-1 p-4 bg-white border border-slate-200 rounded-xl font-mono text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none shadow-xs"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
                  <ScanText className="w-8 h-8 text-slate-300" />
                  <p className="text-xs">Cliquez sur « Relancer l’OCR » pour extraire le texte.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px]">
                Moteur OCR Tesseract 100% exécuté localement : aucun document n’est envoyé sur Internet.
              </span>
              <button
                type="button"
                onClick={() => setShowOcrModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
