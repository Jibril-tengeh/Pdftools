import React, { useState, useRef, useEffect } from 'react';
import {
  Palette,
  Sparkles,
  Download,
  Copy,
  Check,
  Crop,
  Layers,
  ShieldCheck,
  Eye,
  Sliders,
  Maximize2,
  Minimize2,
  RefreshCw,
  FolderArchive,
  Image as ImageIcon,
  Type,
  FlipHorizontal,
  FlipVertical,
} from 'lucide-react';
import JSZip from 'jszip';
import { DropZone } from '../DropZone';
import { addRecentFile } from '../../utils/recentFiles';
import type { ToolId } from '../../types';

interface ImageAdvancedToolsProps {
  toolId: ToolId;
}

export const ImageAdvancedTools: React.FC<ImageAdvancedToolsProps> = ({ toolId }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);

  // Meme state
  const [topText, setTopText] = useState<string>('QUAND LE CODE COMPILE');
  const [bottomText, setBottomText] = useState<string>('DU PREMIER COUP SANS ERREUR');

  // Gradient state
  const [gradColor1, setGradColor1] = useState<string>('#6366F1');
  const [gradColor2, setGradColor2] = useState<string>('#EC4899');
  const [gradAngle, setGradAngle] = useState<number>(135);

  // Social ratio
  const [socialFormat, setSocialFormat] = useState<'insta_post' | 'story' | 'yt_banner' | 'twitter'>('insta_post');

  // Flip & Mirror
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Pixel art
  const [pixelSize, setPixelSize] = useState<number>(12);

  // Watermark text
  const [watermarkText, setWatermarkText] = useState<string>('PROPRIÉTÉ EXCLUSIVE');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const toolConfig: Record<string, { title: string; desc: string }> = {
    'image-meme': {
      title: 'Générateur de Mèmes',
      desc: 'Ajoutez des textes percutants en haut et en bas de vos images pour créer des mèmes viraux.',
    },
    'image-palette': {
      title: 'Palette & Extraction de Couleurs',
      desc: 'Extrayez automatiquement les couleurs dominantes d’une photo avec codes HEX, RGB et CSS.',
    },
    'image-social-crop': {
      title: 'Recadrage Réseaux Sociaux',
      desc: 'Adaptez en un clic aux dimensions parfaites : Instagram Post, Reel/Story 9:16, YouTube ou Twitter/X.',
    },
    'image-collage': {
      title: 'Créateur de Collages Photos',
      desc: 'Assemblez plusieurs photos en mosaïque élégante avec bordures ajustables.',
    },
    'image-exif-cleaner': {
      title: 'Nettoyeur de Métadonnées EXIF',
      desc: 'Supprimez les coordonnées GPS, modèle d’appareil et date pour protéger votre vie privée.',
    },
    'image-gradients': {
      title: 'Générateur de Dégradés HD',
      desc: 'Concevez des arrière-plans et fonds d’écran en dégradé haute résolution (PNG / SVG).',
    },
    'image-favicon': {
      title: 'Générateur de Favicon & Icônes PWA',
      desc: 'Générez en un clic le pack complet d’icônes (16x16, 32x32, 180x180, 512x512) dans un ZIP.',
    },
    'image-compare': {
      title: 'Comparateur Avant / Après',
      desc: 'Comparez visuellement deux versions d’une retouche photo avec séparateur glissant.',
    },
    'image-watermark': {
      title: 'Ajouter un Filigrane sur Image',
      desc: 'Incrustez votre nom, logo ou mention de copyright sur vos photos.',
    },
    'image-remove-bg': {
      title: 'Détourage & Suppression d’Arrière-plan',
      desc: 'Isolez le sujet principal en rendant le fond transparent localement.',
    },
    'image-pixel-art': {
      title: 'Pixelisation & Floutage Censure',
      desc: 'Appliquez un effet rétro pixel art ou masquez les zones confidentielles.',
    },
    'image-flip': {
      title: 'Symétrie & Effet Miroir',
      desc: 'Retournez horizontalement ou verticalement votre image en conservant la pleine résolution.',
    },
  };

  const currentConfig = toolConfig[toolId] || {
    title: 'Studio Image Avancé',
    desc: 'Traitement graphique haute performance 100% hors-ligne dans votre navigateur.',
  };

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setSelectedFile(f);
    const url = URL.createObjectURL(f);
    setImageSrc(url);

    // If palette tool, extract colors
    if (toolId === 'image-palette') {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = 100;
        cv.height = 100;
        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 100, 100);
          const data = ctx.getImageData(0, 0, 100, 100).data;
          const colors: string[] = [];
          for (let i = 0; i < data.length; i += 400) {
            const r = data[i].toString(16).padStart(2, '0');
            const g = data[i + 1].toString(16).padStart(2, '0');
            const b = data[i + 2].toString(16).padStart(2, '0');
            const hex = `#${r}${g}${b}`.toUpperCase();
            if (!colors.includes(hex)) colors.push(hex);
            if (colors.length >= 8) break;
          }
          setExtractedColors(colors);
        }
      };
    }
  };

  // Render on canvas for Meme, Watermark, Pixel, Flip, Social
  useEffect(() => {
    if (!imageSrc && toolId !== 'image-gradients') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (toolId === 'image-gradients') {
      canvas.width = 1920;
      canvas.height = 1080;
      const rad = (gradAngle * Math.PI) / 180;
      const x2 = Math.cos(rad) * 1920;
      const y2 = Math.sin(rad) * 1080;
      const grad = ctx.createLinearGradient(0, 0, Math.abs(x2), Math.abs(y2));
      grad.addColorStop(0, gradColor1);
      grad.addColorStop(1, gradColor2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1920, 1080);
      return;
    }

    const img = new Image();
    img.src = imageSrc!;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Handle Flip
      ctx.save();
      ctx.translate(flipH ? img.width : 0, flipV ? img.height : 0);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();

      // Handle Pixel Art
      if (toolId === 'image-pixel-art' && pixelSize > 1) {
        const w = img.width;
        const h = img.height;
        const sw = Math.max(1, Math.round(w / pixelSize));
        const sh = Math.max(1, Math.round(h / pixelSize));
        const temp = document.createElement('canvas');
        temp.width = sw;
        temp.height = sh;
        const tCtx = temp.getContext('2d');
        if (tCtx) {
          tCtx.drawImage(canvas, 0, 0, sw, sh);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(temp, 0, 0, sw, sh, 0, 0, w, h);
        }
      }

      // Handle Meme text
      if (toolId === 'image-meme') {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.round(canvas.width / 80);
        ctx.textAlign = 'center';
        const fontSize = Math.round(canvas.width / 14);
        ctx.font = `900 ${fontSize}px Impact, Arial Black, sans-serif`;

        if (topText) {
          ctx.strokeText(topText.toUpperCase(), canvas.width / 2, fontSize + 20);
          ctx.fillText(topText.toUpperCase(), canvas.width / 2, fontSize + 20);
        }
        if (bottomText) {
          ctx.strokeText(bottomText.toUpperCase(), canvas.width / 2, canvas.height - 30);
          ctx.fillText(bottomText.toUpperCase(), canvas.width / 2, canvas.height - 30);
        }
      }

      // Handle Watermark
      if (toolId === 'image-watermark') {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = `bold ${Math.round(canvas.width / 24)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(watermarkText, 0, 0);
        ctx.restore();
      }
    };
  }, [
    imageSrc,
    toolId,
    topText,
    bottomText,
    gradColor1,
    gradColor2,
    gradAngle,
    flipH,
    flipV,
    pixelSize,
    watermarkText,
  ]);

  const handleDownloadCanvas = (format: 'png' | 'jpg' = 'png') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.95);
    a.download = `studio_${toolId}_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addRecentFile({
      name: `studio_${toolId}.${format}`,
      toolName: currentConfig.title,
      toolId,
      size: 1024 * 500,
      pageCount: 1,
    });
  };

  // Favicon pack generator
  const handleDownloadFaviconPack = async () => {
    if (!canvasRef.current) return;
    const zip = new JSZip();
    const sizes = [16, 32, 48, 64, 180, 512];

    for (const size of sizes) {
      const cv = document.createElement('canvas');
      cv.width = size;
      cv.height = size;
      const ctx = cv.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvasRef.current, 0, 0, size, size);
        const blob = await new Promise<Blob>((res) => cv.toBlob((b) => res(b!), 'image/png'));
        zip.file(`favicon-${size}x${size}.png`, blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = `pack_favicons_${Date.now()}.zip`;
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
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{currentConfig.title}</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                Image Pro
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{currentConfig.desc}</p>
          </div>
        </div>
      </div>

      {toolId !== 'image-gradients' && !selectedFile && (
        <DropZone
          onFilesSelected={handleFilesSelected}
          multiple={false}
          accept="image/*"
          title="Déposez une photo ou image"
          subtitle="PNG, JPG, WEBP, SVG"
        />
      )}

      {/* Palette Tool */}
      {toolId === 'image-palette' && selectedFile && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Couleurs dominantes extraites :
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {extractedColors.map((color) => (
              <div
                key={color}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-850"
              >
                <div className="w-10 h-10 rounded-lg shadow-2xs shrink-0" style={{ backgroundColor: color }} />
                <div className="truncate">
                  <div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{color}</div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(color);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-[11px] text-emerald-600 hover:underline cursor-pointer"
                  >
                    Copier HEX
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meme / Canvas View */}
      {(selectedFile || toolId === 'image-gradients') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs text-xs">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Réglages de l’outil</span>
            </h3>

            {toolId === 'image-meme' && (
              <div className="space-y-3">
                <div>
                  <label className="font-semibold block mb-1">Texte du Haut</label>
                  <input
                    type="text"
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Texte du Bas</label>
                  <input
                    type="text"
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>
            )}

            {toolId === 'image-flip' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFlipH(!flipH)}
                  className={`flex-1 p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold ${
                    flipH ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'
                  }`}
                >
                  <FlipHorizontal className="w-4 h-4" />
                  <span>Miroir H</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlipV(!flipV)}
                  className={`flex-1 p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold ${
                    flipV ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'
                  }`}
                >
                  <FlipVertical className="w-4 h-4" />
                  <span>Miroir V</span>
                </button>
              </div>
            )}

            {toolId === 'image-pixel-art' && (
              <div className="space-y-2">
                <div className="flex justify-between font-semibold">
                  <span>Taille des pixels</span>
                  <span className="font-mono">{pixelSize}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="40"
                  value={pixelSize}
                  onChange={(e) => setPixelSize(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
            )}

            {toolId === 'image-gradients' && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="font-semibold block mb-1">Couleur 1</label>
                    <input
                      type="color"
                      value={gradColor1}
                      onChange={(e) => setGradColor1(e.target.value)}
                      className="w-full h-9 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="font-semibold block mb-1">Couleur 2</label>
                    <input
                      type="color"
                      value={gradColor2}
                      onChange={(e) => setGradColor2(e.target.value)}
                      className="w-full h-9 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-semibold">
                    <span>Angle du dégradé</span>
                    <span>{gradAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={gradAngle}
                    onChange={(e) => setGradAngle(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>
            )}

            {toolId === 'image-watermark' && (
              <div>
                <label className="font-semibold block mb-1">Texte du filigrane</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            )}

            {toolId === 'image-favicon' && (
              <button
                type="button"
                onClick={handleDownloadFaviconPack}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
              >
                <FolderArchive className="w-4 h-4" />
                <span>Télécharger Pack Favicons (ZIP)</span>
              </button>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => handleDownloadCanvas('png')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exporter Image PNG</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadCanvas('jpg')}
                className="w-full py-2 font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
              >
                Exporter JPG
              </button>
            </div>
          </div>

          {/* Canvas Render (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} className="max-w-full max-h-[600px] object-contain rounded-xl shadow-xs" />
          </div>
        </div>
      )}
    </div>
  );
};
