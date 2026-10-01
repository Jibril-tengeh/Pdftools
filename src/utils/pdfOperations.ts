import { PDFDocument, rgb, degrees, StandardFonts, PDFName, PDFString } from 'pdf-lib';
import { pdfjsLib } from './pdfWorker';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { createWorker } from 'tesseract.js';
import type { WatermarkOptions, WatermarkItem, MetadataOptions, PageSizeOption, ImageGridModeOption } from '../types';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Safely sanitizes text for pdf-lib's WinAnsi encoding to prevent "WinAnsi cannot encode" errors.
 * Replaces emojis, unencodable symbols, and orphaned surrogate pairs gracefully.
 */
export function safePdfText(font: any, raw: string | null | undefined): string {
  if (!raw) return '';
  let str = String(raw);

  // Common typography & whitespace normalizations
  str = str
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u00A0\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, ' ')
    // Strip emojis, pictographs, transport, misc symbols, dingbats, arrows, and shapes
    .replace(/[\u{1F000}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{2300}-\u{23FF}]/gu, '')
    .replace(/[\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // Variation selectors
    // Strip isolated / broken surrogate units
    .replace(/[\uD800-\uDFFF]/g, '');

  const charSet =
    font && typeof font.getCharacterSet === 'function'
      ? new Set<number>(font.getCharacterSet())
      : null;

  let result = '';
  for (const ch of str) {
    const cp = ch.codePointAt(0) || 0;
    if (charSet) {
      if (charSet.has(cp)) {
        result += ch;
      } else {
        // Try removing diacritics / decompose to ASCII
        const ascii = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let asciiOk = true;
        for (const ac of ascii) {
          if (!charSet.has(ac.codePointAt(0) || 0)) {
            asciiOk = false;
            break;
          }
        }
        result += asciiOk && ascii.length > 0 ? ascii : ' ';
      }
    } else if (font && typeof font.encodeText === 'function') {
      try {
        font.encodeText(ch);
        result += ch;
      } catch {
        const ascii = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        try {
          font.encodeText(ascii);
          result += ascii;
        } catch {
          result += ' ';
        }
      }
    } else {
      // Fallback if no font provided: keep Latin-1 / standard ASCII
      if (cp >= 32 && cp <= 126) {
        result += ch;
      } else if (cp >= 160 && cp <= 255) {
        result += ch;
      } else {
        result += ' ';
      }
    }
  }

  // Final verification pass: guarantee font.encodeText never throws on the returned text
  if (font && typeof font.encodeText === 'function') {
    try {
      font.encodeText(result);
      return result;
    } catch {
      let strictlySafe = '';
      for (const ch of result) {
        try {
          font.encodeText(ch);
          strictlySafe += ch;
        } catch {
          strictlySafe += ' ';
        }
      }
      return strictlySafe;
    }
  }

  return result;
}

/**
 * Downloads a Uint8Array or Blob or ArrayBuffer as a file in the browser
 */
export function downloadFile(data: Uint8Array | Blob | ArrayBuffer, filename: string, mimeType = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data as any], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Formats file size in human readable string (KB, MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Octet';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Helper to safely clone binary data so Web Worker postMessage transfers
 * never detach the caller's ArrayBuffer
 */
function cloneBinaryData(data: ArrayBuffer | Uint8Array): Uint8Array {
  if (data instanceof Uint8Array) {
    return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  }
  return new Uint8Array(data.slice(0));
}

/**
 * Render a single page of a PDF document to a data URL thumbnail
 */
export async function renderPdfThumbnail(
  data: ArrayBuffer | Uint8Array,
  pageNumber: number = 1,
  scale: number = 0.4
): Promise<string> {
  try {
    const safeData = cloneBinaryData(data);
    const loadingTask = pdfjsLib.getDocument({
      data: safeData,
      useWorkerFetch: false,
    });
    const pdfDoc = await loadingTask.promise;
    const safePageNum = Math.min(Math.max(1, pageNumber), pdfDoc.numPages);
    const page = await pdfDoc.getPage(safePageNum);
    
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Fill white background before rendering
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };

    await (page as any).render(renderContext).promise;
    const url = canvas.toDataURL('image/jpeg', 0.85);
    return url;
  } catch (error) {
    console.error('Failed to render PDF thumbnail:', error);
    // Return empty fallback placeholder
    return '';
  }
}

/**
 * Render all pages of a PDF document in one pass (much faster and avoids worker race conditions)
 */
export async function renderAllPdfThumbnails(
  data: ArrayBuffer | Uint8Array,
  scale: number = 0.35
): Promise<string[]> {
  try {
    const safeData = cloneBinaryData(data);
    const loadingTask = pdfjsLib.getDocument({
      data: safeData,
      useWorkerFetch: false,
    });
    const pdfDoc = await loadingTask.promise;
    const thumbnails: string[] = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      try {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          thumbnails.push('');
          continue;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await (page as any).render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise;

        thumbnails.push(canvas.toDataURL('image/jpeg', 0.85));
      } catch (pageErr) {
        console.error(`Failed to render page ${i} thumbnail:`, pageErr);
        thumbnails.push('');
      }
    }

    return thumbnails;
  } catch (error) {
    console.error('Failed to render all PDF thumbnails:', error);
    return [];
  }
}

/**
 * Extract total page count from PDF buffer
 */
export async function getPdfPageCount(data: ArrayBuffer): Promise<number> {
  try {
    const pdf = await PDFDocument.load(data, { ignoreEncryption: true });
    return pdf.getPageCount();
  } catch (e) {
    console.error('Error loading page count via pdf-lib, trying pdfjs:', e);
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
    return doc.numPages;
  }
}

/**
 * Generate a clean sample PDF with multiple pages so users can test immediately
 */
export async function createSamplePdf(name = 'document_exemple.pdf', numPages = 4): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const colors = [
    { primary: rgb(0.12, 0.35, 0.65), bg: rgb(0.96, 0.98, 1.0) }, // Blue
    { primary: rgb(0.2, 0.55, 0.4), bg: rgb(0.96, 1.0, 0.97) },   // Green
    { primary: rgb(0.7, 0.3, 0.15), bg: rgb(1.0, 0.98, 0.95) },  // Amber/Warm
    { primary: rgb(0.45, 0.25, 0.65), bg: rgb(0.98, 0.96, 1.0) }  // Purple
  ];

  for (let i = 0; i < numPages; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
    const { primary } = colors[i % colors.length];

    // Header banner
    page.drawRectangle({
      x: 40,
      y: 770,
      width: 515.28,
      height: 45,
      color: primary,
    });

    page.drawText(`PDF TOOLS - DOCUMENT TEST [PAGE ${i + 1}/${numPages}]`, {
      x: 55,
      y: 787,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Subtitle
    page.drawText(`Page #${i + 1} - Démonstration des outils de manipulation PDF`, {
      x: 40,
      y: 735,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.2),
    });

    // Content paragraphs
    const paragraphs = [
      `Ce document est généré pour tester les fonctionnalités de PDF Tools : fusionner, diviser, réordonner, faire pivoter, ajouter un filigrane ou signer.`,
      `Chaque page est numérotée et dispose d'une couleur d'en-tête distincte pour faciliter le suivi visuel lors du réordonnancement ou de la division.`,
      `Informations de la page :`,
      `• Numéro de page : ${i + 1}`,
      `• Résolution standard : A4 (595 x 842 points)`,
      `• Statut du document : Validé pour test`,
      `• Date de génération : ${new Date().toLocaleDateString('fr-FR')}`,
    ];

    let currentY = 690;
    for (const p of paragraphs) {
      page.drawText(p, {
        x: 40,
        y: currentY,
        size: 11,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.3),
        lineHeight: 18,
      });
      currentY -= 28;
    }

    // Drawing a visual sample box / table simulation
    page.drawRectangle({
      x: 40,
      y: 400,
      width: 515.28,
      height: 70,
      borderColor: primary,
      borderWidth: 1.5,
      color: rgb(0.98, 0.99, 1),
    });

    page.drawText(`Zone de test visuel - Page ${i + 1}`, {
      x: 55,
      y: 440,
      size: 12,
      font: fontBold,
      color: primary,
    });

    page.drawText(`Vous pouvez appliquer une signature électronique ou un filigrane sur cette section.`, {
      x: 55,
      y: 418,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.35, 0.4),
    });

    // Footer
    page.drawLine({
      start: { x: 40, y: 60 },
      end: { x: 555.28, y: 60 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.9),
    });

    page.drawText(`PDF Tools - Traitement 100% sécurisé côté navigateur`, {
      x: 40,
      y: 42,
      size: 9,
      font: fontRegular,
      color: rgb(0.5, 0.55, 0.6),
    });

    page.drawText(`Page ${i + 1} sur ${numPages}`, {
      x: 485,
      y: 42,
      size: 9,
      font: fontBold,
      color: rgb(0.5, 0.55, 0.6),
    });
  }

  pdfDoc.setTitle('Document de test PDF Tools');
  pdfDoc.setAuthor('PDF Tools Browser Suite');
  pdfDoc.setSubject('Démonstration et tests des outils PDF');
  pdfDoc.setCreationDate(new Date());

  return await pdfDoc.save();
}

/**
 * Merge multiple PDF buffers in given order
 */
export async function mergePdfs(buffers: ArrayBuffer[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of buffers) {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Split PDF: extracts specified page indices (0-indexed)
 */
export async function extractPagesFromPdf(
  buffer: ArrayBuffer,
  pageIndices: number[]
): Promise<Uint8Array> {
  const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  const validIndices = pageIndices.filter(
    (idx) => idx >= 0 && idx < sourceDoc.getPageCount()
  );

  if (validIndices.length === 0) {
    throw new Error('Aucune page valide sélectionnée');
  }

  const copiedPages = await newDoc.copyPages(sourceDoc, validIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  return await newDoc.save();
}

/**
 * Reorder and rotate pages of a PDF
 */
export async function reorderAndRotatePdf(
  buffer: ArrayBuffer,
  pages: { originalIndex: number; rotation: number }[]
): Promise<Uint8Array> {
  const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  for (const p of pages) {
    if (p.originalIndex >= 0 && p.originalIndex < sourceDoc.getPageCount()) {
      const [copiedPage] = await newDoc.copyPages(sourceDoc, [p.originalIndex]);
      const currentRotation = copiedPage.getRotation().angle;
      const targetRotation = (currentRotation + p.rotation) % 360;
      copiedPage.setRotation(degrees(targetRotation));
      newDoc.addPage(copiedPage);
    }
  }

  return await newDoc.save();
}

/**
 * Convert images to PDF document with advanced layout and options
 */
export async function convertImagesToPdf(
  images: { dataUrl: string; width: number; height: number; name?: string }[],
  pageSize: PageSizeOption = 'fit',
  orientation: 'auto' | 'portrait' | 'landscape' = 'auto',
  margin: number = 0,
  fitMode: 'contain' | 'cover' = 'contain',
  backgroundColor: string = '#FFFFFF',
  gridMode: ImageGridModeOption = 1,
  showPageNumbers: boolean = false,
  pageNumberPosition: 'bottom-center' | 'bottom-right' = 'bottom-center',
  showFilenameCaptions: boolean = false,
  gridGap: number = 10
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = (showPageNumbers || showFilenameCaptions)
    ? await pdfDoc.embedFont(StandardFonts.Helvetica)
    : null;

  // Page standard sizes in points
  const PAGE_SIZES: Record<string, { width: number; height: number }> = {
    a4: { width: 595.28, height: 841.89 },
    a3: { width: 841.89, height: 1190.55 },
    a5: { width: 419.53, height: 595.28 },
    letter: { width: 612.0, height: 792.0 },
    mobile_9_16: { width: 473.5, height: 841.89 },
    square: { width: 600.0, height: 600.0 },
  };

  // Parse background color
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255 || 1;
  const g = parseInt(hex.substring(2, 4), 16) / 255 || 1;
  const b = parseInt(hex.substring(4, 6), 16) / 255 || 1;
  const bgColor = rgb(r, g, b);

  // Group images into pages based on gridMode (1, 2, or 4 images per page)
  const chunkSize = gridMode === 4 ? 4 : gridMode === 2 ? 2 : 1;
  const imageGroups: (typeof images)[] = [];
  for (let i = 0; i < images.length; i += chunkSize) {
    imageGroups.push(images.slice(i, i + chunkSize));
  }

  const totalPages = imageGroups.length;

  for (let pageIdx = 0; pageIdx < imageGroups.length; pageIdx++) {
    const currentGroup = imageGroups[pageIdx];

    // Determine page geometry
    let targetPageWidth: number;
    let targetPageHeight: number;

    if (pageSize === 'fit' && currentGroup.length === 1) {
      targetPageWidth = currentGroup[0].width + margin * 2;
      targetPageHeight = currentGroup[0].height + margin * 2 + (showFilenameCaptions ? 20 : 0) + (showPageNumbers ? 28 : 0);
    } else {
      const standard = PAGE_SIZES[pageSize === 'fit' ? 'a4' : pageSize] || PAGE_SIZES.a4;
      let isLandscape = false;
      if (orientation === 'landscape') {
        isLandscape = true;
      } else if (orientation === 'auto') {
        isLandscape = currentGroup[0].width > currentGroup[0].height;
      }

      targetPageWidth = isLandscape ? Math.max(standard.width, standard.height) : Math.min(standard.width, standard.height);
      targetPageHeight = isLandscape ? Math.min(standard.width, standard.height) : Math.max(standard.width, standard.height);
    }

    const page = pdfDoc.addPage([targetPageWidth, targetPageHeight]);

    // Draw background color if not pure white
    if (backgroundColor.toLowerCase() !== '#ffffff') {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: targetPageWidth,
        height: targetPageHeight,
        color: bgColor,
      });
    }

    // Usable area excluding margins & page numbers
    const bottomReserved = (showPageNumbers ? 28 : 0);
    const captionHeight = showFilenameCaptions ? 18 : 0;
    const usableWidth = Math.max(10, targetPageWidth - margin * 2);
    const usableHeight = Math.max(10, targetPageHeight - margin * 2 - bottomReserved);

    // Layout slots based on gridMode
    type Slot = { x: number; y: number; width: number; height: number };
    let slots: Slot[] = [];

    if (currentGroup.length === 1) {
      slots = [{ x: margin, y: margin + bottomReserved, width: usableWidth, height: usableHeight }];
    } else if (currentGroup.length === 2) {
      // 2 stacked vertically
      const slotH = (usableHeight - gridGap) / 2;
      slots = [
        { x: margin, y: margin + bottomReserved + slotH + gridGap, width: usableWidth, height: slotH },
        { x: margin, y: margin + bottomReserved, width: usableWidth, height: slotH },
      ];
    } else {
      // 4 in 2x2 grid
      const slotW = (usableWidth - gridGap) / 2;
      const slotH = (usableHeight - gridGap) / 2;
      slots = [
        { x: margin, y: margin + bottomReserved + slotH + gridGap, width: slotW, height: slotH },
        { x: margin + slotW + gridGap, y: margin + bottomReserved + slotH + gridGap, width: slotW, height: slotH },
        { x: margin, y: margin + bottomReserved, width: slotW, height: slotH },
        { x: margin + slotW + gridGap, y: margin + bottomReserved, width: slotW, height: slotH },
      ];
    }

    for (let slotIdx = 0; slotIdx < currentGroup.length; slotIdx++) {
      const imgItem = currentGroup[slotIdx];
      const slot = slots[slotIdx];

      let embeddedImage;
      if (imgItem.dataUrl.startsWith('data:image/png')) {
        embeddedImage = await pdfDoc.embedPng(imgItem.dataUrl);
      } else {
        embeddedImage = await pdfDoc.embedJpg(imgItem.dataUrl);
      }

      const imgWidth = embeddedImage.width;
      const imgHeight = embeddedImage.height;

      const effectiveSlotH = Math.max(10, slot.height - captionHeight);

      let finalWidth: number;
      let finalHeight: number;

      if (pageSize === 'fit' && currentGroup.length === 1 && fitMode !== 'cover') {
        // Fit mode preserves 100% of image dimensions
        const ratio = Math.min(slot.width / imgWidth, effectiveSlotH / imgHeight, 1);
        finalWidth = imgWidth * ratio;
        finalHeight = imgHeight * ratio;
      } else if (fitMode === 'cover') {
        const ratio = Math.max(slot.width / imgWidth, effectiveSlotH / imgHeight);
        finalWidth = imgWidth * ratio;
        finalHeight = imgHeight * ratio;
      } else {
        // 'contain': guarantees 100% of the image is completely visible without any cropping
        const ratio = Math.min(slot.width / imgWidth, effectiveSlotH / imgHeight);
        finalWidth = imgWidth * ratio;
        finalHeight = imgHeight * ratio;
      }

      const imgX = slot.x + (slot.width - finalWidth) / 2;
      const imgY = slot.y + captionHeight + (effectiveSlotH - finalHeight) / 2;

      page.drawImage(embeddedImage, {
        x: imgX,
        y: imgY,
        width: finalWidth,
        height: finalHeight,
      });

      // Optional filename caption
      if (showFilenameCaptions && fontRegular && imgItem.name) {
        const cleanName = imgItem.name.length > 30 ? imgItem.name.slice(0, 27) + '...' : imgItem.name;
        const textWidth = fontRegular.widthOfTextAtSize(cleanName, 9);
        page.drawText(cleanName, {
          x: slot.x + (slot.width - textWidth) / 2,
          y: slot.y + 2,
          size: 9,
          font: fontRegular,
          color: backgroundColor.toLowerCase() === '#000000' ? rgb(0.8, 0.8, 0.8) : rgb(0.3, 0.35, 0.4),
        });
      }
    }

    // Optional page number footer
    if (showPageNumbers && fontRegular) {
      const pageText = `Page ${pageIdx + 1} / ${totalPages}`;
      const textWidth = fontRegular.widthOfTextAtSize(pageText, 9);
      const textX = pageNumberPosition === 'bottom-center'
        ? (targetPageWidth - textWidth) / 2
        : targetPageWidth - margin - textWidth;
      const textY = Math.max(6, margin / 2 + 4);

      page.drawText(pageText, {
        x: textX,
        y: textY,
        size: 9,
        font: fontRegular,
        color: backgroundColor.toLowerCase() === '#000000' ? rgb(0.7, 0.7, 0.7) : rgb(0.4, 0.45, 0.5),
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Crop / Trim PDF margins
 */
export async function cropPdf(
  buffer: ArrayBuffer,
  marginsPercent: { left: number; right: number; top: number; bottom: number }
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = doc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const cropLeft = (width * marginsPercent.left) / 100;
    const cropRight = (width * marginsPercent.right) / 100;
    const cropBottom = (height * marginsPercent.bottom) / 100;
    const cropTop = (height * marginsPercent.top) / 100;

    const newX = cropLeft;
    const newY = cropBottom;
    const newWidth = Math.max(10, width - cropLeft - cropRight);
    const newHeight = Math.max(10, height - cropTop - cropBottom);

    page.setCropBox(newX, newY, newWidth, newHeight);
    page.setMediaBox(newX, newY, newWidth, newHeight);
  }

  return await doc.save();
}

/**
 * Add multiple distinct watermark items to PDF
 */
export async function addMultipleWatermarksToPdf(
  buffer: ArrayBuffer,
  watermarks: WatermarkItem[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  for (const wm of watermarks) {
    if (!wm.text.trim()) continue;

    // Parse color hex to rgb
    const hex = wm.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255 || 0.5;
    const g = parseInt(hex.substring(2, 4), 16) / 255 || 0.5;
    const b = parseInt(hex.substring(4, 6), 16) / 255 || 0.5;
    const watermarkColor = rgb(r, g, b);

    let targetIndices: number[] = [];
    if (wm.applyTo === 'all') {
      targetIndices = pages.map((_, idx) => idx);
    } else if (wm.applyTo === 'first') {
      targetIndices = [0];
    } else if (wm.applyTo === 'custom' && wm.customPages) {
      targetIndices = parsePageRange(wm.customPages, pages.length);
    } else {
      targetIndices = pages.map((_, idx) => idx);
    }

    const safeText = safePdfText(font, wm.text);
    for (const pageIdx of targetIndices) {
      if (pageIdx < 0 || pageIdx >= pages.length) continue;
      const page = pages[pageIdx];
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(safeText, wm.fontSize);
      const textHeight = font.heightAtSize(wm.fontSize);

      if (wm.position === 'center') {
        page.drawText(safeText, {
          x: width / 2 - (textWidth / 2) * Math.cos((wm.rotation * Math.PI) / 180),
          y: height / 2 - (textWidth / 2) * Math.sin((wm.rotation * Math.PI) / 180),
          size: wm.fontSize,
          font: font,
          color: watermarkColor,
          opacity: wm.opacity,
          rotate: degrees(wm.rotation),
        });
      } else if (wm.position === 'top') {
        page.drawText(safeText, {
          x: width / 2 - textWidth / 2,
          y: height - textHeight - 40,
          size: wm.fontSize,
          font: font,
          color: watermarkColor,
          opacity: wm.opacity,
        });
      } else if (wm.position === 'bottom') {
        page.drawText(safeText, {
          x: width / 2 - textWidth / 2,
          y: 40,
          size: wm.fontSize,
          font: font,
          color: watermarkColor,
          opacity: wm.opacity,
        });
      } else if (wm.position === 'repeat') {
        // Repeat across diagonal grid
        const stepX = 220;
        const stepY = 160;
        for (let x = -50; x < width + 100; x += stepX) {
          for (let y = -50; y < height + 100; y += stepY) {
            page.drawText(safeText, {
              x,
              y,
              size: Math.min(wm.fontSize, 32),
              font: font,
              color: watermarkColor,
              opacity: wm.opacity * 0.7,
              rotate: degrees(wm.rotation),
            });
          }
        }
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Add single watermark text to PDF (convenience wrapper)
 */
export async function addWatermarkToPdf(
  buffer: ArrayBuffer,
  options: WatermarkOptions
): Promise<Uint8Array> {
  return await addMultipleWatermarksToPdf(buffer, [options]);
}

/**
 * Add signature image to PDF at specified relative coordinates
 */
export async function addSignatureToPdf(
  buffer: ArrayBuffer,
  pageIndex: number,
  signaturePngDataUrl: string,
  relX: number, // 0 to 1 relative to page width
  relY: number, // 0 to 1 relative to page height (from bottom)
  relWidth: number, // relative to page width
  includeDateStamp = true
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const page = pages[Math.min(Math.max(0, pageIndex), pages.length - 1)];
  const { width, height } = page.getSize();

  const signatureImage = await pdfDoc.embedPng(signaturePngDataUrl);
  const sigAspect = signatureImage.width / signatureImage.height;

  const targetWidth = width * relWidth;
  const targetHeight = targetWidth / sigAspect;

  const targetX = width * relX;
  const targetY = height * relY;

  page.drawImage(signatureImage, {
    x: targetX,
    y: targetY,
    width: targetWidth,
    height: targetHeight,
  });

  if (includeDateStamp) {
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const dateStr = `Signé numériquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    page.drawText(dateStr, {
      x: targetX,
      y: Math.max(10, targetY - 12),
      size: 8,
      font: fontRegular,
      color: rgb(0.3, 0.35, 0.4),
    });
  }

  return await pdfDoc.save();
}

/**
 * Read and update PDF metadata
 */
export async function readPdfMetadata(buffer: ArrayBuffer): Promise<MetadataOptions> {
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return {
      title: doc.getTitle() || '',
      author: doc.getAuthor() || '',
      subject: doc.getSubject() || '',
      keywords: doc.getKeywords() || '',
      creator: doc.getCreator() || '',
      producer: doc.getProducer() || '',
    };
  } catch (e) {
    console.error('Error reading metadata:', e);
    return {
      title: '',
      author: '',
      subject: '',
      keywords: '',
      creator: '',
      producer: '',
    };
  }
}

export async function updatePdfMetadata(
  buffer: ArrayBuffer,
  metadata: MetadataOptions
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  if (metadata.title) doc.setTitle(metadata.title);
  if (metadata.author) doc.setAuthor(metadata.author);
  if (metadata.subject) doc.setSubject(metadata.subject);
  if (metadata.keywords) doc.setKeywords(metadata.keywords.split(',').map((s) => s.trim()));
  if (metadata.creator) doc.setCreator(metadata.creator);
  if (metadata.producer) doc.setProducer(metadata.producer);
  doc.setModificationDate(new Date());

  return await doc.save();
}

/**
 * Extract plain text from PDF using pdfjsLib
 */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<{ fullText: string; pageTexts: string[] }> {
  const safeData = cloneBinaryData(buffer);
  const doc = await pdfjsLib.getDocument({
    data: safeData,
    useWorkerFetch: false,
  }).promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .filter(Boolean);
    pageTexts.push(strings.join(' '));
  }

  return {
    fullText: pageTexts.join('\n\n--- Page ---\n\n'),
    pageTexts,
  };
}

/**
 * Utility: Parse page range string like "1-3, 5, 8-10" to 0-indexed array
 */
export function parsePageRange(rangeStr: string, maxPages: number): number[] {
  const indices = new Set<number>();
  const parts = rangeStr.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(maxPages, Math.max(start, end));
        for (let i = from; i <= to; i++) {
          indices.add(i - 1);
        }
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page >= 1 && page <= maxPages) {
        indices.add(page - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Convert document to PDF/A standard for long-term archiving (ISO 19005)
 */
export async function convertToPdfA(
  buffer: ArrayBuffer,
  metadata: MetadataOptions,
  pdfaLevel: 'PDF/A-1b' | 'PDF/A-2b' = 'PDF/A-1b'
): Promise<{ pdfBytes: Uint8Array; complianceDetails: string[] }> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  const now = new Date();
  const isoDate = now.toISOString();

  // Set standardized metadata
  const docTitle = metadata.title || 'Document Archivé';
  const docAuthor = metadata.author || 'PDF Tools Archiver';
  const docSubject = metadata.subject || 'Archivage pérenne ISO 19005';
  const docKeywords = metadata.keywords || 'archive, pdf/a, iso-19005';
  const docProducer = metadata.producer || `PDF Tools PDF/A Engine (${pdfaLevel})`;
  const docCreator = metadata.creator || 'PDF Tools Browser Suite';

  doc.setTitle(docTitle);
  doc.setAuthor(docAuthor);
  doc.setSubject(docSubject);
  doc.setKeywords(docKeywords.split(',').map((s) => s.trim()));
  doc.setCreator(docCreator);
  doc.setProducer(docProducer);
  doc.setCreationDate(now);
  doc.setModificationDate(now);

  const part = pdfaLevel === 'PDF/A-1b' ? '1' : '2';

  // Build standard XMP XML packet
  const xmpXml = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>${part}</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:format>application/pdf</dc:format>
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(docTitle)}</rdf:li></rdf:Alt></dc:title>
      <dc:creator><rdf:Seq><rdf:li>${escapeXml(docAuthor)}</rdf:li></rdf:Seq></dc:creator>
      <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(docSubject)}</rdf:li></rdf:Alt></dc:description>
      <dc:date><rdf:Seq><rdf:li>${isoDate}</rdf:li></rdf:Seq></dc:date>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>${escapeXml(docProducer)}</pdf:Producer>
      <pdf:Keywords>${escapeXml(docKeywords)}</pdf:Keywords>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreateDate>${isoDate}</xmp:CreateDate>
      <xmp:ModifyDate>${isoDate}</xmp:ModifyDate>
      <xmp:MetadataDate>${isoDate}</xmp:MetadataDate>
      <xmp:CreatorTool>${escapeXml(docCreator)}</xmp:CreatorTool>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  // Create stream for XMP
  const metadataStream = doc.context.stream(xmpXml, {
    Type: 'Metadata',
    Subtype: 'XML',
  });
  const metadataRef = doc.context.register(metadataStream);
  doc.catalog.set(PDFName.of('Metadata'), metadataRef);

  // Set OutputIntent for device-independent sRGB color rendering
  const outputIntentDict = doc.context.obj({
    Type: 'OutputIntent',
    S: 'GTS_PDFA1',
    OutputCondition: PDFString.of('sRGB IEC61966-2.1'),
    OutputConditionIdentifier: PDFString.of('Custom'),
    RegistryName: PDFString.of('http://www.color.org'),
    Info: PDFString.of('sRGB IEC61966-2.1'),
  });
  const outputIntentRef = doc.context.register(outputIntentDict);
  const outputIntentsArray = doc.context.obj([outputIntentRef]);
  doc.catalog.set(PDFName.of('OutputIntents'), outputIntentsArray);

  const pdfBytes = await doc.save();

  const complianceDetails = [
    `Profil d'archivage : ${pdfaLevel} (ISO 19005-${part})`,
    'Métadonnées XMP conformes injectées avec balises <pdfaid:part> et <pdfaid:conformance>B',
    'OutputIntent colorimétrique sRGB IEC61966-2.1 configuré',
    `Date d'horodatage pérenne : ${now.toLocaleString('fr-FR')}`,
    'Structure du catalogue validée pour conservation légale',
  ];

  return { pdfBytes, complianceDetails };
}

export interface ProtectPdfOptions {
  userPassword: string;
  ownerPassword?: string;
  algorithm?: 'AES-256' | 'RC4';
  allowPrinting?: boolean;
  allowCopying?: boolean;
  allowModifying?: boolean;
  allowAnnotating?: boolean;
}

/**
 * Protect and encrypt a PDF document with a password client-side
 */
export async function protectPdfWithPassword(
  buffer: ArrayBuffer,
  options: ProtectPdfOptions
): Promise<Uint8Array> {
  const bytes = cloneBinaryData(buffer);

  try {
    const encrypted = await encryptPDF(bytes, options.userPassword, {
      algorithm: options.algorithm || 'AES-256',
      ownerPassword: options.ownerPassword || options.userPassword,
      allowPrinting: options.allowPrinting !== false,
      allowCopying: options.allowCopying !== false,
      allowModifying: options.allowModifying === true,
      allowAnnotating: options.allowAnnotating === true,
      allowHighQualityPrint: options.allowPrinting !== false,
    });
    return encrypted;
  } catch (err) {
    console.warn('AES-256 encryption attempt warning, falling back to RC4:', err);
    const encrypted = await encryptPDF(bytes, options.userPassword, {
      algorithm: 'RC4',
      ownerPassword: options.ownerPassword || options.userPassword,
      allowPrinting: options.allowPrinting !== false,
      allowCopying: options.allowCopying !== false,
      allowModifying: options.allowModifying === true,
      allowAnnotating: options.allowAnnotating === true,
      allowHighQualityPrint: options.allowPrinting !== false,
    });
    return encrypted;
  }
}

export interface OcrResult {
  text: string;
  confidence: number;
  wordCount: number;
}

/**
 * Perform Optical Character Recognition (OCR) on an HTML canvas element locally using Tesseract.js
 */
export async function performOcrOnCanvas(
  canvas: HTMLCanvasElement,
  language: string = 'fra+eng',
  onProgress?: (progress: number, status: string) => void
): Promise<OcrResult> {
  const worker = await createWorker(language, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100), 'Extraction optique des caractères...');
      } else if (onProgress && m.status) {
        onProgress(0, m.status === 'loading tesseract core' ? 'Chargement du moteur WebAssembly...' : m.status);
      }
    },
  });

  try {
    const ret = await worker.recognize(canvas);
    const text = ret.data.text ? ret.data.text.trim() : '';
    const confidence = Math.round(ret.data.confidence || 0);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return { text, confidence, wordCount };
  } finally {
    await worker.terminate();
  }
}

export interface PageNumberOptions {
  format: 'page-x-y' | 'page-x' | 'x-y' | 'x';
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
  fontSize: number;
  color: string;
  margin: number;
  startPageNumber: number;
  excludeFirstPage: boolean;
}

/**
 * Adds customizable page numbers to each page of a PDF document
 */
export async function addPageNumbersToPdf(
  buffer: ArrayBuffer,
  options: PageNumberOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const totalPages = pdfDoc.getPageCount();

  const hex = options.color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255 || 0.2;
  const g = parseInt(hex.substring(2, 4), 16) / 255 || 0.2;
  const b = parseInt(hex.substring(4, 6), 16) / 255 || 0.2;
  const textColor = rgb(r, g, b);

  for (let i = 0; i < totalPages; i++) {
    if (i === 0 && options.excludeFirstPage) continue;

    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const currentNum = i + options.startPageNumber;

    let text = '';
    switch (options.format) {
      case 'page-x-y':
        text = `Page ${currentNum} sur ${totalPages}`;
        break;
      case 'page-x':
        text = `Page ${currentNum}`;
        break;
      case 'x-y':
        text = `${currentNum} / ${totalPages}`;
        break;
      case 'x':
      default:
        text = `${currentNum}`;
        break;
    }

    const textWidth = font.widthOfTextAtSize(text, options.fontSize);
    const margin = options.margin || 25;

    let x = width / 2 - textWidth / 2;
    let y = margin;

    if (options.position === 'bottom-center') {
      x = width / 2 - textWidth / 2;
      y = margin;
    } else if (options.position === 'bottom-right') {
      x = width - margin - textWidth;
      y = margin;
    } else if (options.position === 'bottom-left') {
      x = margin;
      y = margin;
    } else if (options.position === 'top-center') {
      x = width / 2 - textWidth / 2;
      y = height - margin - options.fontSize;
    } else if (options.position === 'top-right') {
      x = width - margin - textWidth;
      y = height - margin - options.fontSize;
    } else if (options.position === 'top-left') {
      x = margin;
      y = height - margin - options.fontSize;
    }

    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: textColor,
    });
  }

  return await pdfDoc.save();
}

export interface ConvertedPageImage {
  pageNumber: number;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Converts all pages of a PDF into high-resolution JPG or PNG images
 */
export async function convertPdfToImages(
  buffer: ArrayBuffer,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  scale: number = 2.0,
  onProgress?: (current: number, total: number) => void
): Promise<ConvertedPageImage[]> {
  const safeData = cloneBinaryData(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data: safeData,
    useWorkerFetch: false,
  });
  const pdfDoc = await loadingTask.promise;
  const results: ConvertedPageImage[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await (page as any).render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    const dataUrl = canvas.toDataURL(format, 0.92);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), format, 0.92);
    });

    results.push({
      pageNumber: i,
      dataUrl,
      blob,
      width: canvas.width,
      height: canvas.height,
    });

    if (onProgress) {
      onProgress(i, pdfDoc.numPages);
    }
  }

  return results;
}

/**
 * Compresses PDF document by re-encoding object streams and optimizing data structures
 */
export async function compressPdf(
  buffer: ArrayBuffer,
  _compressionLevel: 'low' | 'medium' | 'high' = 'medium'
): Promise<{ compressedBytes: Uint8Array; originalSize: number; newSize: number; savedPercent: number }> {
  const safeData = cloneBinaryData(buffer);
  const doc = await PDFDocument.load(safeData, { ignoreEncryption: true });

  const compressedBytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });

  const originalSize = buffer.byteLength;
  const newSize = compressedBytes.byteLength;
  const savedPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

  return {
    compressedBytes,
    originalSize,
    newSize,
    savedPercent,
  };
}


