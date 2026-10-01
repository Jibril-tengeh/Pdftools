import React, { useState, useEffect, useRef } from 'react';
import {
  Stamp,
  Download,
  Loader2,
  CheckCircle2,
  Sliders,
  Type,
  Eye,
  Plus,
  Trash2,
  Layers,
  Palette,
  Sparkles,
  FileCode,
  Upload,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { renderPdfThumbnail, addMultipleWatermarksToPdf, downloadFile } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';
import { exportPresetToFile, importPresetFromFile } from '../../utils/presetManager';
import { PDFDocument } from 'pdf-lib';
import type { WatermarkItem } from '../../types';

interface WatermarkToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const WatermarkTool: React.FC<WatermarkToolProps> = ({
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

  // Multiple watermarks support
  const [watermarks, setWatermarks] = useState<WatermarkItem[]>([
    {
      id: 'wm-1',
      text: 'CONFIDENTIEL',
      color: '#DC2626',
      fontSize: 44,
      opacity: 0.35,
      rotation: 45,
      position: 'center',
      applyTo: 'all',
      customPages: '',
    },
  ]);

  const [activeWatermarkId, setActiveWatermarkId] = useState<string>('wm-1');
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const presetInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleExportWatermarkPreset = () => {
    exportPresetToFile('watermark', watermarks, 'filigranes_personnalises');
    setPresetNotice('Réglages de filigrane exportés dans le fichier JSON !');
    setTimeout(() => setPresetNotice(null), 4000);
  };

  const handleImportWatermarkPreset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const preset = await importPresetFromFile<WatermarkItem[]>(file);
      if (Array.isArray(preset.settings) && preset.settings.length > 0) {
        setWatermarks(preset.settings);
        setActiveWatermarkId(preset.settings[0].id || 'wm-1');
        setPresetNotice(`Préférences de ${preset.settings.length} filigrane(s) chargées avec succès !`);
      } else {
        throw new Error('Structure de filigrane invalide');
      }
    } catch (err: any) {
      alert(`Erreur d'importation : ${err.message}`);
    } finally {
      if (presetInputRef.current) presetInputRef.current.value = '';
      setTimeout(() => setPresetNotice(null), 4000);
    }
  };

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
      console.error('Error loading PDF for watermark:', e);
      alert('Impossible de charger ce fichier PDF.');
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

  const addWatermarkLayer = () => {
    const newId = `wm-${Date.now()}`;
    const newWm: WatermarkItem = {
      id: newId,
      text: 'COPIE CERTIFIÉE',
      color: '#2563EB',
      fontSize: 28,
      opacity: 0.4,
      rotation: 0,
      position: 'bottom',
      applyTo: 'all',
      customPages: '',
    };
    setWatermarks((prev) => [...prev, newWm]);
    setActiveWatermarkId(newId);
  };

  const removeWatermarkLayer = (id: string) => {
    if (watermarks.length <= 1) return;
    setWatermarks((prev) => {
      const filtered = prev.filter((w) => w.id !== id);
      if (activeWatermarkId === id && filtered.length > 0) {
        setActiveWatermarkId(filtered[0].id);
      }
      return filtered;
    });
  };

  const updateActiveWatermark = (changes: Partial<WatermarkItem>) => {
    setWatermarks((prev) =>
      prev.map((w) => (w.id === activeWatermarkId ? { ...w, ...changes } : w))
    );
  };

  const activeWm = watermarks.find((w) => w.id === activeWatermarkId) || watermarks[0];

  // Live Canvas Preview with ALL watermarks combined
  useEffect(() => {
    if (!pageThumbnail || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw background page
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Render each watermark in order
      for (const wm of watermarks) {
        if (!wm.text.trim()) continue;

        ctx.save();
        ctx.globalAlpha = wm.opacity;
        ctx.fillStyle = wm.color;
        ctx.font = `bold ${wm.fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (wm.position === 'center') {
          ctx.translate(cx, cy);
          ctx.rotate((wm.rotation * Math.PI) / 180);
          ctx.fillText(wm.text, 0, 0);
        } else if (wm.position === 'top') {
          ctx.fillText(wm.text, cx, wm.fontSize + 25);
        } else if (wm.position === 'bottom') {
          ctx.fillText(wm.text, cx, canvas.height - 30);
        } else if (wm.position === 'repeat') {
          ctx.rotate((wm.rotation * Math.PI) / 180);
          const stepX = 220;
          const stepY = 150;
          for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
            for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
              ctx.fillText(wm.text, x, y);
            }
          }
        }

        ctx.restore();
      }
    };
    img.src = pageThumbnail;
  }, [pageThumbnail, watermarks]);

  const handleApplyWatermarks = async () => {
    if (!buffer) return;
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      const watermarkedBytes = await addMultipleWatermarksToPdf(buffer, watermarks);
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const outName = `${baseName}_filigrane.pdf`;
      downloadFile(watermarkedBytes, outName);

      addRecentFile({
        name: outName,
        toolName: watermarks.length > 1 ? `Filigranes (${watermarks.length})` : 'Filigrane',
        toolId: 'watermark',
        size: watermarkedBytes.byteLength,
        pageCount: totalPages,
        data: watermarkedBytes,
      });

      setSuccessMessage(
        `${watermarks.length} filigrane${watermarks.length > 1 ? 's' : ''} appliqué${
          watermarks.length > 1 ? 's' : ''
        } avec succès sur le document !`
      );
    } catch (e) {
      console.error('Error applying watermark:', e);
      alert('Une erreur est survenue lors de l’ajout du filigrane.');
    } finally {
      setIsProcessing(false);
    }
  };

  const quickPresets = ['CONFIDENTIEL', 'COPIE CERTIFIÉE', 'BROUILLON', 'SPÉCIMEN', 'ARCHIVE', 'ORIGINAL', 'NE PAS DIFFUSER'];
  const colorOptions = [
    { label: 'Rouge', hex: '#DC2626' },
    { label: 'Bleu', hex: '#2563EB' },
    { label: 'Gris sobre', hex: '#64748B' },
    { label: 'Noir profond', hex: '#0F172A' },
    { label: 'Ambre / Or', hex: '#D97706' },
    { label: 'Vert émeraude', hex: '#059669' },
    { label: 'Blanc (pour fond sombre)', hex: '#FFFFFF' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shadow-2xs">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Ajouter un Filigrane (Simple ou Multiple)</h1>
              <p className="text-xs text-slate-500">
                Incrustez un ou plusieurs filigranes textuels personnalisés avec réglage fin de l’opacité (0–100%) et prévisualisation en temps réel.
              </p>
            </div>
          </div>

          {/* JSON Presets Controls */}
          <div className="flex items-center gap-2">
            <input
              ref={presetInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportWatermarkPreset}
            />
            <button
              type="button"
              onClick={handleExportWatermarkPreset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Exporter les réglages actuels dans un fichier JSON"
            >
              <FileCode className="w-3.5 h-3.5 text-sky-600" />
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
          </div>
        </div>

        {presetNotice && (
          <div className="mt-3 p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 font-medium flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{presetNotice}</span>
          </div>
        )}
      </div>

      {!buffer ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          title="Déposez le fichier PDF à filigraner"
          subtitle="Sélectionnez un document PDF"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Watermarks Configuration (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
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

              {/* Watermarks Tabs / Layers Manager */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5 text-sky-600" />
                    Filigranes actifs ({watermarks.length})
                  </span>

                  <button
                    type="button"
                    onClick={addWatermarkLayer}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un autre filigrane</span>
                  </button>
                </div>

                {/* Layer pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {watermarks.map((wm, idx) => (
                    <div
                      key={wm.id}
                      onClick={() => setActiveWatermarkId(wm.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        activeWatermarkId === wm.id
                          ? 'bg-sky-50 border-sky-400 text-sky-900 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20"
                        style={{ backgroundColor: wm.color }}
                      />
                      <span className="truncate max-w-[120px]">
                        {wm.text || `Filigrane #${idx + 1}`}
                      </span>

                      {watermarks.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeWatermarkLayer(wm.id);
                          }}
                          className="text-slate-400 hover:text-rose-600 ml-1"
                          title="Supprimer ce calque"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Watermark Settings Form */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
                {/* Text Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-slate-500" />
                    Texte du filigrane
                  </label>
                  <input
                    type="text"
                    value={activeWm.text}
                    onChange={(e) => updateActiveWatermark({ text: e.target.value })}
                    placeholder="CONFIDENTIEL"
                    className="w-full text-sm px-3.5 py-2 font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />

                  {/* Preset Quick Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {quickPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => updateActiveWatermark({ text: preset })}
                        className={`px-2 py-0.5 text-[11px] rounded border transition-colors cursor-pointer ${
                          activeWm.text === preset
                            ? 'bg-sky-100 border-sky-300 text-sky-800 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity Slider with Precise Percentage Display */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">
                      Opacité du filigrane
                    </span>
                    <span className="font-mono tabular-nums text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      {Math.round(activeWm.opacity * 100)} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={activeWm.opacity}
                    onChange={(e) =>
                      updateActiveWatermark({ opacity: Number(e.target.value) })
                    }
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Très transparent (5%)</span>
                    <span>Moyen (40%)</span>
                    <span>Opaque (100%)</span>
                  </div>
                </div>

                {/* Color Palette & Custom Hex */}
                <div className="space-y-2 pt-1 border-t border-slate-200/60">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-slate-500" />
                    Couleur du filigrane
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    {colorOptions.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => updateActiveWatermark({ color: c.hex })}
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                          activeWm.color.toUpperCase() === c.hex.toUpperCase()
                            ? 'scale-110 ring-2 ring-sky-500 shadow-xs'
                            : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {activeWm.color.toUpperCase() === c.hex.toUpperCase() && (
                          <span
                            className={`text-[10px] font-bold ${
                              c.hex === '#FFFFFF' ? 'text-black' : 'text-white'
                            }`}
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    ))}

                    <div className="flex items-center gap-1.5 ml-1 border-l border-slate-200 pl-2">
                      <input
                        type="color"
                        value={activeWm.color}
                        onChange={(e) => updateActiveWatermark({ color: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                        title="Couleur personnalisée"
                      />
                      <span className="font-mono text-[11px] text-slate-600 uppercase">
                        {activeWm.color}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Size & Rotation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium">Taille de police</span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {activeWm.fontSize} pt
                      </span>
                    </div>
                    <input
                      type="range"
                      min="14"
                      max="100"
                      step="2"
                      value={activeWm.fontSize}
                      onChange={(e) =>
                        updateActiveWatermark({ fontSize: Number(e.target.value) })
                      }
                      className="w-full accent-sky-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium">Rotation</span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {activeWm.rotation}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      step="5"
                      value={activeWm.rotation}
                      onChange={(e) =>
                        updateActiveWatermark({ rotation: Number(e.target.value) })
                      }
                      className="w-full accent-sky-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Position */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-slate-700">Emplacement</label>
                  <select
                    value={activeWm.position}
                    onChange={(e) =>
                      updateActiveWatermark({
                        position: e.target.value as WatermarkItem['position'],
                      })
                    }
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="center">Centré au milieu (Diagonal)</option>
                    <option value="top">En-tête (Haut de page)</option>
                    <option value="bottom">Pied de page (Bas de page)</option>
                    <option value="repeat">Mosaïque répétée sur toute la page</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column: Combined Live Visual Preview (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between space-y-4">
              <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-sky-600" />
                  Aperçu des {watermarks.length} filigrane{watermarks.length > 1 ? 's' : ''}
                </span>

                {/* Page Navigation */}
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

              {/* Rendered Canvas Box */}
              <div className="w-full max-h-[460px] overflow-auto flex items-center justify-center p-2 bg-slate-100 rounded-lg">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[420px] object-contain shadow-md rounded border border-slate-300 bg-white"
                />
              </div>

              <div className="w-full text-[11px] text-center text-slate-400">
                Tous les filigranes configurés sont incrustés simultanément sur vos pages.
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-500">
              {watermarks.length} filigrane{watermarks.length > 1 ? 's' : ''} prêt{watermarks.length > 1 ? 's' : ''} à être incrusté{watermarks.length > 1 ? 's' : ''} sur le document.
            </div>

            <button
              type="button"
              disabled={isProcessing || watermarks.every((w) => !w.text.trim())}
              onClick={handleApplyWatermarks}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>
                    Appliquer {watermarks.length > 1 ? `les ${watermarks.length} filigranes` : 'le filigrane'} et Télécharger
                  </span>
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
