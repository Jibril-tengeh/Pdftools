import React, { useState, useEffect, useRef } from 'react';
import {
  PenTool,
  Download,
  Loader2,
  CheckCircle2,
  Eraser,
  Type,
  Upload,
  Calendar,
  Move,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { renderPdfThumbnail, addSignatureToPdf, downloadFile } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';
import { PDFDocument } from 'pdf-lib';

interface SignToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const SignTool: React.FC<SignToolProps> = ({
  onUseSample,
  isGeneratingSample,
  sampleBuffer,
}) => {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [pageThumbnail, setPageThumbnail] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Signature creation mode: 'draw' | 'type' | 'upload'
  const [signMode, setSignMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState<string>('Jean Dupont');
  const [signatureColor, setSignatureColor] = useState<string>('#1E3A8A'); // navy blue
  const [includeDateStamp, setIncludeDateStamp] = useState<boolean>(true);

  // Position on page: relative coordinates 0..1 (from bottom left in PDF coords)
  const [relX, setRelX] = useState<number>(0.55);
  const [relY, setRelY] = useState<number>(0.15); // from bottom
  const [relWidth, setRelWidth] = useState<number>(0.3); // 30% of page width

  // Signature data url generated from pad
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Drawing Pad Canvas Ref
  const drawPadRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Document Placement Preview Canvas Ref
  const docPreviewRef = useRef<HTMLCanvasElement>(null);

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
      setSelectedPageIndex(0);

      const thumb = await renderPdfThumbnail(rawBuffer, 1, 0.85);
      setPageThumbnail(thumb);
    } catch (e) {
      console.error('Error loading PDF for signature:', e);
      alert('Impossible d’ouvrir ce document PDF.');
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buf = await f.arrayBuffer();
    loadBuffer(buf, f.name);
  };

  const changePage = async (idx: number) => {
    if (!buffer || idx < 0 || idx >= totalPages) return;
    setSelectedPageIndex(idx);
    const thumb = await renderPdfThumbnail(buffer, idx + 1, 0.85);
    setPageThumbnail(thumb);
  };

  // Setup drawing canvas
  useEffect(() => {
    if (signMode === 'draw' && drawPadRef.current) {
      const canvas = drawPadRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = signatureColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [signMode, signatureColor]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = drawPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = drawPadRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const clearDrawingPad = () => {
    const canvas = drawPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureDataUrl(null);
  };

  // Generate typed cursive signature
  useEffect(() => {
    if (signMode === 'type' && typedName.trim()) {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 400;
      offCanvas.height = 140;
      const ctx = offCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
        ctx.fillStyle = signatureColor;
        ctx.font = 'italic 44px "Brush Script MT", "Caveat", "Segoe Script", cursive, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, 200, 70);
        setSignatureDataUrl(offCanvas.toDataURL('image/png'));
      }
    }
  }, [signMode, typedName, signatureColor]);

  // Handle image upload for signature
  const handleSignatureImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSignatureDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Draw document preview with placed signature
  useEffect(() => {
    if (!pageThumbnail || !docPreviewRef.current) return;
    const canvas = docPreviewRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw placed signature if available
      if (signatureDataUrl) {
        const sigImg = new Image();
        sigImg.onload = () => {
          const sigAspect = sigImg.width / sigImg.height;
          const targetW = canvas.width * relWidth;
          const targetH = targetW / sigAspect;
          const targetX = canvas.width * relX;
          // In canvas, y=0 is top, in PDF y=0 is bottom
          const targetY = canvas.height * (1 - relY) - targetH;

          // Draw signature
          ctx.drawImage(sigImg, targetX, targetY, targetW, targetH);

          // Draw indicator border around signature
          ctx.save();
          ctx.strokeStyle = '#2563EB';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(targetX - 4, targetY - 4, targetW + 8, targetH + 8);

          if (includeDateStamp) {
            ctx.fillStyle = '#475569';
            ctx.font = '10px sans-serif';
            ctx.fillText(
              `Signé le ${new Date().toLocaleDateString('fr-FR')}`,
              targetX,
              targetY + targetH + 12
            );
          }
          ctx.restore();
        };
        sigImg.src = signatureDataUrl;
      }
    };
    img.src = pageThumbnail;
  }, [pageThumbnail, signatureDataUrl, relX, relY, relWidth, includeDateStamp]);

  // Click on preview to position signature
  const handlePreviewClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = docPreviewRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const rX = Math.max(0.05, Math.min(0.7, clickX / rect.width - relWidth / 2));
    const rY = Math.max(0.05, Math.min(0.85, 1 - clickY / rect.height));

    setRelX(rX);
    setRelY(rY);
  };

  const handleApplySignature = async () => {
    if (!buffer || !signatureDataUrl) {
      alert('Veuillez d’abord créer ou dessiner une signature.');
      return;
    }

    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      const signedBytes = await addSignatureToPdf(
        buffer,
        selectedPageIndex,
        signatureDataUrl,
        relX,
        relY,
        relWidth,
        includeDateStamp
      );

      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const outName = `${baseName}_signe.pdf`;
      downloadFile(signedBytes, outName);
      addRecentFile({
        name: outName,
        toolName: 'Signature',
        toolId: 'sign',
        size: signedBytes.byteLength,
        pageCount: totalPages,
        data: signedBytes,
      });
      setSuccessMessage(`Document signé avec succès sur la page ${selectedPageIndex + 1} !`);
    } catch (e) {
      console.error('Error signing document:', e);
      alert('Une erreur est survenue lors de l’application de la signature.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Signer un PDF</h1>
            <p className="text-xs text-slate-500">
              Créez votre signature manuscrite ou tapez votre nom, puis placez-la précisément sur n’importe quelle page.
            </p>
          </div>
        </div>
      </div>

      {!buffer ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          title="Déposez le fichier PDF à signer"
          subtitle="Sélectionnez un document PDF"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Signature Creation Panel (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Créer la signature
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSignatureColor('#1E3A8A')}
                    className={`w-5 h-5 rounded-full bg-blue-900 border-2 ${
                      signatureColor === '#1E3A8A' ? 'ring-2 ring-blue-500' : 'border-transparent'
                    }`}
                    title="Bleu nuit"
                  />
                  <button
                    type="button"
                    onClick={() => setSignatureColor('#0F172A')}
                    className={`w-5 h-5 rounded-full bg-slate-900 border-2 ${
                      signatureColor === '#0F172A' ? 'ring-2 ring-blue-500' : 'border-transparent'
                    }`}
                    title="Noir profond"
                  />
                </div>
              </div>

              {/* Mode Selector */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setSignMode('draw')}
                  className={`py-1.5 font-medium rounded-md transition-colors ${
                    signMode === 'draw' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Dessiner
                </button>
                <button
                  type="button"
                  onClick={() => setSignMode('type')}
                  className={`py-1.5 font-medium rounded-md transition-colors ${
                    signMode === 'type' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Taper
                </button>
                <button
                  type="button"
                  onClick={() => setSignMode('upload')}
                  className={`py-1.5 font-medium rounded-md transition-colors ${
                    signMode === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Importer
                </button>
              </div>

              {/* Drawing Pad */}
              {signMode === 'draw' && (
                <div className="space-y-2">
                  <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden">
                    <canvas
                      ref={drawPadRef}
                      width={340}
                      height={130}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-[130px] cursor-crosshair touch-none"
                    />
                    {!signatureDataUrl && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400">
                        Dessinez votre signature ici avec la souris ou au doigt
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Trait fluide</span>
                    <button
                      type="button"
                      onClick={clearDrawingPad}
                      className="text-slate-600 hover:text-rose-600 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      Effacer
                    </button>
                  </div>
                </div>
              )}

              {/* Type mode */}
              {signMode === 'type' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Votre nom / Prénom</label>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="Jean Dupont"
                      className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
                    <p
                      className="text-2xl font-serif italic"
                      style={{ color: signatureColor, fontFamily: 'cursive' }}
                    >
                      {typedName || 'Votre Signature'}
                    </p>
                  </div>
                </div>
              )}

              {/* Upload image */}
              {signMode === 'upload' && (
                <div className="space-y-2">
                  <label className="block p-4 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-center cursor-pointer bg-slate-50">
                    <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                    <span className="text-xs font-medium text-slate-700">
                      Choisir une image de signature (PNG)
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleSignatureImageUpload}
                      className="hidden"
                    />
                  </label>
                  {signatureDataUrl && (
                    <div className="p-2 border border-slate-200 rounded flex justify-center bg-white">
                      <img src={signatureDataUrl} alt="Signature importée" className="max-h-16 object-contain" />
                    </div>
                  )}
                </div>
              )}

              {/* Signature Scale & Date Stamp */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Réglages de la signature
                </h3>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700">Taille sur la page</span>
                    <span className="font-mono text-slate-500">{Math.round(relWidth * 100)} %</span>
                  </div>
                  <input
                    type="range"
                    min="0.15"
                    max="0.45"
                    step="0.02"
                    value={relWidth}
                    onChange={(e) => setRelWidth(Number(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={includeDateStamp}
                    onChange={(e) => setIncludeDateStamp(e.target.checked)}
                    className="rounded text-purple-600 accent-purple-600"
                  />
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Incruster horodatage automatique de signature</span>
                </label>
              </div>
            </div>

            {/* Document Interactive Preview & Placement (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-900">{fileName}</span>
                  <div className="text-[11px] text-slate-500">
                    Cliquez sur la page pour positionner la signature
                  </div>
                </div>

                {/* Page Navigation */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={selectedPageIndex <= 0}
                      onClick={() => changePage(selectedPageIndex - 1)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer"
                    >
                      Précédente
                    </button>
                    <span className="font-mono font-medium text-xs">
                      Page {selectedPageIndex + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={selectedPageIndex >= totalPages - 1}
                      onClick={() => changePage(selectedPageIndex + 1)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer"
                    >
                      Suivante
                    </button>
                  </div>
                )}
              </div>

              {/* Canvas viewport */}
              <div className="w-full max-h-[500px] overflow-auto flex items-center justify-center p-3 bg-slate-100 rounded-lg">
                <canvas
                  ref={docPreviewRef}
                  onClick={handlePreviewClick}
                  className="max-w-full max-h-[460px] object-contain shadow-md rounded border border-slate-300 bg-white cursor-crosshair"
                  title="Cliquez n’importe où pour déplacer la signature"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <Move className="w-3.5 h-3.5 text-purple-600" />
                  Cliquez sur le document pour déplacer l’emplacement
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBuffer(null);
                    setPageThumbnail(null);
                  }}
                  className="text-rose-600 hover:text-rose-700"
                >
                  Changer de fichier
                </button>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-500">
              La signature est fusionnée de manière indélébile dans le PDF à l’emplacement spécifié.
            </div>

            <button
              type="button"
              disabled={isProcessing || !signatureDataUrl}
              onClick={handleApplySignature}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signature en cours...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Appliquer la signature et Télécharger</span>
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
