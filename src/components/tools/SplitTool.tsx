import React, { useState, useEffect } from 'react';
import { Scissors, Download, CheckSquare, Square, FileArchive, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import JSZip from 'jszip';
import { DropZone } from '../DropZone';
import { renderAllPdfThumbnails, extractPagesFromPdf, downloadFile, parsePageRange } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';
import { PDFDocument } from 'pdf-lib';
import type { PDFPageItem } from '../../types';

interface SplitToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const SplitTool: React.FC<SplitToolProps> = ({
  onUseSample,
  isGeneratingSample,
  sampleBuffer,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pages, setPages] = useState<PDFPageItem[]>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [rangeInput, setRangeInput] = useState<string>('');
  const [splitMode, setSplitMode] = useState<'visual' | 'range' | 'all-individual'>('visual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If sampleBuffer is provided directly
  useEffect(() => {
    if (sampleBuffer && !buffer) {
      loadBuffer(sampleBuffer, 'document_exemple.pdf');
    }
  }, [sampleBuffer]);

  const loadBuffer = async (rawBuffer: ArrayBuffer, name: string) => {
    setBuffer(rawBuffer);
    setFileName(name);
    setIsLoadingThumbnails(true);
    setSuccessMessage(null);

    try {
      const pdfDoc = await PDFDocument.load(rawBuffer, { ignoreEncryption: true });
      const count = pdfDoc.getPageCount();

      const initialPages: PDFPageItem[] = [];
      for (let i = 0; i < count; i++) {
        initialPages.push({
          pageIndex: i,
          displayNumber: i + 1,
          rotation: 0,
          selected: true,
          isDeleted: false,
        });
      }
      setPages(initialPages);

      // Render all thumbnails safely in one pass without detaching buffer
      renderAllPdfThumbnails(rawBuffer, 0.35).then((thumbnails) => {
        setPages((prev) =>
          prev.map((p, idx) => ({
            ...p,
            thumbnailUrl: thumbnails[idx] || '',
          }))
        );
      }).catch((err) => {
        console.error('Error rendering thumbnails in SplitTool:', err);
      });
    } catch (e) {
      console.error('Error loading PDF for split:', e);
      alert('Impossible de charger ce document PDF.');
    } finally {
      setIsLoadingThumbnails(false);
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    const buf = await f.arrayBuffer();
    loadBuffer(buf, f.name);
  };

  const togglePageSelection = (index: number) => {
    setPages((prev) =>
      prev.map((p) => (p.pageIndex === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectAll = (select: boolean) => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: select })));
  };

  const handleRangeChange = (value: string) => {
    setRangeInput(value);
    if (!pages.length) return;
    const validIndices = parsePageRange(value, pages.length);
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        selected: validIndices.includes(p.pageIndex),
      }))
    );
  };

  const selectedPagesCount = pages.filter((p) => p.selected).length;

  const handleSplit = async () => {
    if (!buffer) return;
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      if (splitMode === 'all-individual') {
        // Zip each page separately
        const zip = new JSZip();
        const baseName = fileName.replace(/\.[^/.]+$/, '');

        for (let i = 0; i < pages.length; i++) {
          const singlePageBytes = await extractPagesFromPdf(buffer, [i]);
          zip.file(`${baseName}_page_${i + 1}.pdf`, singlePageBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipName = `${baseName}_pages_separees.zip`;
        downloadFile(zipBlob, zipName, 'application/zip');
        addRecentFile({
          name: zipName,
          toolName: 'Diviser (ZIP)',
          toolId: 'split',
          size: zipBlob.size,
          pageCount: pages.length,
          data: zipBlob,
          mimeType: 'application/zip',
        });
        setSuccessMessage(`Archive ZIP générée contenant les ${pages.length} pages individuelles !`);
      } else {
        // Extract selected pages into one combined PDF
        const targetIndices = pages.filter((p) => p.selected).map((p) => p.pageIndex);
        if (targetIndices.length === 0) {
          alert('Veuillez sélectionner au moins une page.');
          setIsProcessing(false);
          return;
        }

        const extractedBytes = await extractPagesFromPdf(buffer, targetIndices);
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        const outName = `${baseName}_extrait_${targetIndices.length}pages.pdf`;
        downloadFile(extractedBytes, outName);
        addRecentFile({
          name: outName,
          toolName: 'Diviser',
          toolId: 'split',
          size: extractedBytes.byteLength,
          pageCount: targetIndices.length,
          data: extractedBytes,
        });
        setSuccessMessage(`Document extrait avec succès (${targetIndices.length} pages) !`);
      }
    } catch (e) {
      console.error('Error during split:', e);
      alert('Erreur lors de l’extraction des pages.');
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
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Diviser un PDF</h1>
            <p className="text-xs text-slate-500">
              Extrayez des pages ciblées, déterminez une plage précise ou séparez chaque page dans une archive.
            </p>
          </div>
        </div>
      </div>

      {!buffer ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          title="Déposez le fichier PDF à diviser"
          subtitle="Sélectionnez un document PDF"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{fileName}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-mono tabular-nums text-slate-500">{pages.length} pages</span>
                </div>
                <p className="text-xs text-slate-500">
                  {selectedPagesCount} page{selectedPagesCount > 1 ? 's' : ''} sélectionnée{selectedPagesCount > 1 ? 's' : ''} pour l’extraction
                </p>
              </div>

              {/* Segmented Mode Selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setSplitMode('visual')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    splitMode === 'visual'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sélection visuelle
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('range')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    splitMode === 'range'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Plage de pages
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('all-individual')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    splitMode === 'all-individual'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Toutes séparées (ZIP)
                </button>
              </div>
            </div>

            {/* Range input if range mode */}
            {splitMode === 'range' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Plage de pages à extraire :
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => handleRangeChange(e.target.value)}
                  placeholder="Ex: 1-3, 5, 7-9"
                  className="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <span className="text-[11px] text-slate-400">
                  (Entrez les numéros séparés par des virgules ou tirets)
                </span>
              </div>
            )}

            {/* Visual selection shortcuts */}
            {splitMode === 'visual' && (
              <div className="flex items-center gap-3 pt-1 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => selectAll(true)}
                  className="text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
                  Tout sélectionner
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => selectAll(false)}
                  className="text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  Tout désélectionner
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setBuffer(null);
                    setFile(null);
                    setPages([]);
                  }}
                  className="text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1 ml-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Changer de fichier
                </button>
              </div>
            )}
          </div>

          {/* Pages Grid */}
          <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {pages.map((p) => (
                <div
                  key={p.pageIndex}
                  onClick={() => splitMode === 'visual' && togglePageSelection(p.pageIndex)}
                  className={`group relative bg-white rounded-lg border-2 p-2 transition-all select-none ${
                    p.selected
                      ? 'border-rose-500 shadow-sm ring-2 ring-rose-500/20'
                      : 'border-slate-200 opacity-60 hover:opacity-90'
                  } ${splitMode === 'visual' ? 'cursor-pointer hover:border-rose-400' : ''}`}
                >
                  {/* Thumbnail container */}
                  <div className="aspect-[3/4] bg-slate-50 rounded flex items-center justify-center overflow-hidden border border-slate-100 relative">
                    {p.thumbnailUrl ? (
                      <img
                        src={p.thumbnailUrl}
                        alt={`Page ${p.displayNumber}`}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-[10px] text-slate-400 font-mono">
                        {isLoadingThumbnails ? 'Chargement...' : `Page ${p.displayNumber}`}
                      </div>
                    )}

                    {/* Selection badge */}
                    {splitMode === 'visual' && (
                      <div className="absolute top-1.5 right-1.5">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                            p.selected ? 'bg-rose-600 text-white' : 'bg-slate-300/80 text-white'
                          }`}
                        >
                          <span className="text-[10px] font-bold">✓</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Page index footer */}
                  <div className="mt-2 text-center">
                    <span className="text-xs font-mono tabular-nums font-semibold text-slate-700">
                      Page {p.displayNumber}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-500">
              {splitMode === 'all-individual' ? (
                <span>Toutes les {pages.length} pages seront archivées individuellement.</span>
              ) : (
                <span>
                  {selectedPagesCount} page{selectedPagesCount > 1 ? 's' : ''} sur {pages.length} prête{selectedPagesCount > 1 ? 's' : ''} à être extraite{selectedPagesCount > 1 ? 's' : ''}.
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={isProcessing || (splitMode !== 'all-individual' && selectedPagesCount === 0)}
              onClick={handleSplit}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extraction en cours...</span>
                </>
              ) : splitMode === 'all-individual' ? (
                <>
                  <FileArchive className="w-4 h-4" />
                  <span>Télécharger toutes les pages (ZIP)</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Télécharger la sélection ({selectedPagesCount} pages)</span>
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
