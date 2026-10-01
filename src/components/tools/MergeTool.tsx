import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Layers, CheckCircle2, Download, Plus, FileText, Loader2 } from 'lucide-react';
import { DropZone } from '../DropZone';
import { mergePdfs, downloadFile, formatBytes, getPdfPageCount } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';
import type { PDFFileInfo } from '../../types';

interface MergeToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const MergeTool: React.FC<MergeToolProps> = ({
  onUseSample,
  isGeneratingSample,
}) => {
  const [files, setFiles] = useState<PDFFileInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputFileName, setOutputFileName] = useState('document_fusionne.pdf');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFilesAdded = async (newFiles: File[]) => {
    const fileInfos: PDFFileInfo[] = [];
    for (const f of newFiles) {
      try {
        const buffer = await f.arrayBuffer();
        const pageCount = await getPdfPageCount(buffer);
        fileInfos.push({
          id: `${f.name}-${Date.now()}-${Math.random()}`,
          file: f,
          name: f.name,
          size: f.size,
          pageCount,
          arrayBuffer: buffer,
        });
      } catch (err) {
        console.error('Error reading PDF file:', err);
      }
    }
    setFiles((prev) => [...prev, ...fileInfos]);
    setSuccessMessage(null);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setFiles((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index >= files.length - 1) return;
    setFiles((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const totalPages = files.reduce((acc, f) => acc + f.pageCount, 0);
  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      const buffers = files.map((f) => f.arrayBuffer);
      const mergedBytes = await mergePdfs(buffers);
      const filename = outputFileName.endsWith('.pdf') ? outputFileName : `${outputFileName}.pdf`;
      downloadFile(mergedBytes, filename);
      addRecentFile({
        name: filename,
        toolName: 'Fusionner',
        toolId: 'merge',
        size: mergedBytes.byteLength,
        pageCount: totalPages,
        data: mergedBytes,
      });
      setSuccessMessage(`Document fusionné avec succès (${totalPages} pages générées) !`);
    } catch (err) {
      console.error('Failed to merge PDFs:', err);
      alert('Une erreur est survenue lors de la fusion des documents.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Fusionner des PDF</h1>
            <p className="text-xs text-slate-500">
              Combinez plusieurs documents PDF en un seul fichier. Réordonnez les fichiers par ordre d’assemblage.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      {files.length === 0 ? (
        <DropZone
          onFilesSelected={handleFilesAdded}
          multiple={true}
          title="Déposez ici les fichiers PDF à fusionner"
          subtitle="Sélectionnez au moins 2 fichiers PDF"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-6">
          {/* Top action row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-600 space-y-0.5">
              <span className="font-semibold text-slate-900">{files.length} fichiers prêts</span>
              <span className="text-slate-400 mx-2">·</span>
              <span className="font-mono tabular-nums">{totalPages}</span> pages au total
              <span className="text-slate-400 mx-2">·</span>
              <span>{formatBytes(totalBytes)}</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter d’autres fichiers</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const arr = Array.from(e.target.files);
                      handleFilesAdded(arr);
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1"
              >
                Tout effacer
              </button>
            </div>
          </div>

          {/* Files List */}
          <div className="space-y-2.5">
            {files.map((file, index) => (
              <div
                key={file.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-mono font-semibold text-slate-600 shrink-0">
                    {index + 1}
                  </div>
                  <div className="w-8 h-8 rounded bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      <span className="font-mono tabular-nums">{file.pageCount}</span> pages
                      <span className="text-slate-300 mx-1.5">·</span>
                      <span>{formatBytes(file.size)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveUp(index)}
                    title="Monter"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === files.length - 1}
                    onClick={() => moveDown(index)}
                    title="Descendre"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    title="Supprimer"
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Merge Settings & Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 max-w-sm space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nom du fichier final</label>
                <input
                  type="text"
                  value={outputFileName}
                  onChange={(e) => setOutputFileName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  placeholder="nom_du_document.pdf"
                />
              </div>

              <button
                type="button"
                disabled={files.length < 2 || isProcessing}
                onClick={handleMerge}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Fusion en cours...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Fusionner {files.length} fichiers</span>
                  </>
                )}
              </button>
            </div>

            {files.length < 2 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Ajoutez au moins deux fichiers pour pouvoir effectuer la fusion.
              </p>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
