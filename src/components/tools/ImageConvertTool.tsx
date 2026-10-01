import React, { useState, useRef } from 'react';
import {
  ImageIcon,
  Download,
  Loader2,
  CheckCircle2,
  Sliders,
  Sparkles,
  ArrowRight,
  Maximize2,
  RefreshCw,
  Plus,
  Trash2,
  FileArchive,
  Layers,
} from 'lucide-react';
import JSZip from 'jszip';
import { DropZone } from '../DropZone';
import { convertImageFormat } from '../../utils/mediaOperations';
import { formatBytes, downloadFile } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';
import { exportPresetToFile, importPresetFromFile } from '../../utils/presetManager';
import { FileCode, Upload } from 'lucide-react';

interface BatchImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  status: 'pending' | 'converting' | 'done' | 'error';
  result?: {
    blob: Blob;
    dataUrl: string;
    width: number;
    height: number;
    originalSize: number;
    newSize: number;
    savedPercent: number;
  };
  error?: string;
}

export const ImageConvertTool: React.FC = () => {
  const [items, setItems] = useState<BatchImageItem[]>([]);
  const [targetFormat, setTargetFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/webp');
  const [quality, setQuality] = useState<number>(0.82);
  const [resizeConstraint, setResizeConstraint] = useState<'none' | '1920' | '1280' | '800'>('none');

  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const presetInputRef = useRef<HTMLInputElement>(null);

  const handleExportPreset = () => {
    exportPresetToFile('image-convert', {
      targetFormat,
      quality,
      resizeConstraint,
    }, 'reglages_conversion_images');
    setPresetNotice('Paramètres de conversion exportés en JSON !');
    setTimeout(() => setPresetNotice(null), 4000);
  };

  const handleImportPreset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const preset = await importPresetFromFile<{
        targetFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
        quality?: number;
        resizeConstraint?: 'none' | '1920' | '1280' | '800';
      }>(file);
      if (preset.settings) {
        if (preset.settings.targetFormat) setTargetFormat(preset.settings.targetFormat);
        if (typeof preset.settings.quality === 'number') setQuality(preset.settings.quality);
        if (preset.settings.resizeConstraint) setResizeConstraint(preset.settings.resizeConstraint);
        setPresetNotice('Paramètres de conversion chargés depuis le JSON avec succès !');
      }
    } catch (err: any) {
      alert(`Erreur d'importation JSON : ${err.message}`);
    } finally {
      if (presetInputRef.current) presetInputRef.current.value = '';
      setTimeout(() => setPresetNotice(null), 4000);
    }
  };

  const handleFilesSelect = (files: File[]) => {
    if (files.length === 0) return;

    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setItems((prev) => [
            ...prev,
            {
              id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              file: f,
              name: f.name,
              size: f.size,
              previewUrl: url,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              status: 'pending',
            },
          ]);
        };
        img.src = url;
      };
      reader.readAsDataURL(f);
    });
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

  // Convert batch
  const handleConvertBatch = async () => {
    if (items.length === 0 || isConverting) return;
    setIsConverting(true);

    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      setCurrentIndex(i);
      const currentItem = updated[i];
      currentItem.status = 'converting';
      setItems([...updated]);

      try {
        let targetW: number | undefined;
        let targetH: number | undefined;

        if (resizeConstraint !== 'none') {
          const maxDim = parseInt(resizeConstraint, 10);
          const maxCurrent = Math.max(currentItem.naturalWidth, currentItem.naturalHeight);
          if (maxCurrent > maxDim) {
            const scale = maxDim / maxCurrent;
            targetW = Math.round(currentItem.naturalWidth * scale);
            targetH = Math.round(currentItem.naturalHeight * scale);
          }
        }

        const res = await convertImageFormat(
          currentItem.file,
          targetFormat,
          quality,
          targetW,
          targetH
        );

        const savedPercent =
          currentItem.size > 0
            ? Math.round(((currentItem.size - res.newSize) / currentItem.size) * 100)
            : 0;

        currentItem.status = 'done';
        currentItem.result = {
          ...res,
          savedPercent,
        };

        const ext = targetFormat === 'image/jpeg' ? 'jpg' : targetFormat === 'image/png' ? 'png' : 'webp';
        const baseName = currentItem.name.replace(/\.[^/.]+$/, '');
        const outName = `${baseName}_optimise.${ext}`;

        addRecentFile({
          name: outName,
          toolName: 'Convertisseur Image',
          toolId: 'image-convert',
          size: res.newSize,
          pageCount: 1,
        });
      } catch (err) {
        console.error(`Error converting ${currentItem.name}:`, err);
        currentItem.status = 'error';
        currentItem.error = 'Échec de la conversion';
      }

      setItems([...updated]);
    }

    setIsConverting(false);
  };

  const downloadSingle = (item: BatchImageItem) => {
    if (!item.result) return;
    const ext = targetFormat === 'image/jpeg' ? 'jpg' : targetFormat === 'image/png' ? 'png' : 'webp';
    const baseName = item.name.replace(/\.[^/.]+$/, '');
    downloadFile(item.result.blob, `${baseName}_optimise.${ext}`, targetFormat);
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
      const ext = targetFormat === 'image/jpeg' ? 'jpg' : targetFormat === 'image/png' ? 'png' : 'webp';

      doneItems.forEach((item) => {
        if (item.result) {
          const baseName = item.name.replace(/\.[^/.]+$/, '');
          zip.file(`${baseName}_optimise.${ext}`, item.result.blob);
        }
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadFile(zipBlob, `images_converties_${items.length}fichiers.zip`, 'application/zip');
    } catch (err) {
      console.error('Error generating zip:', err);
      alert('Erreur lors de la création du fichier ZIP.');
    } finally {
      setIsZipping(false);
    }
  };

  // Stats
  const totalOriginalSize = items.reduce((acc, it) => acc + it.size, 0);
  const doneItems = items.filter((it) => it.status === 'done' && it.result);
  const totalNewSize = doneItems.reduce((acc, it) => acc + (it.result?.newSize || 0), 0);
  const totalSavedBytes = doneItems.reduce((acc, it) => acc + (it.size - (it.result?.newSize || 0)), 0);
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
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Convertisseur & Compresseur d’Images</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Traitement par lot
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Glissez plusieurs images pour les convertir (WEBP, JPG, PNG) et optimiser leur poids en lot.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* JSON Presets Controls */}
            <input
              ref={presetInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportPreset}
            />
            <button
              type="button"
              onClick={handleExportPreset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Exporter les réglages de conversion en fichier JSON"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sauvegarder réglages (JSON)</span>
            </button>
            <button
              type="button"
              onClick={() => presetInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Charger un fichier de réglages JSON"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Charger (JSON)</span>
            </button>

            {items.length > 0 && (
              <>
                <input
                  ref={addFileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleAddMoreFiles}
                />
                <button
                  type="button"
                  onClick={() => addFileInputRef.current?.click()}
                  disabled={isConverting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ajouter des images</span>
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={isConverting}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                  title="Vider la liste"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {presetNotice && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{presetNotice}</span>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <DropZone
          onFilesSelected={handleFilesSelect}
          multiple={true}
          accept="image/*"
          title="Déposez vos images à convertir ou compresser"
          subtitle="Glissez un ou plusieurs fichiers (JPG, PNG, WEBP, GIF, SVG) pour traitement par lot"
          onUseSample={() => {}}
          isGeneratingSample={false}
        />
      ) : (
        <div className="space-y-6">
          {/* Conversion & Compression Settings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">Paramètres appliqués à l'ensemble du lot</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {items.length} image{items.length > 1 ? 's' : ''} · Total : {formatBytes(totalOriginalSize)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Target Format */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Format de sortie</label>
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value as any)}
                  disabled={isConverting}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="image/webp">WEBP (Ultra léger, Recommandé)</option>
                  <option value="image/jpeg">JPEG (Haute compatibilité web/photo)</option>
                  <option value="image/png">PNG (Sans perte & Transparence)</option>
                </select>
              </div>

              {/* Quality Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <label>Qualité / Compression</label>
                  <span className="text-emerald-600 font-mono font-bold">
                    {Math.round(quality * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  disabled={isConverting || targetFormat === 'image/png'}
                  className="w-full accent-emerald-600 cursor-pointer disabled:opacity-50 mt-2"
                />
                <span className="text-[10px] text-slate-400 block">
                  {targetFormat === 'image/png'
                    ? 'PNG est non compressé avec pertes'
                    : quality >= 0.9
                    ? 'Qualité maximale (fichier plus lourd)'
                    : quality >= 0.75
                    ? 'Qualité optimale pour le web'
                    : 'Forte compression (très léger)'}
                </span>
              </div>

              {/* Dimensions Constraint */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Redimensionnement</label>
                <select
                  value={resizeConstraint}
                  onChange={(e) => setResizeConstraint(e.target.value as any)}
                  disabled={isConverting}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="none">Dimensions originales</option>
                  <option value="1920">Max 1920 px (Full HD)</option>
                  <option value="1280">Max 1280 px (HD Web standard)</option>
                  <option value="800">Max 800 px (Miniatures & Réseaux)</option>
                </select>
                <span className="text-[10px] text-slate-400 block">
                  Conserve toujours les proportions d'origine.
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar during Batch Processing */}
          {isConverting && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>
                    Conversion du lot : {currentIndex + 1} / {items.length} image{items.length > 1 ? 's' : ''}...
                  </span>
                </div>
                <span className="font-mono">{Math.round(((currentIndex + 1) / items.length) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-emerald-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
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
                      Lot de {doneItems.length} image{doneItems.length > 1 ? 's' : ''} converti & compressé avec succès !
                    </h3>
                    <p className="text-xs text-emerald-800">
                      Poids total original : {formatBytes(totalOriginalSize)} → Nouveau poids :{' '}
                      <span className="font-bold">{formatBytes(totalNewSize)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                    {overallSavedPercent > 0 ? `-${overallSavedPercent}% d’espace` : 'Optimisé'}
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

          {/* Images Queue / Processed List */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Images du lot ({items.length})
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Poids cumulé : {formatBytes(totalOriginalSize)}
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[440px] overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    item.status === 'converting'
                      ? 'bg-emerald-50/40'
                      : item.status === 'done'
                      ? 'bg-emerald-50/20'
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                      <img
                        src={item.result?.dataUrl || item.previewUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>
                          {item.naturalWidth}x{item.naturalHeight}px
                        </span>
                        <span>·</span>
                        <span>{formatBytes(item.size)}</span>
                        {item.result && (
                          <>
                            <span>→</span>
                            <span className="text-emerald-700 font-bold">
                              {formatBytes(item.result.newSize)} ({item.result.width}x{item.result.height}px)
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

                    {item.status === 'converting' && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
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

                    {!isConverting && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Retirer cette image"
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
              Traitement 100% exécuté localement dans votre navigateur (accélération matérielle HTML5 Canvas).
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
                  <span>Télécharger l’archive ({doneItems.length} images)</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isConverting || items.length === 0}
                  onClick={handleConvertBatch}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Conversion du lot ({currentIndex + 1}/{items.length})...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Convertir & Compresser {items.length > 1 ? `les ${items.length} images` : "l'image"}</span>
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
