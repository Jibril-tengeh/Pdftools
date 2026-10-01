import React, { useState, useEffect } from 'react';
import {
  FileImage,
  Download,
  Loader2,
  CheckCircle2,
  FileArchive,
  RefreshCw,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';
import JSZip from 'jszip';
import { DropZone } from '../DropZone';
import { convertPdfToImages, downloadFile, formatBytes, type ConvertedPageImage } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';

interface PdfToImagesToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const PdfToImagesTool: React.FC<PdfToImagesToolProps> = ({
  onUseSample,
  isGeneratingSample,
  sampleBuffer,
}) => {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [format, setFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [qualityScale, setQualityScale] = useState<number>(2.0); // 1.5x, 2.0x, 3.0x
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [pageImages, setPageImages] = useState<ConvertedPageImage[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  useEffect(() => {
    if (sampleBuffer && !buffer) {
      loadBuffer(sampleBuffer, 'document_exemple.pdf');
    }
  }, [sampleBuffer]);

  const loadBuffer = async (rawBuffer: ArrayBuffer, name: string) => {
    setBuffer(rawBuffer);
    setFileName(name);
    setPageImages([]);
    setPreviewImage(null);
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buf = await f.arrayBuffer();
    loadBuffer(buf, f.name);
  };

  const handleStartConversion = async () => {
    if (!buffer) return;
    setIsConverting(true);
    setProgress({ current: 0, total: 0 });

    try {
      const results = await convertPdfToImages(
        buffer,
        format,
        qualityScale,
        (current, total) => {
          setProgress({ current, total });
        }
      );
      setPageImages(results);

      addRecentFile({
        name: `${fileName.replace(/\.[^/.]+$/, '')}_images.zip`,
        toolName: 'PDF en Images',
        toolId: 'pdf-to-images',
        size: results.reduce((acc, curr) => acc + curr.blob.size, 0),
        pageCount: results.length,
      });
    } catch (e) {
      console.error('Conversion error:', e);
      alert('Une erreur est survenue lors de la conversion des pages en images.');
    } finally {
      setIsConverting(false);
    }
  };

  const downloadSingleImage = (img: ConvertedPageImage) => {
    const ext = format === 'image/png' ? 'png' : 'jpg';
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    downloadFile(img.blob, `${baseName}_page_${img.pageNumber}.${ext}`, format);
  };

  const downloadAllAsZip = async () => {
    if (pageImages.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const ext = format === 'image/png' ? 'png' : 'jpg';
      const baseName = fileName.replace(/\.[^/.]+$/, '');

      pageImages.forEach((img) => {
        zip.file(`${baseName}_page_${img.pageNumber}.${ext}`, img.blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFile(zipBlob, `${baseName}_images.zip`, 'application/zip');
    } catch (err) {
      console.error('Zip generation error:', err);
      alert('Erreur lors de la création du fichier ZIP.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <FileImage className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Convertir un PDF en Images</h1>
            <p className="text-xs text-slate-500">
              Extrayez chaque page de votre PDF en image JPG ou PNG haute résolution directement dans votre navigateur.
            </p>
          </div>
        </div>
      </div>

      {!buffer ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          title="Déposez le PDF à convertir en images"
          subtitle="Sélectionnez un document PDF"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-6">
          {/* Options & Action Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-sm font-bold text-slate-900 truncate block">
                  {fileName}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Prêt pour la conversion haute résolution
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBuffer(null);
                  setPageImages([]);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer self-start sm:self-auto"
              >
                Changer de document
              </button>
            </div>

            {/* Quality & Format Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Format d’image de sortie</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('image/jpeg')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      format === 'image/jpeg'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    JPG (Recommandé, léger)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('image/png')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      format === 'image/png'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    PNG (Haute fidélité sans perte)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Résolution et netteté (DPI)</label>
                <select
                  value={qualityScale}
                  onChange={(e) => setQualityScale(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value={1.5}>Standard 150 DPI (Écran, rapide)</option>
                  <option value={2.0}>Haute Définition 200 DPI (Recommandé)</option>
                  <option value={3.0}>Ultra HD 300 DPI (Qualité Impression)</option>
                </select>
              </div>
            </div>

            {/* Launch button */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                Traitement instantané et privé : aucun fichier n’est envoyé sur un serveur distant.
              </span>

              <button
                type="button"
                disabled={isConverting}
                onClick={handleStartConversion}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Conversion page {progress.current} / {progress.total}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extraire toutes les pages en images</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Grid */}
          {pageImages.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {pageImages.length} page{pageImages.length > 1 ? 's' : ''} convertie{pageImages.length > 1 ? 's' : ''} avec succès
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Téléchargez les images une par une ou en une seule archive ZIP
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isZipping}
                  onClick={downloadAllAsZip}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                >
                  {isZipping ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Compression ZIP...</span>
                    </>
                  ) : (
                    <>
                      <FileArchive className="w-3.5 h-3.5" />
                      <span>Tout Télécharger en ZIP</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {pageImages.map((img) => (
                  <div
                    key={img.pageNumber}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div
                      onClick={() => setPreviewImage(img.dataUrl)}
                      className="aspect-3/4 bg-slate-100 relative overflow-hidden cursor-pointer"
                    >
                      <img
                        src={img.dataUrl}
                        alt={`Page ${img.pageNumber}`}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">Page {img.pageNumber}</span>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {img.width}x{img.height} · {formatBytes(img.blob.size)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => downloadSingleImage(img)}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md cursor-pointer transition-colors"
                        title="Télécharger cette image"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Preview */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 relative">
            <img
              src={previewImage}
              alt="Aperçu pleine taille"
              className="max-h-[85vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
