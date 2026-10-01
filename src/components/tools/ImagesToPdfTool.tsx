import React, { useState } from 'react';
import {
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  Plus,
  Loader2,
  CheckCircle2,
  Info,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Sliders,
  FileText,
  Grid2X2,
  Hash,
  Sparkles,
  Stamp,
  Type,
  Palette,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { convertImagesToPdf, addWatermarkToPdf, downloadFile, formatBytes, renderPdfThumbnail } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';
import type {
  ImageToPdfItem,
  PageSizeOption,
  PageOrientationOption,
  PageMarginOption,
  ImageGridModeOption,
} from '../../types';

export const ImagesToPdfTool: React.FC = () => {
  const [images, setImages] = useState<ImageToPdfItem[]>([]);
  // Page geometry
  const [pageSize, setPageSize] = useState<PageSizeOption>('fit');
  const [orientation, setOrientation] = useState<PageOrientationOption>('auto');
  const [margin, setMargin] = useState<number>(0); // Default 0 pt for 100% full-page image without margins
  const [gridGap, setGridGap] = useState<number>(15); // Gap between images in grid mode (pt)
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain'); // Default contain so image is 100% visible
  const [backgroundColor, setBackgroundColor] = useState<string>('#FFFFFF');

  // Advanced options
  const [gridMode, setGridMode] = useState<ImageGridModeOption>(1);
  const [showPageNumbers, setShowPageNumbers] = useState<boolean>(false);
  const [pageNumberPosition, setPageNumberPosition] = useState<'bottom-center' | 'bottom-right'>('bottom-center');
  const [showFilenameCaptions, setShowFilenameCaptions] = useState<boolean>(false);
  const [customFilename, setCustomFilename] = useState<string>('album_photos.pdf');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  // Watermark options inside ImagesToPdf
  const [enableWatermark, setEnableWatermark] = useState<boolean>(false);
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIEL');
  const [watermarkColor, setWatermarkColor] = useState<string>('#DC2626');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.3);
  const [watermarkFontSize, setWatermarkFontSize] = useState<number>(44);
  const [watermarkRotation, setWatermarkRotation] = useState<number>(45);
  const [watermarkPosition, setWatermarkPosition] = useState<'center' | 'top' | 'bottom' | 'repeat'>('center');

  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [isPreviewGenerating, setIsPreviewGenerating] = useState<boolean>(false);
  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null);
  const [previewCurrentPage, setPreviewCurrentPage] = useState<number>(1);
  const [previewTotalPages, setPreviewTotalPages] = useState<number>(1);
  const [previewThumbnailUrl, setPreviewThumbnailUrl] = useState<string | null>(null);

  const handleImagesSelected = async (files: File[]) => {
    const newItems: ImageToPdfItem[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await readFileAsDataUrl(file);
      const dims = await getImageDimensions(dataUrl);

      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        dataUrl,
        width: dims.width,
        height: dims.height,
      });
    }

    setImages((prev) => [...prev, ...newItems]);
    setSuccessMessage(null);
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        resolve({ width: 800, height: 600 });
      };
      img.src = dataUrl;
    });
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    setImages((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
      return next;
    });
  };

  const moveDown = (idx: number) => {
    if (idx >= images.length - 1) return;
    setImages((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
      return next;
    });
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Compile PDF with all advanced options
  const buildPdf = async (): Promise<Uint8Array> => {
    const payload = images.map((img) => ({
      dataUrl: img.dataUrl,
      width: img.width,
      height: img.height,
      name: img.file.name,
    }));

    let bytes = await convertImagesToPdf(
      payload,
      pageSize,
      orientation,
      margin,
      fitMode,
      backgroundColor,
      gridMode,
      showPageNumbers,
      pageNumberPosition,
      showFilenameCaptions,
      gridGap
    );

    if (enableWatermark && watermarkText.trim()) {
      const arrayBuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      bytes = await addWatermarkToPdf(arrayBuf, {
        id: 'img-wm',
        text: watermarkText,
        color: watermarkColor,
        fontSize: watermarkFontSize,
        opacity: watermarkOpacity,
        rotation: watermarkRotation,
        position: watermarkPosition,
        applyTo: 'all',
      });
    }

    return bytes;
  };

  // Generate preview of the compiled PDF
  const handleOpenPreview = async () => {
    if (images.length === 0) return;
    setIsPreviewGenerating(true);
    setShowPreviewModal(true);
    setPreviewCurrentPage(1);

    try {
      const pdfBytes = await buildPdf();
      setPreviewPdfBytes(pdfBytes);

      const calculatedPages = Math.ceil(images.length / gridMode);
      setPreviewTotalPages(calculatedPages);

      const thumb = await renderPdfThumbnail(pdfBytes, 1, 0.9);
      setPreviewThumbnailUrl(thumb);
    } catch (e) {
      console.error('Error generating preview:', e);
      alert('Impossible de générer l’aperçu du document.');
    } finally {
      setIsPreviewGenerating(false);
    }
  };

  const handlePreviewPageChange = async (newPage: number) => {
    if (!previewPdfBytes || newPage < 1 || newPage > previewTotalPages) return;
    setPreviewCurrentPage(newPage);
    setIsPreviewGenerating(true);
    try {
      const thumb = await renderPdfThumbnail(previewPdfBytes, newPage, 0.9);
      setPreviewThumbnailUrl(thumb);
    } catch (e) {
      console.error('Error rendering preview page:', e);
    } finally {
      setIsPreviewGenerating(false);
    }
  };

  const handleConvert = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      const pdfBytes = previewPdfBytes || (await buildPdf());
      const safeFilename = customFilename.endsWith('.pdf') ? customFilename : `${customFilename}.pdf`;
      downloadFile(pdfBytes, safeFilename);

      const calculatedPages = Math.ceil(images.length / gridMode);

      addRecentFile({
        name: safeFilename,
        toolName: 'Images en PDF',
        toolId: 'images-to-pdf',
        size: pdfBytes.byteLength,
        pageCount: calculatedPages,
        data: pdfBytes,
      });

      setSuccessMessage(`Document PDF généré avec succès (${calculatedPages} pages générées) !`);
      setShowPreviewModal(false);
    } catch (e) {
      console.error('Error converting images to PDF:', e);
      alert('Une erreur est survenue lors de la conversion des images.');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculatedPageCount = Math.ceil(images.length / gridMode);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Images en PDF</h1>
            <p className="text-xs text-slate-500">
              Convertissez vos images en document PDF avec contrôle des marges, formats étendus, grilles multi-images et pagination.
            </p>
          </div>
        </div>
      </div>

      {images.length === 0 ? (
        <DropZone
          onFilesSelected={handleImagesSelected}
          accept="image/png,image/jpeg,image/webp,image/*"
          multiple={true}
          title="Déposez ici les images à convertir"
          subtitle="Formats acceptés : JPG, PNG, WEBP"
        />
      ) : (
        <div className="space-y-6">
          {/* Why side margins occur banner & solution */}
          <div className="p-4 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-emerald-950 dark:text-emerald-100 text-xs">
                  Pourquoi l’image n’est pas affichée en entier comme page ?
                </span>
                <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                  Si le format choisi est fixe (ex: A4) ou si une marge &gt; 0 pt est appliquée, des bandes blanches apparaissent pour respecter les proportions ou les bordures. Pour que chaque image devienne <strong>100% la page entière sans bordures</strong>, utilisez le mode « Pleine page (0 marge) ».
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPageSize('fit');
                setMargin(0);
                setFitMode('contain');
                setPreviewPdfBytes(null);
              }}
              className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                pageSize === 'fit' && margin === 0
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{pageSize === 'fit' && margin === 0 ? '✓ Pleine page 100% active' : 'Activer Pleine page (0 marge)'}</span>
            </button>
          </div>

          {/* Configuration Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="text-xs text-slate-600 space-y-0.5">
                <span className="font-semibold text-slate-900">{images.length} image{images.length > 1 ? 's' : ''}</span> chargée{images.length > 1 ? 's' : ''}
                <span className="text-slate-400 mx-2">·</span>
                <span className="font-mono tabular-nums text-emerald-700 font-semibold">{calculatedPageCount} page{calculatedPageCount > 1 ? 's' : ''}</span> estimée{calculatedPageCount > 1 ? 's' : ''}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                    showAdvancedSettings
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Paramètres avancés</span>
                </button>

                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleImagesSelected(Array.from(e.target.files));
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setImages([])}
                  className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 cursor-pointer"
                >
                  Tout effacer
                </button>
              </div>
            </div>

            {/* Standard Layout Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Page Format */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Format de page</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(e.target.value as PageSizeOption);
                    setPreviewPdfBytes(null);
                  }}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="fit">Taille exacte de l’image (Format adaptatif)</option>
                  <option value="a4">A4 (Standard 210 x 297 mm)</option>
                  <option value="a3">A3 (Grand format 297 x 420 mm)</option>
                  <option value="a5">A5 (Format carnet 148 x 210 mm)</option>
                  <option value="letter">US Letter (216 x 279 mm)</option>
                  <option value="mobile_9_16">Smartphone vertical (9:16)</option>
                  <option value="square">Format Carré (1:1)</option>
                </select>
                <span className="text-[10px] text-slate-400 block">
                  {pageSize === 'fit' ? 'Chaque page épouse la taille de chaque image' : 'Format standardisé pour impression'}
                </span>
              </div>

              {/* Image Fit Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Ajustement de l’image</label>
                <select
                  value={fitMode}
                  onChange={(e) => {
                    setFitMode(e.target.value as 'contain' | 'cover');
                    setPreviewPdfBytes(null);
                  }}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="contain">✓ Image entière (Conserver tout sans couper)</option>
                  <option value="cover">Remplir la page (Peut rogner les bords)</option>
                </select>
                <span className="text-[10px] text-slate-400 block">
                  {fitMode === 'contain'
                    ? '100% de l’image et du texte visibles sans aucun rognage'
                    : 'Attention : zoom et coupe les bords haut/bas'}
                </span>
              </div>

              {/* Page Spacing / Margins */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <label>Espacement / Marges</label>
                  <span className="font-mono text-emerald-700 font-bold">
                    {margin} pt ({Math.round(margin * 0.35)} mm)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="5"
                  value={margin}
                  onChange={(e) => {
                    setMargin(Number(e.target.value));
                    setPreviewPdfBytes(null);
                  }}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <button
                    type="button"
                    onClick={() => { setMargin(0); setPreviewPdfBytes(null); }}
                    className={`hover:text-emerald-700 cursor-pointer ${margin === 0 ? 'font-bold text-emerald-700' : ''}`}
                  >
                    0 pt
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMargin(15); setPreviewPdfBytes(null); }}
                    className={`hover:text-emerald-700 cursor-pointer ${margin === 15 ? 'font-bold text-emerald-700' : ''}`}
                  >
                    15 pt
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMargin(30); setPreviewPdfBytes(null); }}
                    className={`hover:text-emerald-700 cursor-pointer ${margin === 30 ? 'font-bold text-emerald-700' : ''}`}
                  >
                    30 pt
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMargin(50); setPreviewPdfBytes(null); }}
                    className={`hover:text-emerald-700 cursor-pointer ${margin === 50 ? 'font-bold text-emerald-700' : ''}`}
                  >
                    50 pt
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMargin(80); setPreviewPdfBytes(null); }}
                    className={`hover:text-emerald-700 cursor-pointer ${margin === 80 ? 'font-bold text-emerald-700' : ''}`}
                  >
                    80 pt
                  </button>
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Couleur d’arrière-plan</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBackgroundColor('#FFFFFF');
                      setPreviewPdfBytes(null);
                    }}
                    className={`flex-1 py-1.5 text-xs rounded border transition-colors cursor-pointer ${
                      backgroundColor.toUpperCase() === '#FFFFFF'
                        ? 'bg-slate-900 text-white font-medium border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Blanc
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBackgroundColor('#000000');
                      setPreviewPdfBytes(null);
                    }}
                    className={`flex-1 py-1.5 text-xs rounded border transition-colors cursor-pointer ${
                      backgroundColor === '#000000'
                        ? 'bg-slate-900 text-white font-medium border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Noir
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Couleur visible autour des marges et bandes
                </span>
              </div>
            </div>

            {/* Advanced Settings Drawer */}
            {showAdvancedSettings && (
              <div className="mt-4 pt-4 border-t border-slate-200/80 bg-slate-50/80 rounded-xl p-4 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Paramètres avancés d’export</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Grid Layout (images per page) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <Grid2X2 className="w-3.5 h-3.5 text-slate-500" />
                      Images par page (Grille)
                    </label>
                    <select
                      value={gridMode}
                      onChange={(e) => {
                        setGridMode(Number(e.target.value) as ImageGridModeOption);
                        setPreviewPdfBytes(null);
                      }}
                      className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value={1}>1 image par page (standard)</option>
                      <option value={2}>2 images par page (planche)</option>
                      <option value={4}>4 images par page (grille 2x2)</option>
                    </select>
                  </div>

                  {/* Spacing between images in grid */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <label className="flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-slate-500" />
                        Espacement grille / pages
                      </label>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                        {gridGap} pt
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="5"
                      value={gridGap}
                      onChange={(e) => {
                        setGridGap(Number(e.target.value));
                        setPreviewPdfBytes(null);
                      }}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <button type="button" onClick={() => { setGridGap(0); setPreviewPdfBytes(null); }} className={`cursor-pointer hover:text-emerald-700 ${gridGap === 0 ? 'font-bold text-emerald-700 dark:text-emerald-400' : ''}`}>0 pt</button>
                      <button type="button" onClick={() => { setGridGap(10); setPreviewPdfBytes(null); }} className={`cursor-pointer hover:text-emerald-700 ${gridGap === 10 ? 'font-bold text-emerald-700 dark:text-emerald-400' : ''}`}>10 pt</button>
                      <button type="button" onClick={() => { setGridGap(20); setPreviewPdfBytes(null); }} className={`cursor-pointer hover:text-emerald-700 ${gridGap === 20 ? 'font-bold text-emerald-700 dark:text-emerald-400' : ''}`}>20 pt</button>
                      <button type="button" onClick={() => { setGridGap(35); setPreviewPdfBytes(null); }} className={`cursor-pointer hover:text-emerald-700 ${gridGap === 35 ? 'font-bold text-emerald-700 dark:text-emerald-400' : ''}`}>35 pt</button>
                    </div>
                  </div>

                  {/* Custom Filename */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      Nom du fichier PDF
                    </label>
                    <input
                      type="text"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      placeholder="mon_album_photos.pdf"
                      className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Page Numbers position if enabled */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-slate-500" />
                      Numérotation de page
                    </label>
                    <select
                      value={pageNumberPosition}
                      disabled={!showPageNumbers}
                      onChange={(e) => {
                        setPageNumberPosition(e.target.value as 'bottom-center' | 'bottom-right');
                        setPreviewPdfBytes(null);
                      }}
                      className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40 text-slate-800 dark:text-slate-100"
                    >
                      <option value="bottom-center">En bas au centre</option>
                      <option value="bottom-right">En bas à droite</option>
                    </select>
                  </div>
                </div>

                {/* Watermark Section */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableWatermark}
                        onChange={(e) => {
                          setEnableWatermark(e.target.checked);
                          setPreviewPdfBytes(null);
                        }}
                        className="rounded text-sky-600 accent-sky-600"
                      />
                      <Stamp className="w-3.5 h-3.5 text-sky-600" />
                      <span>Incruster un filigrane de sécurité lors de la création du PDF</span>
                    </label>

                    {enableWatermark && (
                      <span className="text-[10px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-medium border border-sky-200">
                        Filigrane actif
                      </span>
                    )}
                  </div>

                  {enableWatermark && (
                    <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-3 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Watermark Text */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                            <Type className="w-3 h-3 text-slate-500" />
                            Texte du filigrane
                          </label>
                          <input
                            type="text"
                            value={watermarkText}
                            onChange={(e) => {
                              setWatermarkText(e.target.value);
                              setPreviewPdfBytes(null);
                            }}
                            placeholder="CONFIDENTIEL"
                            className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                          />
                          {/* Quick preset chips */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {['CONFIDENTIEL', 'COPIE', 'PROJET', 'ARCHIVE', 'SPÉCIMEN'].map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => {
                                  setWatermarkText(chip);
                                  setPreviewPdfBytes(null);
                                }}
                                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                                  watermarkText === chip
                                    ? 'bg-sky-100 border-sky-300 text-sky-800 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Color & Opacity */}
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-semibold text-slate-700">Opacité</span>
                              <span className="font-mono text-[10px] text-sky-700 font-bold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                                {Math.round(watermarkOpacity * 100)} %
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.05"
                              max="0.9"
                              step="0.05"
                              value={watermarkOpacity}
                              onChange={(e) => {
                                setWatermarkOpacity(Number(e.target.value));
                                setPreviewPdfBytes(null);
                              }}
                              className="w-full accent-sky-600 cursor-pointer"
                            />
                          </div>

                          {/* Color picker */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="text-[11px] font-semibold text-slate-700 mr-1">Couleur :</span>
                            {['#DC2626', '#2563EB', '#64748B', '#0F172A', '#D97706', '#FFFFFF'].map((hex) => (
                              <button
                                key={hex}
                                type="button"
                                onClick={() => {
                                  setWatermarkColor(hex);
                                  setPreviewPdfBytes(null);
                                }}
                                className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                                  watermarkColor.toUpperCase() === hex.toUpperCase()
                                    ? 'scale-125 ring-2 ring-sky-500'
                                    : 'border-slate-300'
                                }`}
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                            <input
                              type="color"
                              value={watermarkColor}
                              onChange={(e) => {
                                setWatermarkColor(e.target.value);
                                setPreviewPdfBytes(null);
                              }}
                              className="w-5 h-5 rounded cursor-pointer border-0 p-0 ml-1"
                              title="Couleur personnalisée"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Position, Size & Rotation */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700">Emplacement</label>
                          <select
                            value={watermarkPosition}
                            onChange={(e) => {
                              setWatermarkPosition(e.target.value as any);
                              setPreviewPdfBytes(null);
                            }}
                            className="w-full text-xs px-2 py-1 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="center">Centré au milieu (Diagonal)</option>
                            <option value="top">En-tête (Haut)</option>
                            <option value="bottom">Pied de page (Bas)</option>
                            <option value="repeat">Mosaïque répétée</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-700 font-medium">Taille police</span>
                            <span className="font-mono text-[10px] text-slate-500">{watermarkFontSize} pt</span>
                          </div>
                          <input
                            type="range"
                            min="16"
                            max="72"
                            step="2"
                            value={watermarkFontSize}
                            onChange={(e) => {
                              setWatermarkFontSize(Number(e.target.value));
                              setPreviewPdfBytes(null);
                            }}
                            className="w-full accent-sky-600 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-700 font-medium">Rotation</span>
                            <span className="font-mono text-[10px] text-slate-500">{watermarkRotation}°</span>
                          </div>
                          <input
                            type="range"
                            min="-90"
                            max="90"
                            step="5"
                            value={watermarkRotation}
                            onChange={(e) => {
                              setWatermarkRotation(Number(e.target.value));
                              setPreviewPdfBytes(null);
                            }}
                            className="w-full accent-sky-600 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPageNumbers}
                      onChange={(e) => {
                        setShowPageNumbers(e.target.checked);
                        setPreviewPdfBytes(null);
                      }}
                      className="rounded text-emerald-600 accent-emerald-600"
                    />
                    <span>Numéroter les pages automatiquement (Page 1 / {calculatedPageCount})</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFilenameCaptions}
                      onChange={(e) => {
                        setShowFilenameCaptions(e.target.checked);
                        setPreviewPdfBytes(null);
                      }}
                      className="rounded text-emerald-600 accent-emerald-600"
                    />
                    <span>Afficher le nom du fichier sous chaque photo en légende</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Images List */}
          <div className="space-y-2.5">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-slate-600 dark:text-slate-300 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 p-0.5">
                    <img
                      src={img.dataUrl}
                      alt={img.file.name}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{img.file.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {img.width} × {img.height} px · {formatBytes(img.file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => {
                      moveUp(idx);
                      setPreviewPdfBytes(null);
                    }}
                    title="Monter"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === images.length - 1}
                    onClick={() => {
                      moveDown(idx);
                      setPreviewPdfBytes(null);
                    }}
                    title="Descendre"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeImage(img.id);
                      setPreviewPdfBytes(null);
                    }}
                    title="Supprimer"
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md cursor-pointer ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons: PREVIEW + SAVE */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-500">
              {pageSize === 'fit' && margin === 0 ? (
                <span className="text-emerald-700 font-semibold">
                  ✓ 100% plein écran sans aucune marge blanche latérale ({calculatedPageCount} page{calculatedPageCount > 1 ? 's' : ''}).
                </span>
              ) : (
                <span>
                  Génère un document PDF de {calculatedPageCount} page{calculatedPageCount > 1 ? 's' : ''} ({gridMode} image{gridMode > 1 ? 's' : ''} par page).
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Check Preview Button */}
              <button
                type="button"
                disabled={images.length === 0 || isPreviewGenerating}
                onClick={handleOpenPreview}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPreviewGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <Eye className="w-4 h-4 text-emerald-600" />
                )}
                <span>Vérifier l’aperçu du PDF</span>
              </button>

              {/* Direct Download Button */}
              <button
                type="button"
                disabled={isProcessing || images.length === 0}
                onClick={handleConvert}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Conversion en cours...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Enregistrer et Télécharger ({calculatedPageCount} pages)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Aperçu avant enregistrement
                </h3>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500 font-mono">
                  Page {previewCurrentPage} sur {previewTotalPages}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Pagination in header */}
                {previewTotalPages > 1 && (
                  <div className="flex items-center gap-1 mr-2">
                    <button
                      type="button"
                      disabled={previewCurrentPage <= 1}
                      onClick={() => handlePreviewPageChange(previewCurrentPage - 1)}
                      className="p-1 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                      title="Page précédente"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono px-1">
                      {previewCurrentPage} / {previewTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={previewCurrentPage >= previewTotalPages}
                      onClick={() => handlePreviewPageChange(previewCurrentPage + 1)}
                      className="p-1 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                      title="Page suivante"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-md cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Canvas Render */}
            <div className="flex-1 overflow-auto p-6 bg-slate-800/95 flex items-center justify-center min-h-[380px] max-h-[580px] relative">
              {isPreviewGenerating ? (
                <div className="flex flex-col items-center justify-center space-y-2 text-white">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                  <p className="text-xs text-slate-300">Génération de l’aperçu PDF...</p>
                </div>
              ) : previewThumbnailUrl ? (
                <div className="relative shadow-2xl rounded overflow-hidden max-w-full">
                  <img
                    src={previewThumbnailUrl}
                    alt={`Aperçu Page ${previewCurrentPage}`}
                    className="max-h-[520px] max-w-full object-contain border border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-400">Aucun aperçu disponible.</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
              <div className="text-xs text-slate-500">
                {pageSize === 'fit' && margin === 0 ? (
                  <span className="text-emerald-700 font-semibold">
                    ✓ Format sans marges : vos images s’affichent en plein écran sans bandes latérales.
                  </span>
                ) : (
                  <span>
                    Format : {pageSize.toUpperCase()} · Grille : {gridMode} img/page · Marges : {margin} pt
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  Modifier les réglages
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConvert}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Enregistrer et Télécharger</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
