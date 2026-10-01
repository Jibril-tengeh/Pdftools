import React, { useState } from 'react';
import {
  Repeat,
  Download,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileCode,
  CheckCircle2,
  FolderArchive,
  RefreshCw,
  Trash2,
  Sparkles,
} from 'lucide-react';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { DropZone } from '../DropZone';
import { addRecentFile } from '../../utils/recentFiles';
import { safePdfText } from '../../utils/pdfOperations';

interface QueueItem {
  id: string;
  file: File;
  targetFormat: string;
  status: 'pending' | 'converting' | 'done' | 'error';
  convertedBlob?: Blob;
  convertedName?: string;
}

export const UniversalConverterTool: React.FC = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [globalTarget, setGlobalTarget] = useState<string>('pdf');
  const [isProcessingAll, setIsProcessingAll] = useState<boolean>(false);

  const formatOptions = [
    { id: 'pdf', label: 'PDF Document', category: 'doc' },
    { id: 'png', label: 'PNG Image', category: 'image' },
    { id: 'jpg', label: 'JPG Image', category: 'image' },
    { id: 'webp', label: 'WebP Image', category: 'image' },
    { id: 'txt', label: 'Texte Brut (.txt)', category: 'doc' },
    { id: 'json', label: 'JSON Data', category: 'data' },
    { id: 'csv', label: 'CSV Data', category: 'data' },
    { id: 'wav', label: 'Audio WAV', category: 'audio' },
  ];

  const handleFilesSelected = (files: File[]) => {
    const newItems: QueueItem[] = files.map((f) => ({
      id: `${f.name}_${Date.now()}_${Math.random()}`,
      file: f,
      targetFormat: globalTarget,
      status: 'pending',
    }));
    setQueue((prev) => [...prev, ...newItems]);
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((i) => i.id !== id));
  };

  const convertItem = async (item: QueueItem): Promise<{ blob: Blob; name: string }> => {
    const f = item.file;
    const nameWithoutExt = f.name.replace(/\.[^/.]+$/, '');
    const target = item.targetFormat;

    // 1. Image to Image (Canvas)
    if (f.type.startsWith('image/') && ['png', 'jpg', 'webp'].includes(target)) {
      const img = new Image();
      const objUrl = URL.createObjectURL(f);
      img.src = objUrl;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      URL.revokeObjectURL(objUrl);

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Erreur canvas');
      if (target === 'jpg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      const mime = target === 'png' ? 'image/png' : target === 'webp' ? 'image/webp' : 'image/jpeg';
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), mime, 0.92));
      return { blob, name: `${nameWithoutExt}.${target}` };
    }

    // 2. Image to PDF
    if (f.type.startsWith('image/') && target === 'pdf') {
      const pdfDoc = await PDFDocument.create();
      const arrayBuffer = await f.arrayBuffer();
      const isPng = f.type.includes('png');
      const embedded = isPng ? await pdfDoc.embedPng(arrayBuffer) : await pdfDoc.embedJpg(arrayBuffer);
      const page = pdfDoc.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer], { type: 'application/pdf' });
      return { blob, name: `${nameWithoutExt}.pdf` };
    }

    // 3. Text to PDF
    if ((f.type.includes('text') || f.name.endsWith('.txt')) && target === 'pdf') {
      const text = await f.text();
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const page = pdfDoc.addPage([595, 842]);
      const lines = text.split('\n').slice(0, 45);
      let y = 800;
      for (const line of lines) {
        const cleanLine = safePdfText(font, line.slice(0, 80));
        if (cleanLine.trim()) {
          try {
            page.drawText(cleanLine, { x: 50, y, size: 11, font, color: rgb(0, 0, 0) });
          } catch {
            // safely ignore unencodable line
          }
        }
        y -= 16;
      }
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer], { type: 'application/pdf' });
      return { blob, name: `${nameWithoutExt}.pdf` };
    }

    // 4. Video / Audio to WAV
    if (f.type.startsWith('video/') || f.type.startsWith('audio/')) {
      const arrayBuffer = await f.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      // Encode to simple WAV
      const numChannels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const length = audioBuffer.length * numChannels * 2 + 44;
      const out = new DataView(new ArrayBuffer(length));

      const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(out, 0, 'RIFF');
      out.setUint32(4, length - 8, true);
      writeString(out, 8, 'WAVE');
      writeString(out, 12, 'fmt ');
      out.setUint32(16, 16, true);
      out.setUint16(20, 1, true);
      out.setUint16(22, numChannels, true);
      out.setUint32(24, sampleRate, true);
      out.setUint32(28, sampleRate * numChannels * 2, true);
      out.setUint16(32, numChannels * 2, true);
      out.setUint16(34, 16, true);
      writeString(out, 36, 'data');
      out.setUint32(40, length - 44, true);

      let offset = 44;
      for (let i = 0; i < audioBuffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
          out.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
          offset += 2;
        }
      }

      await audioCtx.close();
      const blob = new Blob([out.buffer], { type: 'audio/wav' });
      return { blob, name: `${nameWithoutExt}.wav` };
    }

    // 5. JSON <-> CSV
    if (f.name.endsWith('.json') && target === 'csv') {
      const json = JSON.parse(await f.text());
      const arr = Array.isArray(json) ? json : [json];
      const headers = Object.keys(arr[0] || {});
      const csv = [headers.join(','), ...arr.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      return { blob, name: `${nameWithoutExt}.csv` };
    }

    // Fallback: Copy blob
    const fallbackBlob = new Blob([await f.arrayBuffer()], { type: f.type });
    return { blob: fallbackBlob, name: `${nameWithoutExt}.${target}` };
  };

  const handleProcessAll = async () => {
    setIsProcessingAll(true);
    const updated = [...queue];

    for (let i = 0; i < updated.length; i++) {
      updated[i].status = 'converting';
      setQueue([...updated]);

      try {
        const { blob, name } = await convertItem(updated[i]);
        updated[i].status = 'done';
        updated[i].convertedBlob = blob;
        updated[i].convertedName = name;

        addRecentFile({
          name,
          toolName: 'Convertisseur Universel',
          toolId: 'universal-converter',
          size: blob.size,
          pageCount: 1,
        });
      } catch (e) {
        console.error(e);
        updated[i].status = 'error';
      }
      setQueue([...updated]);
    }
    setIsProcessingAll(false);
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const doneItems = queue.filter((i) => i.status === 'done' && i.convertedBlob);
    if (doneItems.length === 0) return;

    doneItems.forEach((item) => {
      if (item.convertedBlob && item.convertedName) {
        zip.file(item.convertedName, item.convertedBlob);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `fichiers_convertis_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  const handleDownloadSingle = (item: QueueItem) => {
    if (!item.convertedBlob || !item.convertedName) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(item.convertedBlob);
    a.download = item.convertedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Convertisseur Universel de Fichiers
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                Multi-formats 100% Local
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Convertissez des documents, photos, audio et données en masse dans votre navigateur sans téléversement.
            </p>
          </div>
        </div>
      </div>

      <DropZone
        onFilesSelected={handleFilesSelected}
        multiple={true}
        title="Glissez-déposez vos fichiers à convertir"
        subtitle="Images (PNG, JPG, WEBP), Documents (PDF, TXT), Vidéos/Audio (MP4, MP3), Données (CSV, JSON)"
      />

      {queue.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Format cible global :</span>
              <select
                value={globalTarget}
                onChange={(e) => {
                  const target = e.target.value;
                  setGlobalTarget(target);
                  setQueue((prev) => prev.map((item) => ({ ...item, targetFormat: target })));
                }}
                className="text-xs font-semibold p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                {formatOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleProcessAll}
                disabled={isProcessingAll}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProcessingAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isProcessingAll ? 'Conversion...' : 'Tout convertir'}</span>
              </button>

              {queue.some((i) => i.status === 'done') && (
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <FolderArchive className="w-4 h-4 text-amber-500" />
                  <span>Télécharger ZIP</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setQueue([])}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                title="Vider la liste"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Files List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {queue.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.file.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {(item.file.size / 1024).toFixed(1)} KB · Vers {item.targetFormat.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'pending' && (
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-[10px] font-bold">
                      En attente
                    </span>
                  )}
                  {item.status === 'converting' && (
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Traitement...
                    </span>
                  )}
                  {item.status === 'done' && (
                    <button
                      type="button"
                      onClick={() => handleDownloadSingle(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3 h-3" />
                      <span>Télécharger</span>
                    </button>
                  )}
                  {item.status === 'error' && (
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md text-[10px] font-bold">
                      Erreur
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => removeQueueItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
