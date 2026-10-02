import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Undo2,
  Download,
  Loader2,
  CheckCircle2,
  Plus,
  Image as ImageIcon,
  Type,
  FilePlus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  X,
  Sparkles,
  FileText,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import {
  renderAllPdfThumbnails,
  downloadFile,
  safePdfText,
  formatBytes,
} from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export interface OrganizePageItem {
  id: string;
  sourceType: 'original' | 'image' | 'text' | 'external_pdf';
  rotation: number;
  selected: boolean;
  isDeleted: boolean;
  thumbnailUrl: string;

  // For original page
  originalIndex?: number;

  // For image page
  imageBytes?: Uint8Array;
  imageFormat?: 'jpeg' | 'png';
  imageName?: string;

  // For text page
  textOptions?: {
    title: string;
    body: string;
    fontSize: number;
    alignment: 'left' | 'center' | 'right';
    bgColor: string;
  };

  // For external PDF page
  externalPdfBuffer?: ArrayBuffer;
  externalPageIndex?: number;
  externalFileName?: string;
}

interface OrganizeToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const OrganizeTool: React.FC<OrganizeToolProps> = ({
  onUseSample,
  isGeneratingSample,
  sampleBuffer,
}) => {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pages, setPages] = useState<OrganizePageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal Text Page state
  const [showTextModal, setShowTextModal] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textBody, setTextBody] = useState('');
  const [textFontSize, setTextFontSize] = useState<number>(14);
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [textBgColor, setTextBgColor] = useState<string>('#FFFFFF');

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<OrganizePageItem | null>(null);

  // Hidden File Inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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

      const initialPages: OrganizePageItem[] = [];
      for (let i = 0; i < count; i++) {
        initialPages.push({
          id: `page-${i}-${Date.now()}`,
          sourceType: 'original',
          originalIndex: i,
          rotation: 0,
          selected: true,
          isDeleted: false,
          thumbnailUrl: '',
        });
      }
      setPages(initialPages);

      // Render all thumbnails safely
      renderAllPdfThumbnails(rawBuffer, 0.35)
        .then((thumbnails) => {
          setPages((prev) =>
            prev.map((p, idx) => {
              if (p.sourceType === 'original' && p.originalIndex !== undefined) {
                return {
                  ...p,
                  thumbnailUrl: thumbnails[p.originalIndex] || '',
                };
              }
              return p;
            })
          );
        })
        .catch((err) => {
          console.error('Error rendering thumbnails in OrganizeTool:', err);
        });
    } catch (e) {
      console.error('Error loading PDF for organize:', e);
      alert('Impossible de lire ce fichier PDF.');
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buf = await f.arrayBuffer();
    loadBuffer(buf, f.name);
  };

  // 1. Ajouter des images comme nouvelles pages
  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);

    const newPages: OrganizePageItem[] = [];

    for (const file of selectedFiles) {
      try {
        const isPng = file.type === 'image/png';
        const isJpg = file.type === 'image/jpeg' || file.type === 'image/jpg';

        let format: 'jpeg' | 'png' = isPng ? 'png' : 'jpeg';
        let bytes: Uint8Array;
        let thumbUrl = '';

        if (isPng || isJpg) {
          const arr = await file.arrayBuffer();
          bytes = new Uint8Array(arr);
          thumbUrl = URL.createObjectURL(file);
        } else {
          // Conversion image universelle (WebP, etc.)
          const bmp = await createImageBitmap(file);
          const canvas = document.createElement('canvas');
          canvas.width = bmp.width;
          canvas.height = bmp.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(bmp, 0, 0);
          const blob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, 'image/jpeg', 0.9)
          );
          if (!blob) continue;
          const arr = await blob.arrayBuffer();
          bytes = new Uint8Array(arr);
          thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
          format = 'jpeg';
        }

        newPages.push({
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          sourceType: 'image',
          rotation: 0,
          selected: true,
          isDeleted: false,
          thumbnailUrl: thumbUrl,
          imageBytes: bytes,
          imageFormat: format,
          imageName: file.name,
        });
      } catch (err) {
        console.error('Error adding image:', err);
      }
    }

    setPages((prev) => [...prev, ...newPages]);
    e.target.value = '';
  };

  // 2. Générer une miniature pour la page de texte
  const renderTextThumbnail = (
    title: string,
    body: string,
    bgColor: string
  ): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 250;
    canvas.height = 353; // A4 aspect
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Background
    ctx.fillStyle = bgColor || '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    let y = 35;
    if (title.trim()) {
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(title.slice(0, 22) + (title.length > 22 ? '…' : ''), 20, y);
      y += 18;
      ctx.strokeStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(230, y);
      ctx.stroke();
      y += 18;
    }

    // Body
    ctx.fillStyle = '#334155';
    ctx.font = '10px sans-serif';
    const lines = body.split('\n');
    for (const line of lines) {
      if (y > 330) break;
      ctx.fillText(line.slice(0, 36) + (line.length > 36 ? '…' : ''), 20, y);
      y += 14;
    }

    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // 3. Insérer la page de texte
  const handleInsertTextPage = () => {
    if (!textBody.trim() && !textTitle.trim()) {
      alert('Veuillez saisir un titre ou du texte pour créer cette page.');
      return;
    }

    const thumb = renderTextThumbnail(textTitle, textBody, textBgColor);
    const newPage: OrganizePageItem = {
      id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sourceType: 'text',
      rotation: 0,
      selected: true,
      isDeleted: false,
      thumbnailUrl: thumb,
      textOptions: {
        title: textTitle,
        body: textBody,
        fontSize: textFontSize,
        alignment: textAlignment,
        bgColor: textBgColor,
      },
    };

    setPages((prev) => [...prev, newPage]);
    setShowTextModal(false);
    setTextTitle('');
    setTextBody('');
  };

  // 4. Ajouter un autre fichier PDF
  const handleAddPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
      const rawBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(rawBuffer, { ignoreEncryption: true });
      const count = pdfDoc.getPageCount();
      const thumbs = await renderAllPdfThumbnails(rawBuffer, 0.35);

      const newPages: OrganizePageItem[] = [];
      for (let i = 0; i < count; i++) {
        newPages.push({
          id: `ext-pdf-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
          sourceType: 'external_pdf',
          rotation: 0,
          selected: true,
          isDeleted: false,
          thumbnailUrl: thumbs[i] || '',
          externalPdfBuffer: rawBuffer,
          externalPageIndex: i,
          externalFileName: file.name,
        });
      }

      setPages((prev) => [...prev, ...newPages]);
    } catch (err) {
      console.error('Error importing external PDF:', err);
      alert('Impossible d’importer ce fichier PDF.');
    }
    e.target.value = '';
  };

  // Pivoter / Déplacer / Supprimer
  const rotatePage = (indexInArray: number, angleChange: number) => {
    setPages((prev) => {
      const next = [...prev];
      const p = next[indexInArray];
      const newRotation = (p.rotation + angleChange + 360) % 360;
      next[indexInArray] = { ...p, rotation: newRotation };
      return next;
    });
  };

  const rotateAll = (angleChange: number) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + angleChange + 360) % 360,
      }))
    );
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const toggleDeletePage = (indexInArray: number) => {
    setPages((prev) => {
      const next = [...prev];
      next[indexInArray] = {
        ...next[indexInArray],
        isDeleted: !next[indexInArray].isDeleted,
      };
      return next;
    });
  };

  const activePages = pages.filter((p) => !p.isDeleted);

  // Sauvegarder le PDF modifié avec toutes ses pages
  const handleSave = async () => {
    if (!buffer) return;
    if (activePages.length === 0) {
      alert('Toutes les pages sont supprimées. Veuillez en conserver au moins une.');
      return;
    }

    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      const outDoc = await PDFDocument.create();
      const originalDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const fontRegular = await outDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

      for (const p of activePages) {
        // Page originale du PDF initial
        if (p.sourceType === 'original' && typeof p.originalIndex === 'number') {
          const [copied] = await outDoc.copyPages(originalDoc, [p.originalIndex]);
          const currAngle = copied.getRotation().angle;
          copied.setRotation(degrees((currAngle + p.rotation + 360) % 360));
          outDoc.addPage(copied);
        }
        // Page d'un autre document PDF importé
        else if (
          p.sourceType === 'external_pdf' &&
          p.externalPdfBuffer &&
          typeof p.externalPageIndex === 'number'
        ) {
          const extDoc = await PDFDocument.load(p.externalPdfBuffer, {
            ignoreEncryption: true,
          });
          const [copied] = await outDoc.copyPages(extDoc, [p.externalPageIndex]);
          const currAngle = copied.getRotation().angle;
          copied.setRotation(degrees((currAngle + p.rotation + 360) % 360));
          outDoc.addPage(copied);
        }
        // Page d'une image ajoutée
        else if (p.sourceType === 'image' && p.imageBytes) {
          let embeddedImg;
          if (p.imageFormat === 'png') {
            embeddedImg = await outDoc.embedPng(p.imageBytes);
          } else {
            embeddedImg = await outDoc.embedJpg(p.imageBytes);
          }

          const a4Width = 595.28;
          const a4Height = 841.89;
          const page = outDoc.addPage([a4Width, a4Height]);

          const maxW = a4Width - 40;
          const maxH = a4Height - 40;
          const scale = Math.min(
            maxW / embeddedImg.width,
            maxH / embeddedImg.height,
            1
          );
          const drawW = embeddedImg.width * scale;
          const drawH = embeddedImg.height * scale;
          const posX = 20 + (maxW - drawW) / 2;
          const posY = 20 + (maxH - drawH) / 2;

          page.drawImage(embeddedImg, {
            x: posX,
            y: posY,
            width: drawW,
            height: drawH,
          });

          if (p.rotation !== 0) {
            page.setRotation(degrees(p.rotation % 360));
          }
        }
        // Page de texte ajoutée
        else if (p.sourceType === 'text' && p.textOptions) {
          const opts = p.textOptions;
          const a4Width = 595.28;
          const a4Height = 841.89;
          const page = outDoc.addPage([a4Width, a4Height]);

          // Couleur de fond
          if (opts.bgColor && opts.bgColor !== '#FFFFFF') {
            const hex = opts.bgColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16) / 255;
            const g = parseInt(hex.substring(2, 4), 16) / 255;
            const b = parseInt(hex.substring(4, 6), 16) / 255;
            page.drawRectangle({
              x: 0,
              y: 0,
              width: a4Width,
              height: a4Height,
              color: rgb(r, g, b),
            });
          }

          const marginX = 45;
          let curY = a4Height - 60;

          // Titre
          if (opts.title?.trim()) {
            const titleText = safePdfText(fontBold, opts.title.trim());
            const titleSize = 22;
            const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
            let titleX = marginX;
            if (opts.alignment === 'center') titleX = (a4Width - titleWidth) / 2;
            else if (opts.alignment === 'right') titleX = a4Width - marginX - titleWidth;

            page.drawText(titleText, {
              x: titleX,
              y: curY,
              size: titleSize,
              font: fontBold,
              color: rgb(0.1, 0.1, 0.1),
            });
            curY -= 32;

            page.drawLine({
              start: { x: marginX, y: curY + 12 },
              end: { x: a4Width - marginX, y: curY + 12 },
              thickness: 1,
              color: rgb(0.8, 0.8, 0.8),
            });
          }

          // Corps de texte
          const bodyFontSize = opts.fontSize || 13;
          const lineHeight = bodyFontSize * 1.5;
          const maxTextWidth = a4Width - marginX * 2;
          const paragraphs = (opts.body || '').split('\n');

          for (const para of paragraphs) {
            if (!para.trim()) {
              curY -= lineHeight * 0.7;
              continue;
            }
            const words = para.split(' ');
            let currentLine = '';
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const testWidth = fontRegular.widthOfTextAtSize(
                safePdfText(fontRegular, testLine),
                bodyFontSize
              );
              if (testWidth > maxTextWidth && currentLine) {
                const lineText = safePdfText(fontRegular, currentLine);
                const lw = fontRegular.widthOfTextAtSize(lineText, bodyFontSize);
                let lx = marginX;
                if (opts.alignment === 'center') lx = (a4Width - lw) / 2;
                else if (opts.alignment === 'right') lx = a4Width - marginX - lw;

                page.drawText(lineText, {
                  x: lx,
                  y: curY,
                  size: bodyFontSize,
                  font: fontRegular,
                  color: rgb(0.15, 0.15, 0.15),
                });
                curY -= lineHeight;
                currentLine = word;
                if (curY < 40) break;
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine && curY >= 40) {
              const lineText = safePdfText(fontRegular, currentLine);
              const lw = fontRegular.widthOfTextAtSize(lineText, bodyFontSize);
              let lx = marginX;
              if (opts.alignment === 'center') lx = (a4Width - lw) / 2;
              else if (opts.alignment === 'right') lx = a4Width - marginX - lw;

              page.drawText(lineText, {
                x: lx,
                y: curY,
                size: bodyFontSize,
                font: fontRegular,
                color: rgb(0.15, 0.15, 0.15),
              });
              curY -= lineHeight;
            }
          }

          if (p.rotation !== 0) {
            page.setRotation(degrees(p.rotation % 360));
          }
        }
      }

      const finalBytes = await outDoc.save();
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const outName = `${baseName}_modifie.pdf`;
      await downloadFile(finalBytes, outName);

      addRecentFile({
        name: outName,
        toolName: 'Modifier PDF',
        toolId: 'organize',
        size: finalBytes.byteLength,
        pageCount: activePages.length,
        data: finalBytes,
      });

      setSuccessMessage(
        `Document modifié avec succès (${activePages.length} pages enregistrées) !`
      );
    } catch (e) {
      console.error('Error modifying PDF:', e);
      alert('Une erreur est survenue lors de la réorganisation du document.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600">
            <RotateCw className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Modifier, Ajouter des Pages & Réorganiser
            </h1>
            <p className="text-xs text-slate-500">
              Ajoutez de nouvelles pages (images, texte ou PDF), pivotez, déplacez et supprimez vos pages facilement.
            </p>
          </div>
        </div>
      </div>

      {!buffer ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          title="Déposez le fichier PDF à modifier"
          subtitle="Sélectionnez un document PDF"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {fileName}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                  {activePages.length} active{activePages.length > 1 ? 's' : ''} sur {pages.length} pages
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Ajoutez des pages, faites pivoter ou déplacez l'ordre des pages.
              </p>
            </div>

            {/* Actions d'ajout de pages */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Bouton Ajouter des Images */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>+ Ajouter Images</span>
              </button>
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleAddImages}
              />

              {/* Bouton Ajouter une page de texte */}
              <button
                type="button"
                onClick={() => setShowTextModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <Type className="w-3.5 h-3.5" />
                <span>+ Ajouter Texte</span>
              </button>

              {/* Bouton Ajouter un autre PDF */}
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>+ Ajouter un PDF</span>
              </button>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleAddPdf}
              />

              {/* Pivoter Tout */}
              <button
                type="button"
                onClick={() => rotateAll(90)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Pivoter toutes les pages de 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pivoter tout (+90°)</span>
              </button>
            </div>
          </div>

          {/* Grille des Pages */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 min-h-[350px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {pages.map((page, arrayIdx) => (
                <div
                  key={page.id}
                  className={`flex flex-col bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-xs transition-all relative group ${
                    page.isDeleted
                      ? 'opacity-40 border-rose-300 dark:border-rose-900 bg-rose-50/20'
                      : 'border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Badge de Type de Page */}
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-800/50">
                    <span className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300">
                      #{arrayIdx + 1}
                    </span>

                    {page.sourceType === 'image' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <ImageIcon className="w-2.5 h-2.5" />
                        <span>Image</span>
                      </span>
                    )}

                    {page.sourceType === 'text' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 flex items-center gap-1">
                        <Type className="w-2.5 h-2.5" />
                        <span>Texte</span>
                      </span>
                    )}

                    {page.sourceType === 'external_pdf' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center gap-1">
                        <FilePlus className="w-2.5 h-2.5" />
                        <span>Ajouté</span>
                      </span>
                    )}

                    {page.sourceType === 'original' && (
                      <span className="text-[10px] font-medium text-slate-400">
                        P. {(page.originalIndex || 0) + 1}
                      </span>
                    )}
                  </div>

                  {/* Zone de la Miniature */}
                  <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden p-2">
                    {page.thumbnailUrl ? (
                      <div
                        className="w-full h-full flex items-center justify-center transition-transform duration-200"
                        style={{ transform: `rotate(${page.rotation}deg)` }}
                      >
                        <img
                          src={page.thumbnailUrl}
                          alt={`Page ${arrayIdx + 1}`}
                          className="max-w-full max-h-full object-contain shadow-xs rounded-xs"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-[10px]">Chargement...</span>
                      </div>
                    )}

                    {/* Overlay si la page est marquée comme supprimée */}
                    {page.isDeleted && (
                      <div className="absolute inset-0 bg-rose-600/20 backdrop-blur-2xs flex flex-col items-center justify-center p-2 text-center">
                        <Trash2 className="w-6 h-6 text-rose-700 drop-shadow-xs mb-1" />
                        <span className="text-[11px] font-bold text-rose-800 bg-white/90 px-2 py-0.5 rounded-full shadow-xs">
                          Supprimée
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Barre d'outils de chaque page */}
                  <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 gap-0.5">
                    {page.isDeleted ? (
                      <button
                        type="button"
                        onClick={() => toggleDeletePage(arrayIdx)}
                        className="w-full py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Undo2 className="w-3 h-3" />
                        <span>Restaurer</span>
                      </button>
                    ) : (
                      <>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={arrayIdx === 0}
                            onClick={() => movePage(arrayIdx, arrayIdx - 1)}
                            title="Déplacer vers la gauche"
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={arrayIdx === pages.length - 1}
                            onClick={() => movePage(arrayIdx, arrayIdx + 1)}
                            title="Déplacer vers la droite"
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => rotatePage(arrayIdx, 90)}
                            title="Pivoter à droite (+90°)"
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleDeletePage(arrayIdx)}
                            title="Supprimer cette page"
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bouton d'action final */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">
                {activePages.length} page{activePages.length > 1 ? 's' : ''}
              </span>{' '}
              prête{activePages.length > 1 ? 's' : ''} dans le document final.
            </div>

            <button
              type="button"
              disabled={isProcessing || activePages.length === 0}
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement du PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Enregistrer le PDF modifié ({activePages.length} pages)</span>
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

      {/* MODAL AJOUTER UNE PAGE DE TEXTE */}
      {showTextModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Type className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Ajouter une nouvelle page de texte
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Insérez une page de notes, un article ou une annexe dans votre PDF.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTextModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Titre */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Titre de la page (optionnel)
                </label>
                <input
                  type="text"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="ex: Notes de réunion, Annexe, Chapitre 2..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Corps de texte */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contenu du texte *
                </label>
                <textarea
                  rows={6}
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  placeholder="Saisissez ou collez votre texte ici..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white leading-relaxed resize-none"
                />
              </div>

              {/* Options de style : Taille, Alignement, Fond */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Taille */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Taille du texte
                  </label>
                  <select
                    value={textFontSize}
                    onChange={(e) => setTextFontSize(Number(e.target.value))}
                    className="w-full p-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-md dark:bg-slate-800 dark:text-white"
                  >
                    <option value={11}>Petit (11 pt)</option>
                    <option value={14}>Normal (14 pt)</option>
                    <option value={18}>Grand (18 pt)</option>
                    <option value={22}>Très Grand (22 pt)</option>
                  </select>
                </div>

                {/* Alignement */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Alignement
                  </label>
                  <div className="flex border border-slate-300 dark:border-slate-700 rounded-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setTextAlignment('left')}
                      className={`flex-1 p-1.5 flex items-center justify-center cursor-pointer ${
                        textAlignment === 'left' ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-600'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlignment('center')}
                      className={`flex-1 p-1.5 flex items-center justify-center cursor-pointer ${
                        textAlignment === 'center' ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-600'
                      }`}
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlignment('right')}
                      className={`flex-1 p-1.5 flex items-center justify-center cursor-pointer ${
                        textAlignment === 'right' ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-600'
                      }`}
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Couleur de Fond */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Couleur de fond
                  </label>
                  <select
                    value={textBgColor}
                    onChange={(e) => setTextBgColor(e.target.value)}
                    className="w-full p-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-md dark:bg-slate-800 dark:text-white"
                  >
                    <option value="#FFFFFF">Blanc standard</option>
                    <option value="#FEFCE8">Papier Crème</option>
                    <option value="#F8FAFC">Gris clair</option>
                    <option value="#F0FDF4">Vert d'eau</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Boutons d'action du Modal */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowTextModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleInsertTextPage}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Insérer cette page</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
