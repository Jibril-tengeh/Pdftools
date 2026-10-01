import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Download,
  Loader2,
  CheckCircle2,
  FileText,
  TrendingDown,
  Sparkles,
  Plus,
  Trash2,
  FileArchive,
  Layers,
  AlertCircle,
} from 'lucide-react';
import JSZip from 'jszip';
import { DropZone } from '../DropZone';
import { compressPdf, downloadFile, formatBytes, getPdfPageCount } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';

interface BatchPdfItem {
  id: string;
  name: string;
  size: number;
  buffer: ArrayBuffer;
  pageCount: number;
  status: 'pending' | 'compressing' | 'done' | 'error';
  result?: {
    bytes: Uint8Array;
    originalSize: number;
    newSize: number;
    savedPercent: number;
  };
  error?: string;
}

interface CompressPdfToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const CompressPdfTool: React.FC<CompressPdfToolProps> = ({
  onUseSample,
  isGeneratingSample,
  sampleBuffer,
}) => {
  const [items, setItems] = useState<BatchPdfItem[]>([]);
  const [compressionMode, setCompressionMode] = useState<'low' | 'medium' | 'high'>('medium');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sampleBuffer && items.length === 0) {
      loadSingleBuffer(sampleBuffer, 'document_exemple.pdf');
    }
  }, [sampleBuffer]);

  const loadSingleBuffer = async (rawBuffer: ArrayBuffer, name: string) => {
    let pCount = 1;
    try {
      pCount = await getPdfPageCount(rawBuffer);
    } catch (e) {
      console.error('Error counting pages:', e);
    }

    setItems([
      {
        id: `${Date.now()}_${Math.random()}`,
        name,
        size: rawBuffer.byteLength,
        buffer: rawBuffer,
        pageCount: pCount,
        status: 'pending',
      },
    ]);
  };

  const handleFilesSelect = async (files: File[]) => {
    if (files.length === 0) return;

    const newItems: BatchPdfItem[] = [];
    for (const f of files) {
      try {
        const buf = await f.arrayBuffer();
        let pCount = 1;
        try {
          pCount = await getPdfPageCount(buf);
        } catch {
          // fallback
        }
        newItems.push({
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: f.name,
          size: f.size,
          buffer: buf,
          pageCount: pCount,
          status: 'pending',
        });
      } catch (err) {
        console.error('Error reading PDF file:', err);
      }
    }

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleAddMoreFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesSelect(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    setItems([]);
    setCurrentIndex(0);
  };

  // Launch batch compression
  const handleCompressBatch = async () => {
    if (items.length === 0 || isCompressing) return;
    setIsCompressing(true);

    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      setCurrentIndex(i);
      const currentItem = updated[i];

      // Update status to compressing
      currentItem.status = 'compressing';
      setItems([...updated]);

      try {
        const res = await compressPdf(currentItem.buffer, compressionMode);
        currentItem.status = 'done';
        currentItem.result = {
          bytes: res.compressedBytes,
          originalSize: res.originalSize,
          newSize: res.newSize,
          savedPercent: res.savedPercent,
        };

        const baseName = currentItem.name.replace(/\.[^/.]+$/, '');
        const outName = `${baseName}_compresse.pdf`;

        addRecentFile({
          name: outName,
          toolName: 'Compresser PDF',
          toolId: 'compress',
          size: res.newSize,
          pageCount: currentItem.pageCount,
          data: res.compressedBytes,
        });
      } catch (err) {
        console.error(`Error compressing ${currentItem.name}:`, err);
        currentItem.status = 'error';
        currentItem.error = 'Échec de la compression';
      }

      setItems([...updated]);
    }

    setIsCompressing(false);
  };

  const downloadSingle = (item: BatchPdfItem) => {
    if (!item.result) return;
    const baseName = item.name.replace(/\.[^/.]+$/, '');
    downloadFile(item.result.bytes, `${baseName}_compresse.pdf`);
  };

  // Download all as ZIP
  const downloadAllAsZip = async () => {
    const doneItems = items.filter((item) => item.result);
    if (doneItems.length === 0) return;

    if (doneItems.length === 1) {
      downloadSingle(doneItems[0]);
      return;
    }

    setIsZipping(true);
    try {
      const zip = new JSZip();
      doneItems.forEach((item) => {
        if (item.result) {
          const baseName = item.name.replace(/\.[^/.]+$/, '');
          zip.file(`${baseName}_compresse.pdf`, item.result.bytes);
        }
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFile(zipBlob, `documents_pdf_compresses_${items.length}fichiers.zip`, 'application/zip');
    } catch (err) {
      console.error('Error generating zip:', err);
      alert('Erreur lors de la génération de l’archive ZIP.');
    } finally {
      setIsZipping(false);
    }
  };

  // Aggregated calculations
  const totalOriginalSize = items.reduce((acc, it) => acc + it.size, 0);
  const doneItems = items.filter((it) => it.status === 'done' && it.result);
  const totalNewSize = doneItems.reduce((acc, it) => acc + (it.result?.newSize || 0), 0);
  const totalSavedBytes = doneItems.reduce((acc, it) => acc + ((it.result?.originalSize || 0) - (it.result?.newSize || 0)), 0);
  const overallSavedPercent =
    totalOriginalSize > 0 && doneItems.length === items.length
      ? Math.max(0, Math.round((totalSavedBytes / totalOriginalSize) * 100))
      : 0;

  const isAllDone = items.length > 0 && items.every((it) => it.status === 'done' || it.status === 'error');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Compresser des PDF</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Traitement par lot
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Glissez un ou plusieurs fichiers PDF pour les optimiser et réduire leur taille en une seule fois.
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                ref={addFileInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleAddMoreFiles}
              />
              <button
                type="button"
                onClick={() => addFileInputRef.current?.click()}
                disabled={isCompressing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                <span>Ajouter des PDF</span>
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={isCompressing}
                className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                title="Vider la liste"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <DropZone
          onFilesSelected={handleFilesSelect}
          multiple={true}
          title="Déposez vos documents PDF à compresser"
          subtitle="Glissez un ou plusieurs fichiers PDF pour un traitement par lot instantané"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-6">
          {/* Compression Level Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Niveau d’optimisation appliqué à tous les fichiers
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {items.length} document{items.length > 1 ? 's' : ''} · Total : {formatBytes(totalOriginalSize)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() => !isCompressing && setCompressionMode('low')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  compressionMode === 'low'
                    ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                } ${isCompressing ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <span className="text-xs font-bold text-slate-900 block">Légère compression</span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Conserve la qualité d'impression maximale.
                </span>
              </div>

              <div
                onClick={() => !isCompressing && setCompressionMode('medium')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  compressionMode === 'medium'
                    ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                } ${isCompressing ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Recommandé</span>
                  <span className="text-[9px] text-amber-700 bg-amber-100 font-bold px-1.5 py-0.5 rounded">
                    Équilibré
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Meilleur ratio taille / lisibilité pour le partage.
                </span>
              </div>

              <div
                onClick={() => !isCompressing && setCompressionMode('high')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  compressionMode === 'high'
                    ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                } ${isCompressing ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <span className="text-xs font-bold text-slate-900 block">Forte compression</span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Taille minimale pour les pièces jointes d'e-mails.
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar during Batch Processing */}
          {isCompressing && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span>
                    Compression en cours : {currentIndex + 1} / {items.length} fichier{items.length > 1 ? 's' : ''}...
                  </span>
                </div>
                <span className="font-mono">{Math.round(((currentIndex + 1) / items.length) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-amber-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-600 transition-all duration-300 rounded-full"
                  style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Batch Overall Summary when all done */}
          {isAllDone && doneItems.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3 shadow-xs animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">
                      Lot de {doneItems.length} fichier{doneItems.length > 1 ? 's' : ''} compressé avec succès !
                    </h3>
                    <p className="text-xs text-emerald-800">
                      Taille totale originale : {formatBytes(totalOriginalSize)} → Nouvelle taille :{' '}
                      <span className="font-bold">{formatBytes(totalNewSize)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                    {overallSavedPercent > 0 ? `-${overallSavedPercent}% au total` : 'Optimisé'}
                  </span>
                  <button
                    type="button"
                    onClick={downloadAllAsZip}
                    disabled={isZipping}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isZipping ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileArchive className="w-3.5 h-3.5" />
                    )}
                    <span>Télécharger tout (Archive ZIP)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Files List in Queue / Processed */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Fichiers PDF à traiter ({items.length})
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Poids cumulé : {formatBytes(totalOriginalSize)}
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    item.status === 'compressing'
                      ? 'bg-amber-50/40'
                      : item.status === 'done'
                      ? 'bg-emerald-50/20'
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.status === 'done'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'compressing'
                          ? 'bg-amber-100 text-amber-700 animate-pulse'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.status === 'compressing' ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      ) : item.status === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>{formatBytes(item.size)}</span>
                        <span>·</span>
                        <span>{item.pageCount} page{item.pageCount > 1 ? 's' : ''}</span>
                        {item.result && (
                          <>
                            <span>→</span>
                            <span className="text-emerald-700 font-bold">
                              {formatBytes(item.result.newSize)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {item.status === 'pending' && (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        En attente
                      </span>
                    )}

                    {item.status === 'compressing' && (
                      <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Traitement...
                      </span>
                    )}

                    {item.status === 'done' && item.result && (
                      <>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          {item.result.savedPercent > 0 ? `-${item.result.savedPercent}%` : 'Optimisé'}
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadSingle(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Download className="w-3 h-3" />
                          <span>Télécharger</span>
                        </button>
                      </>
                    )}

                    {item.status === 'error' && (
                      <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-bold">
                        Erreur
                      </span>
                    )}

                    {!isCompressing && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Retirer ce fichier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <span className="text-xs text-slate-500">
              Compression 100% exécutée dans votre navigateur via WebAssembly. Vos données restent strictement confidentielles.
            </span>

            <div className="flex items-center gap-3">
              {isAllDone && doneItems.length > 0 ? (
                <button
                  type="button"
                  onClick={downloadAllAsZip}
                  disabled={isZipping}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isZipping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileArchive className="w-4 h-4" />
                  )}
                  <span>Télécharger l’archive ({doneItems.length} PDF)</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isCompressing || items.length === 0}
                  onClick={handleCompressBatch}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCompressing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Compression du lot ({currentIndex + 1}/{items.length})...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Compresser {items.length > 1 ? `les ${items.length} PDF` : 'le Document'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
