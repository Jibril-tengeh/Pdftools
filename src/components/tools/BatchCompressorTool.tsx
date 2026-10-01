import React, { useState } from 'react';
import {
  Zap,
  Download,
  FolderArchive,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Sliders,
  TrendingDown,
} from 'lucide-react';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { DropZone } from '../DropZone';
import { addRecentFile } from '../../utils/recentFiles';

interface CompressItem {
  id: string;
  file: File;
  originalSize: number;
  compressedSize?: number;
  compressedBlob?: Blob;
  status: 'pending' | 'compressing' | 'done' | 'error';
}

export const BatchCompressorTool: React.FC = () => {
  const [items, setItems] = useState<CompressItem[]>([]);
  const [qualityLevel, setQualityLevel] = useState<number>(0.75); // 0.5 = max, 0.75 = balanced, 0.9 = light
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFilesSelected = (files: File[]) => {
    const newItems: CompressItem[] = files.map((f) => ({
      id: `${f.name}_${Math.random()}`,
      file: f,
      originalSize: f.size,
      status: 'pending',
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const compressSingleFile = async (f: File, quality: number): Promise<Blob> => {
    // 1. Image
    if (f.type.startsWith('image/')) {
      const img = new Image();
      const objUrl = URL.createObjectURL(f);
      img.src = objUrl;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      URL.revokeObjectURL(objUrl);

      const canvas = document.createElement('canvas');
      // Scale down slightly if quality < 0.7
      const scale = quality < 0.6 ? 0.8 : 1.0;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context error');

      if (f.type === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const mime = f.type === 'image/png' && quality > 0.8 ? 'image/png' : 'image/jpeg';
      return new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), mime, quality));
    }

    // 2. PDF (re-save with object stream compression)
    if (f.type.includes('pdf') || f.name.endsWith('.pdf')) {
      const buffer = await f.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const savedBytes = await pdfDoc.save({ useObjectStreams: true });
      return new Blob([savedBytes.buffer.slice(savedBytes.byteOffset, savedBytes.byteOffset + savedBytes.byteLength) as ArrayBuffer], { type: 'application/pdf' });
    }

    return f;
  };

  const handleCompressAll = async () => {
    setIsProcessing(true);
    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      updated[i].status = 'compressing';
      setItems([...updated]);

      try {
        const compressedBlob = await compressSingleFile(updated[i].file, qualityLevel);
        updated[i].compressedBlob = compressedBlob;
        updated[i].compressedSize = compressedBlob.size;
        updated[i].status = 'done';

        addRecentFile({
          name: updated[i].file.name,
          toolName: 'Compression par lots',
          toolId: 'batch-compressor',
          size: compressedBlob.size,
          pageCount: 1,
        });
      } catch (err) {
        console.error(err);
        updated[i].status = 'error';
      }
      setItems([...updated]);
    }
    setIsProcessing(false);
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const done = items.filter((i) => i.status === 'done' && i.compressedBlob);
    if (done.length === 0) return;

    done.forEach((item) => {
      if (item.compressedBlob) {
        zip.file(item.file.name, item.compressedBlob);
      }
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fichiers_compresses_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  const totalOriginal = items.reduce((acc, i) => acc + i.originalSize, 0);
  const totalCompressed = items.reduce((acc, i) => acc + (i.compressedSize || i.originalSize), 0);
  const totalGain = totalOriginal > 0 ? Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Compresseur de Fichiers par Lots
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                Images & PDF
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Réduisez le poids de plusieurs documents et photos en un seul passage avec contrôle de compression.
            </p>
          </div>
        </div>
      </div>

      <DropZone
        onFilesSelected={handleFilesSelected}
        multiple={true}
        title="Glissez-déposez vos fichiers à compresser"
        subtitle="Images JPG, PNG, WEBP et fichiers PDF"
      />

      {items.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Intensité :</span>
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {[
                  { label: 'Maximale (-60%)', q: 0.55 },
                  { label: 'Équilibrée (-40%)', q: 0.75 },
                  { label: 'Légère (-20%)', q: 0.9 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setQualityLevel(preset.q)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      qualityLevel === preset.q
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCompressAll}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>{isProcessing ? 'Compression...' : 'Lancer la compression'}</span>
              </button>

              {items.some((i) => i.status === 'done') && (
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <FolderArchive className="w-4 h-4 text-amber-500" />
                  <span>Tout télécharger (ZIP)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setItems([])}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                title="Vider la liste"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats Bar if processed */}
          {items.some((i) => i.status === 'done') && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
              <div className="flex items-center gap-2 font-bold">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                <span>Poids initial : {(totalOriginal / (1024 * 1024)).toFixed(2)} MB</span>
                <span>→ Compressé : {(totalCompressed / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <span className="font-extrabold px-2 py-0.5 bg-emerald-600 text-white rounded-md">
                -{totalGain}% gagné
              </span>
            </div>
          )}

          {/* Items List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="truncate min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.file.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Initial : {(item.originalSize / 1024).toFixed(0)} KB
                    {item.compressedSize && (
                      <span className="text-emerald-600 font-bold ml-2">
                        → {(item.compressedSize / 1024).toFixed(0)} KB (-
                        {Math.round(((item.originalSize - item.compressedSize) / item.originalSize) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'pending' && (
                    <span className="text-slate-400 text-[11px]">En attente</span>
                  )}
                  {item.status === 'compressing' && (
                    <span className="text-amber-600 text-[11px] font-bold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Compression
                    </span>
                  )}
                  {item.status === 'done' && item.compressedBlob && (
                    <button
                      type="button"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(item.compressedBlob!);
                        a.download = `compresse_${item.file.name}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(a.href);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3 h-3" />
                      <span>Télécharger</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
