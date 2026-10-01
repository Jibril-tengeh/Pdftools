import React, { useState, useRef, useEffect } from 'react';
import {
  Palette,
  Download,
  RotateCcw,
  Sparkles,
  Sliders,
  CheckCircle2,
  Sun,
  Contrast,
  Droplet,
  Layers,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { downloadFile } from '../../utils/pdfOperations';

export const ImageFilterTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Filters state
  const [brightness, setBrightness] = useState<number>(100); // 0 to 200
  const [contrast, setContrast] = useState<number>(100); // 0 to 200
  const [saturation, setSaturation] = useState<number>(100); // 0 to 200
  const [grayscale, setGrayscale] = useState<number>(0); // 0 to 100
  const [sepia, setSepia] = useState<number>(0); // 0 to 100
  const [blur, setBlur] = useState<number>(0); // 0 to 10
  const [invert, setInvert] = useState<number>(0); // 0 to 100

  const handleFileSelect = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    resetFilters();

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
    };
    reader.readAsDataURL(f);
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setGrayscale(0);
    setSepia(0);
    setBlur(0);
    setInvert(0);
  };

  // Presets
  const applyPreset = (preset: 'vintage' | 'bw' | 'cinema' | 'pop' | 'dramatic') => {
    resetFilters();
    switch (preset) {
      case 'vintage':
        setSepia(45);
        setContrast(115);
        setBrightness(105);
        setSaturation(85);
        break;
      case 'bw':
        setGrayscale(100);
        setContrast(130);
        setBrightness(105);
        break;
      case 'cinema':
        setContrast(125);
        setSaturation(120);
        setBrightness(95);
        break;
      case 'pop':
        setSaturation(160);
        setContrast(115);
        setBrightness(105);
        break;
      case 'dramatic':
        setContrast(145);
        setBrightness(90);
        setSaturation(90);
        break;
    }
  };

  // Draw filtered image on canvas
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Apply CSS filter directly into canvas rendering
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blur}px) invert(${invert}%)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageSrc;
  }, [imageSrc, brightness, contrast, saturation, grayscale, sepia, blur, invert]);

  const handleDownload = () => {
    if (!canvasRef.current || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, `${baseName}_filtre.png`, 'image/png');
      }
    }, 'image/png');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Filtres & Retouches Photo</h1>
            <p className="text-xs text-slate-500">
              Ajustez la luminosité, le contraste, la saturation ou appliquez des filtres artistiques en direct.
            </p>
          </div>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          accept="image/*"
          title="Déposez une photo à retoucher"
          subtitle="Supporte JPG, PNG, WEBP, GIF"
          onUseSample={() => {}}
          isGeneratingSample={false}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center: Live Canvas Preview */}
          <div className="lg:col-span-2 bg-slate-900/95 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center min-h-[420px] max-h-[600px] overflow-auto shadow-inner relative">
            <canvas
              ref={canvasRef}
              className="max-h-[500px] max-w-full object-contain rounded-lg shadow-2xl transition-all"
            />
          </div>

          {/* Right: Controls & Presets */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Styles & Filtres</span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Réinitialiser</span>
                </button>
              </div>

              {/* Fast Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700">Préréglages instantanés</label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => applyPreset('vintage')}
                    className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Vintage
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('bw')}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Noir & Blanc
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('cinema')}
                    className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Cinéma
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('pop')}
                    className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Éclatant
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('dramatic')}
                    className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Dramatique
                  </button>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Original
                  </button>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-500" /> Luminosité
                    </span>
                    <span className="font-mono text-slate-500">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <Contrast className="w-3 h-3 text-slate-500" /> Contraste
                    </span>
                    <span className="font-mono text-slate-500">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <Droplet className="w-3 h-3 text-blue-500" /> Saturation
                    </span>
                    <span className="font-mono text-slate-500">{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                {/* Grayscale */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-medium text-slate-700">Noir & Blanc</span>
                    <span className="font-mono text-slate-500">{grayscale}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={grayscale}
                    onChange={(e) => setGrayscale(Number(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                {/* Sepia */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-medium text-slate-700">Effet Sépia</span>
                    <span className="font-mono text-slate-500">{sepia}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sepia}
                    onChange={(e) => setSepia(Number(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                {/* Blur */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-medium text-slate-700">Flou artistique</span>
                    <span className="font-mono text-slate-500">{blur} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="0.5"
                    value={blur}
                    onChange={(e) => setBlur(Number(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger l’Image Retouchée</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setImageSrc(null);
                }}
                className="w-full text-center text-xs text-rose-600 hover:text-rose-700 py-1 cursor-pointer"
              >
                Changer d'image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
