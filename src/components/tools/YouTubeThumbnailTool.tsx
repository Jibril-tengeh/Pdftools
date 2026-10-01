import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Youtube,
  Download,
  Copy,
  Check,
  Sparkles,
  Sliders,
  Type,
  Image as ImageIcon,
  Layers,
  Flame,
  Star,
  RefreshCw,
  FolderArchive,
  Eye,
  Plus,
  Trash2,
  Move,
  RotateCw,
  Upload,
  Square,
  CopyPlus,
  Palette,
  ArrowRight,
  Maximize2,
  ZoomIn,
} from 'lucide-react';
import JSZip from 'jszip';
import { addRecentFile } from '../../utils/recentFiles';

interface ThumbnailQuality {
  label: string;
  res: string;
  filename: string;
  badge: string;
}

export interface TextLayer {
  id: string;
  text: string;
  x: number; // 0 to 100 (%)
  y: number; // 0 to 100 (%)
  fontSize: number; // 20 to 140
  fontFamily: 'impact' | 'sans' | 'montserrat' | 'serif' | 'mono' | 'bangers';
  color: string;
  strokeColor: string;
  strokeWidth: number;
  rotation: number;
  hasBackground?: boolean;
  backgroundColor?: string;
  backgroundPadding?: number;
}

export interface ImageLayer {
  id: string;
  src: string;
  label: string;
  x: number; // 0 to 100 (%)
  y: number; // 0 to 100 (%)
  width: number; // 40 to 600 px
  rotation: number;
  opacity: number; // 0.1 to 1
  isSticker?: boolean;
}

export interface MaskBoxLayer {
  id: string;
  x: number; // 0 to 100 (%)
  y: number; // 0 to 100 (%)
  width: number; // % of canvas width
  height: number; // % of canvas height
  color: string;
  borderRadius: number;
  opacity: number;
}

export const YouTubeThumbnailTool: React.FC<{ initialTab?: 'extractor' | 'editor' }> = ({
  initialTab = 'extractor',
}) => {
  const [activeTab, setActiveTab] = useState<'extractor' | 'editor'>(initialTab);

  // --- EXTRACTOR STATE ---
  const [videoUrl, setVideoUrl] = useState<string>('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [batchUrls, setBatchUrls] = useState<string>('');
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // --- EDITOR STATE ---
  const [bgType, setBgType] = useState<'gradient' | 'color' | 'image'>('image');
  const [gradientPreset, setGradientPreset] = useState<string>('fire');
  const [customBgColor, setCustomBgColor] = useState<string>('#0F172A');
  const [bgImage, setBgImage] = useState<string | null>('https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(115);
  const [saturation, setSaturation] = useState<number>(125);

  // Selected layer
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>('txt-1');
  const [selectedLayerType, setSelectedLayerType] = useState<'text' | 'image' | 'mask' | 'bg'>('text');
  const [inlineEditingTextId, setInlineEditingTextId] = useState<string | null>(null);

  // Canvas Dragging State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ mouseX: number; mouseY: number; elemX: number; elemY: number } | null>(null);

  // Layers
  const [textLayers, setTextLayers] = useState<TextLayer[]>([
    {
      id: 'txt-1',
      text: 'TITRE CHOC ! 😱',
      x: 12,
      y: 45,
      fontSize: 68,
      fontFamily: 'impact',
      color: '#FACC15',
      strokeColor: '#000000',
      strokeWidth: 10,
      rotation: 0,
      hasBackground: false,
      backgroundColor: '#000000',
      backgroundPadding: 8,
    },
    {
      id: 'txt-2',
      text: 'Ce que personne ne vous dit',
      x: 12,
      y: 62,
      fontSize: 36,
      fontFamily: 'sans',
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 6,
      rotation: 0,
      hasBackground: true,
      backgroundColor: 'rgba(0,0,0,0.85)',
      backgroundPadding: 6,
    },
  ]);

  const [imageLayers, setImageLayers] = useState<ImageLayer[]>([
    {
      id: 'stk-1',
      src: 'badge:NOUVEAU',
      label: 'Badge NOUVEAU',
      x: 10,
      y: 14,
      width: 170,
      rotation: -3,
      opacity: 1,
      isSticker: true,
    },
    {
      id: 'stk-2',
      src: 'sticker:arrow-red',
      label: 'Flèche YouTube Rouge',
      x: 84,
      y: 40,
      width: 130,
      rotation: 12,
      opacity: 1,
      isSticker: true,
    },
  ]);

  const [maskLayers, setMaskLayers] = useState<MaskBoxLayer[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const canvasPreviewRef = useRef<HTMLDivElement>(null);

  // Extract Video ID
  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.trim().match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const currentVideoId = extractVideoId(videoUrl);

  const qualities: ThumbnailQuality[] = [
    { label: 'Maxi Résolution HD', res: '1280 x 720', filename: 'maxresdefault.jpg', badge: '1080p / 720p HD' },
    { label: 'Haute Qualité', res: '640 x 480', filename: 'sddefault.jpg', badge: 'SD' },
    { label: 'Moyenne Qualité', res: '480 x 360', filename: 'hqdefault.jpg', badge: 'HQ' },
    { label: 'Standard', res: '320 x 180', filename: 'mqdefault.jpg', badge: 'Standard' },
  ];

  const getThumbnailUrl = (id: string, filename: string) => {
    return `https://img.youtube.com/vi/${id}/${filename}`;
  };

  // Switch from Extractor directly into the Editor
  const handleEditThumbnail = async (filename: string) => {
    if (!currentVideoId) return;
    const src = getThumbnailUrl(currentVideoId, filename);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setBgImage(dataUrl);
      } else {
        setBgImage(src);
      }
    } catch {
      setBgImage(src);
    }

    setBgType('image');
    setActiveTab('editor');
    setNotificationMsg('✨ Thumbnail chargé dans l’éditeur ! Vous pouvez maintenant modifier ou ajouter du texte, des images et des stickers.');
    setTimeout(() => setNotificationMsg(null), 6000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Download Single from extractor
  const handleDownloadSingle = async (filename: string, format: 'jpg' | 'png' | 'webp' = 'jpg') => {
    if (!currentVideoId) return;
    const src = getThumbnailUrl(currentVideoId, filename);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `yt_thumbnail_${currentVideoId}_${filename.replace('.jpg', '')}.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);

          addRecentFile({
            name: `yt_thumbnail_${currentVideoId}.${format}`,
            toolName: 'Miniature YouTube',
            toolId: 'yt-thumbnail-extractor',
            size: blob.size,
            pageCount: 1,
          });
        }, mime, 0.95);
      }
    } catch {
      window.open(src, '_blank');
    }
  };

  // Copy thumbnail
  const handleCopyImage = async (filename: string) => {
    if (!currentVideoId) return;
    const src = getThumbnailUrl(currentVideoId, filename);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setCopiedUrl(filename);
            setTimeout(() => setCopiedUrl(null), 2500);
          }
        }, 'image/png');
      }
    } catch {
      await navigator.clipboard.writeText(src);
      setCopiedUrl(filename);
      setTimeout(() => setCopiedUrl(null), 2500);
    }
  };

  // Batch download ZIP
  const handleBatchDownloadZip = async () => {
    const urls = batchUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length === 0) return;

    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('miniatures_youtube');

      for (let i = 0; i < urls.length; i++) {
        const id = extractVideoId(urls[i]);
        if (!id) continue;
        const src = getThumbnailUrl(id, 'maxresdefault.jpg');
        try {
          const res = await fetch(src);
          if (res.ok) {
            const blob = await res.blob();
            folder?.file(`miniature_${id}_maxres.jpg`, blob);
          } else {
            const fallback = await fetch(getThumbnailUrl(id, 'hqdefault.jpg'));
            const blob = await fallback.blob();
            folder?.file(`miniature_${id}_hq.jpg`, blob);
          }
        } catch (e) {
          console.warn('Erreur sur URL:', urls[i], e);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `miniatures_youtube_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);

      addRecentFile({
        name: `miniatures_youtube_${Date.now()}.zip`,
        toolName: 'Extraction ZIP Miniatures',
        toolId: 'yt-thumbnail-extractor',
        size: content.size,
        pageCount: urls.length,
      });
    } catch (err) {
      console.error('Erreur zip:', err);
      alert('Erreur lors de la création de l’archive ZIP.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // --- ACTIONS SUR LES TEXTES ---
  const handleAddText = () => {
    const newId = `txt-${Date.now()}`;
    const newText: TextLayer = {
      id: newId,
      text: 'NOUVEAU TITRE',
      x: 20 + Math.random() * 20,
      y: 35 + Math.random() * 20,
      fontSize: 54,
      fontFamily: 'impact',
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 8,
      rotation: 0,
      hasBackground: false,
      backgroundColor: '#000000',
      backgroundPadding: 8,
    };
    setTextLayers((prev) => [...prev, newText]);
    setSelectedLayerId(newId);
    setSelectedLayerType('text');
  };

  const handleDuplicateText = (layer: TextLayer) => {
    const newId = `txt-${Date.now()}`;
    setTextLayers((prev) => [
      ...prev,
      {
        ...layer,
        id: newId,
        x: Math.min(layer.x + 5, 90),
        y: Math.min(layer.y + 5, 90),
      },
    ]);
    setSelectedLayerId(newId);
  };

  const updateTextLayer = (id: string, updates: Partial<TextLayer>) => {
    setTextLayers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTextLayer = (id: string) => {
    setTextLayers((prev) => prev.filter((t) => t.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  // --- ACTIONS SUR LES IMAGES ET STICKERS ---
  const handleUploadImageLayer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newId = `img-${Date.now()}`;
      const newLayer: ImageLayer = {
        id: newId,
        src: reader.result as string,
        label: file.name,
        x: 50,
        y: 50,
        width: 260,
        rotation: 0,
        opacity: 1,
        isSticker: false,
      };
      setImageLayers((prev) => [...prev, newLayer]);
      setSelectedLayerId(newId);
      setSelectedLayerType('image');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUploadBgImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBgImage(reader.result as string);
      setBgType('image');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddPresetSticker = (
    type: 'arrow-red' | 'flame' | 'badge-new' | 'badge-choc' | 'badge-top1' | 'star' | 'badge-vs' | 'badge-dollar'
  ) => {
    const newId = `stk-${Date.now()}`;
    let label = 'Sticker';
    let src = '';

    if (type === 'arrow-red') {
      label = 'Flèche Rouge';
      src = 'sticker:arrow-red';
    } else if (type === 'flame') {
      label = 'Flamme Gaming';
      src = 'sticker:flame';
    } else if (type === 'badge-new') {
      label = 'Badge NOUVEAU';
      src = 'badge:NOUVEAU';
    } else if (type === 'badge-choc') {
      label = 'Badge CHOC !';
      src = 'badge:CHOC !';
    } else if (type === 'badge-top1') {
      label = 'Badge TOP 1';
      src = 'badge:TOP 1';
    } else if (type === 'badge-vs') {
      label = 'Badge VS';
      src = 'badge:VS';
    } else if (type === 'badge-dollar') {
      label = 'Badge 10 000 $';
      src = 'badge:10 000 $';
    } else if (type === 'star') {
      label = 'Étoile Dorée';
      src = 'sticker:star';
    }

    const newSticker: ImageLayer = {
      id: newId,
      src,
      label,
      x: 35 + Math.random() * 20,
      y: 35 + Math.random() * 20,
      width: 160,
      rotation: 0,
      opacity: 1,
      isSticker: true,
    };
    setImageLayers((prev) => [...prev, newSticker]);
    setSelectedLayerId(newId);
    setSelectedLayerType('image');
  };

  const updateImageLayer = (id: string, updates: Partial<ImageLayer>) => {
    setImageLayers((prev) => prev.map((im) => (im.id === id ? { ...im, ...updates } : im)));
  };

  const deleteImageLayer = (id: string) => {
    setImageLayers((prev) => prev.filter((im) => im.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  // --- ACTIONS SUR LES MASQUES (CACHE POUR EFFACER LE TEXTE DU THUMBNAIL ORIGINAL) ---
  const handleAddMaskLayer = () => {
    const newId = `mask-${Date.now()}`;
    const newMask: MaskBoxLayer = {
      id: newId,
      x: 10,
      y: 40,
      width: 45,
      height: 18,
      color: '#000000',
      borderRadius: 12,
      opacity: 0.95,
    };
    setMaskLayers((prev) => [...prev, newMask]);
    setSelectedLayerId(newId);
    setSelectedLayerType('mask');
  };

  const updateMaskLayer = (id: string, updates: Partial<MaskBoxLayer>) => {
    setMaskLayers((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const deleteMaskLayer = (id: string) => {
    setMaskLayers((prev) => prev.filter((m) => m.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  // Find currently selected element
  const currentTextLayer = textLayers.find((t) => t.id === selectedLayerId);
  const currentImageLayer = imageLayers.find((im) => im.id === selectedLayerId);
  const currentMaskLayer = maskLayers.find((m) => m.id === selectedLayerId);

  // --- DRAG AND DROP ON CANVAS INTERACTION ---
  const handleStartDrag = (
    e: React.PointerEvent,
    id: string,
    type: 'text' | 'image' | 'mask',
    initialX: number,
    initialY: number
  ) => {
    e.stopPropagation();
    setSelectedLayerId(id);
    setSelectedLayerType(type);
    setIsDragging(true);
    setDragStartPos({
      mouseX: e.clientX,
      mouseY: e.clientY,
      elemX: initialX,
      elemY: initialY,
    });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartPos || !selectedLayerId || !canvasPreviewRef.current) return;

    const rect = canvasPreviewRef.current.getBoundingClientRect();
    const deltaXPercent = ((e.clientX - dragStartPos.mouseX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStartPos.mouseY) / rect.height) * 100;

    const newX = Math.round(Math.max(0, Math.min(100, dragStartPos.elemX + deltaXPercent)));
    const newY = Math.round(Math.max(0, Math.min(100, dragStartPos.elemY + deltaYPercent)));

    if (selectedLayerType === 'text') {
      updateTextLayer(selectedLayerId, { x: newX, y: newY });
    } else if (selectedLayerType === 'image') {
      updateImageLayer(selectedLayerId, { x: newX, y: newY });
    } else if (selectedLayerType === 'mask') {
      updateMaskLayer(selectedLayerId, { x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartPos(null);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  // Preset Template Styles for Quick Action
  const applyTextPresetStyle = (style: 'choc-yellow' | 'red-white' | 'neon-cyan' | 'black-badge') => {
    if (!currentTextLayer) return;
    if (style === 'choc-yellow') {
      updateTextLayer(currentTextLayer.id, {
        color: '#FACC15',
        strokeColor: '#000000',
        strokeWidth: 10,
        fontFamily: 'impact',
        hasBackground: false,
      });
    } else if (style === 'red-white') {
      updateTextLayer(currentTextLayer.id, {
        color: '#FFFFFF',
        strokeColor: '#DC2626',
        strokeWidth: 8,
        fontFamily: 'sans',
        hasBackground: true,
        backgroundColor: '#DC2626',
      });
    } else if (style === 'neon-cyan') {
      updateTextLayer(currentTextLayer.id, {
        color: '#22D3EE',
        strokeColor: '#083344',
        strokeWidth: 6,
        fontFamily: 'bangers',
        hasBackground: false,
      });
    } else if (style === 'black-badge') {
      updateTextLayer(currentTextLayer.id, {
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 4,
        fontFamily: 'montserrat',
        hasBackground: true,
        backgroundColor: '#000000',
      });
    }
  };

  // Draw Sticker helper for canvas export
  const drawStickerOnCanvas = (
    ctx: CanvasRenderingContext2D,
    layer: ImageLayer,
    canvasW: number,
    canvasH: number
  ) => {
    const posX = (layer.x / 100) * canvasW;
    const posY = (layer.y / 100) * canvasH;
    ctx.save();
    ctx.translate(posX, posY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.globalAlpha = layer.opacity;

    if (layer.src.startsWith('badge:')) {
      const text = layer.src.replace('badge:', '');
      const width = Math.max(layer.width, text.length * 28 + 48);
      const height = 70;
      ctx.fillStyle = text.includes('CHOC') ? '#DC2626' : text.includes('TOP 1') ? '#EAB308' : '#EF4444';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.roundRect(-width / 2, -height / 2, width, height, 16);
      ctx.fill();
      ctx.fillStyle = text.includes('TOP 1') ? '#000000' : '#FFFFFF';
      ctx.font = '900 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 2);
    } else if (layer.src === 'sticker:arrow-red') {
      ctx.fillStyle = '#E11D48';
      ctx.beginPath();
      ctx.moveTo(-60, -25);
      ctx.lineTo(20, -25);
      ctx.lineTo(20, -55);
      ctx.lineTo(80, 0);
      ctx.lineTo(20, 55);
      ctx.lineTo(20, 25);
      ctx.lineTo(-60, 25);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    } else if (layer.src === 'sticker:flame') {
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.arc(0, 0, layer.width / 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (layer.src === 'sticker:star') {
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(0, 0, layer.width / 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Full 1280x720 HD Canvas Export
  const handleExportEditorCanvas = async (format: 'png' | 'jpg' | 'webp' = 'png') => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Filters on background
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    // 1. Draw Background
    if (bgType === 'image' && bgImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = bgImage;
      if (!img.complete) {
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }
      ctx.drawImage(img, 0, 0, 1280, 720);
    } else if (bgType === 'color') {
      ctx.fillStyle = customBgColor;
      ctx.fillRect(0, 0, 1280, 720);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      if (gradientPreset === 'fire') {
        grad.addColorStop(0, '#be123c');
        grad.addColorStop(0.5, '#ea580c');
        grad.addColorStop(1, '#facc15');
      } else if (gradientPreset === 'cyber') {
        grad.addColorStop(0, '#4338ca');
        grad.addColorStop(0.5, '#7c3aed');
        grad.addColorStop(1, '#ec4899');
      } else if (gradientPreset === 'dark') {
        grad.addColorStop(0, '#020617');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#1e293b');
      } else {
        grad.addColorStop(0, '#047857');
        grad.addColorStop(1, '#065f46');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);
    }

    ctx.filter = 'none';

    // 2. Draw Masking Boxes (Eraser Boxes)
    for (const mask of maskLayers) {
      const px = (mask.x / 100) * 1280;
      const py = (mask.y / 100) * 720;
      const pw = (mask.width / 100) * 1280;
      const ph = (mask.height / 100) * 720;

      ctx.save();
      ctx.globalAlpha = mask.opacity;
      ctx.fillStyle = mask.color;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, mask.borderRadius);
      ctx.fill();
      ctx.restore();
    }

    // 3. Draw Image Layers & Stickers
    for (const layer of imageLayers) {
      if (layer.isSticker) {
        drawStickerOnCanvas(ctx, layer, 1280, 720);
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = layer.src;
        if (!img.complete) {
          await new Promise((r) => {
            img.onload = r;
            img.onerror = r;
          });
        }
        const posX = (layer.x / 100) * 1280;
        const posY = (layer.y / 100) * 720;
        const h = (img.height / img.width) * layer.width;

        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.globalAlpha = layer.opacity;
        ctx.drawImage(img, -layer.width / 2, -h / 2, layer.width, h);
        ctx.restore();
      }
    }

    // 4. Draw Text Layers
    for (const layer of textLayers) {
      if (!layer.text.trim()) continue;
      const posX = (layer.x / 100) * 1280;
      const posY = (layer.y / 100) * 720;

      ctx.save();
      ctx.translate(posX, posY);
      ctx.rotate((layer.rotation * Math.PI) / 180);

      const fontFam =
        layer.fontFamily === 'impact'
          ? 'Impact, Arial Black, sans-serif'
          : layer.fontFamily === 'bangers'
          ? 'Impact, sans-serif'
          : layer.fontFamily === 'montserrat'
          ? 'Montserrat, sans-serif'
          : layer.fontFamily === 'serif'
          ? 'Georgia, serif'
          : layer.fontFamily === 'mono'
          ? 'monospace'
          : 'sans-serif';

      ctx.font = `900 ${layer.fontSize}px ${fontFam}`;

      // Background highlight pill
      if (layer.hasBackground) {
        const metrics = ctx.measureText(layer.text);
        const pad = layer.backgroundPadding || 8;
        ctx.fillStyle = layer.backgroundColor || '#000000';
        ctx.beginPath();
        ctx.roundRect(-pad, -layer.fontSize * 0.9 - pad / 2, metrics.width + pad * 2, layer.fontSize + pad * 2, 8);
        ctx.fill();
      }

      ctx.fillStyle = layer.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;

      if (layer.strokeWidth > 0) {
        ctx.lineWidth = layer.strokeWidth;
        ctx.strokeStyle = layer.strokeColor;
        ctx.strokeText(layer.text, 0, 0);
      }
      ctx.fillText(layer.text, 0, 0);
      ctx.restore();
    }

    // YouTube timestamp safe zone (12:45)
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.roundRect(1140, 655, 110, 45, 6);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('12:45', 1158, 687);
    ctx.restore();

    const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `miniature_youtube_hd_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);

      addRecentFile({
        name: `miniature_youtube_${Date.now()}.${format}`,
        toolName: 'Studio Miniature YouTube',
        toolId: 'yt-thumbnail-editor',
        size: blob.size,
        pageCount: 1,
      });
    }, mime, 0.95);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 shadow-2xs">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Studio Miniatures YouTube
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-300 px-2 py-0.5 rounded-full">
                  1280x720 HD · Calques Illimités
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Extrayez en pleine définition 4K/HD ou modifiez directement n’importe quel texte, image, sticker et masque.
              </p>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('extractor')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'extractor'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-red-600" />
              <span>Extracteur 1-Clic</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Éditeur Multicalques</span>
            </button>
          </div>
        </div>
      </div>

      {notificationMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-between gap-3 text-xs font-semibold text-red-900 dark:text-red-200">
          <span>{notificationMsg}</span>
          <button
            type="button"
            onClick={() => setNotificationMsg(null)}
            className="text-xs text-red-700 underline cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {activeTab === 'extractor' ? (
        /* --- TAB 1 : EXTRACTEUR DE MINIATURES --- */
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isBatchMode ? 'Liste des URLs YouTube (une par ligne)' : 'Lien de la vidéo YouTube'}
              </label>
              <button
                type="button"
                onClick={() => setIsBatchMode(!isBatchMode)}
                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
              >
                {isBatchMode ? 'Basculer en mode URL unique' : 'Extraire en masse (Plusieurs URLs)'}
              </button>
            </div>

            {!isBatchMode ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                  className="flex-1 text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 dark:text-slate-100 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Exemple
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={batchUrls}
                  onChange={(e) => setBatchUrls(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ&#10;https://youtu.be/kJQP7kiw5Fk"
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 dark:text-slate-100 font-mono"
                />
                <button
                  type="button"
                  disabled={isDownloadingZip || !batchUrls.trim()}
                  onClick={handleBatchDownloadZip}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isDownloadingZip ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FolderArchive className="w-4 h-4" />}
                  <span>{isDownloadingZip ? 'Téléchargement...' : 'Télécharger toutes les miniatures en ZIP'}</span>
                </button>
              </div>
            )}
          </div>

          {currentVideoId && !isBatchMode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Miniatures extraites pour l’ID :</span>
                  <span className="font-mono text-red-600 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-md">
                    {currentVideoId}
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {qualities.map((q) => {
                  const url = getThumbnailUrl(currentVideoId, q.filename);
                  return (
                    <div
                      key={q.filename}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:border-red-300 transition-all group"
                    >
                      <div className="relative aspect-video bg-slate-100 dark:bg-slate-950 overflow-hidden">
                        <img
                          src={url}
                          alt={q.label}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold rounded-md">
                          {q.res}
                        </div>
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-md">
                          {q.badge}
                        </div>

                        {/* Hover Quick Edit Button */}
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                          <button
                            type="button"
                            onClick={() => handleEditThumbnail(q.filename)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-lg transition-transform transform hover:scale-105 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-yellow-300" />
                            <span>Modifier directement ce thumbnail</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{q.label}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{q.filename} · {q.res}</div>
                          </div>
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded text-[10px] font-bold">
                            {q.badge}
                          </span>
                        </div>

                        {/* BOUTON MODIFIER DIRECTEMENT CE THUMBNAIL */}
                        <button
                          type="button"
                          onClick={() => handleEditThumbnail(q.filename)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-[0.98] rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-yellow-300" />
                          <span>Modifier directement ce thumbnail dans le Studio</span>
                        </button>

                        {/* Téléchargements & Copie */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleCopyImage(q.filename)}
                            className="inline-flex items-center justify-center gap-1 py-1.5 px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Copier l'image"
                          >
                            {copiedUrl === q.filename ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">Copier</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSingle(q.filename, 'jpg')}
                            className="inline-flex items-center justify-center gap-1 py-1.5 px-2 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>JPG</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSingle(q.filename, 'png')}
                            className="inline-flex items-center justify-center py-1.5 px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            PNG
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSingle(q.filename, 'webp')}
                            className="inline-flex items-center justify-center py-1.5 px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            WebP
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* --- TAB 2 : CRÉATEUR & ÉDITEUR MULTICALQUES --- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Side Panel (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Quick Add Actions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Ajouter des éléments sur le Thumbnail :
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleAddText}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-red-600" />
                  <span>+ Texte</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>+ Image</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImageLayer}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={handleAddMaskLayer}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  title="Permet de cacher du texte ou un visage présent sur le thumbnail d'origine"
                >
                  <Square className="w-3.5 h-3.5 text-purple-600" />
                  <span>+ Masque</span>
                </button>
              </div>

              {/* Preset Stickers */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  Stickers YouTube populaires :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'arrow-red', label: '➡️ Flèche' },
                    { id: 'badge-new', label: '🏷️ NOUVEAU' },
                    { id: 'badge-choc', label: '🚨 CHOC !' },
                    { id: 'badge-top1', label: '👑 TOP 1' },
                    { id: 'flame', label: '🔥 Flamme' },
                    { id: 'star', label: '⭐ Étoile' },
                    { id: 'badge-vs', label: '⚔️ VS' },
                    { id: 'badge-dollar', label: '💰 10K $' },
                  ].map((stk) => (
                    <button
                      key={stk.id}
                      type="button"
                      onClick={() => handleAddPresetSticker(stk.id as any)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      {stk.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List of Layers */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-red-600" />
                  <span>Calques ({textLayers.length + imageLayers.length + maskLayers.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTextLayers([]);
                    setImageLayers([]);
                    setMaskLayers([]);
                    setSelectedLayerId(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  Tout effacer
                </button>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                {/* Background layer item */}
                <div
                  onClick={() => {
                    setSelectedLayerId('bg');
                    setSelectedLayerType('bg');
                  }}
                  className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                    selectedLayerId === 'bg'
                      ? 'bg-red-50 dark:bg-red-950/60 text-red-700 border border-red-300'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Fond ({bgType === 'image' ? 'Image Originale' : 'Dégradé / Couleur'})</span>
                  </span>
                </div>

                {/* Text Layers */}
                {textLayers.map((tl) => (
                  <div
                    key={tl.id}
                    onClick={() => {
                      setSelectedLayerId(tl.id);
                      setSelectedLayerType('text');
                    }}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                      selectedLayerId === tl.id
                        ? 'bg-red-50 dark:bg-red-950/60 text-red-700 border border-red-300'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                      <Type className="w-3.5 h-3.5 text-amber-500" />
                      <span className="truncate">{tl.text || '(Texte vide)'}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateText(tl);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Dupliquer"
                      >
                        <CopyPlus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTextLayer(tl.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Image Layers */}
                {imageLayers.map((il) => (
                  <div
                    key={il.id}
                    onClick={() => {
                      setSelectedLayerId(il.id);
                      setSelectedLayerType('image');
                    }}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                      selectedLayerId === il.id
                        ? 'bg-red-50 dark:bg-red-950/60 text-red-700 border border-red-300'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                      <span className="truncate">{il.label}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteImageLayer(il.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Mask Layers */}
                {maskLayers.map((ml) => (
                  <div
                    key={ml.id}
                    onClick={() => {
                      setSelectedLayerId(ml.id);
                      setSelectedLayerType('mask');
                    }}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                      selectedLayerId === ml.id
                        ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 border border-purple-300'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                      <Square className="w-3.5 h-3.5 text-purple-500" />
                      <span>Rectangle Masque (Cache)</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMaskLayer(ml.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Properties Editor for Selected Text */}
            {selectedLayerType === 'text' && currentTextLayer && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-red-600" />
                    <span>Modifier le Texte Sélectionné</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDuplicateText(currentTextLayer)}
                      className="text-xs text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
                    >
                      Dupliquer
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTextLayer(currentTextLayer.id)}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Styles YouTube rapides :
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyTextPresetStyle('choc-yellow')}
                      className="px-2 py-0.5 text-[10px] font-bold bg-yellow-400 text-black rounded border border-black cursor-pointer"
                    >
                      Choc Jaune
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextPresetStyle('red-white')}
                      className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded cursor-pointer"
                    >
                      Rouge / Blanc
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextPresetStyle('neon-cyan')}
                      className="px-2 py-0.5 text-[10px] font-bold bg-cyan-400 text-slate-900 rounded cursor-pointer"
                    >
                      Néon Cyan
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextPresetStyle('black-badge')}
                      className="px-2 py-0.5 text-[10px] font-bold bg-black text-white rounded cursor-pointer"
                    >
                      Bandeau Noir
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Contenu du texte (glissez directement sur le visuel pour déplacer)
                    </label>
                    <input
                      type="text"
                      value={currentTextLayer.text}
                      onChange={(e) => updateTextLayer(currentTextLayer.id, { text: e.target.value })}
                      className="w-full text-sm p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Police
                      </label>
                      <select
                        value={currentTextLayer.fontFamily}
                        onChange={(e) => updateTextLayer(currentTextLayer.id, { fontFamily: e.target.value as any })}
                        className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      >
                        <option value="impact">Impact (Standard YouTube)</option>
                        <option value="bangers">Gamer / Choc</option>
                        <option value="sans">Sans-serif Bold</option>
                        <option value="montserrat">Montserrat Pro</option>
                        <option value="serif">Serif Élégant</option>
                        <option value="mono">Monospace Code</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        <span>Taille ({currentTextLayer.fontSize}px)</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="140"
                        value={currentTextLayer.fontSize}
                        onChange={(e) => updateTextLayer(currentTextLayer.id, { fontSize: Number(e.target.value) })}
                        className="w-full accent-red-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Couleur texte
                      </label>
                      <input
                        type="color"
                        value={currentTextLayer.color}
                        onChange={(e) => updateTextLayer(currentTextLayer.id, { color: e.target.value })}
                        className="w-full h-8 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Contour ({currentTextLayer.strokeWidth}px)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={currentTextLayer.strokeColor}
                          onChange={(e) => updateTextLayer(currentTextLayer.id, { strokeColor: e.target.value })}
                          className="w-10 h-8 rounded-lg cursor-pointer shrink-0"
                        />
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={currentTextLayer.strokeWidth}
                          onChange={(e) => updateTextLayer(currentTextLayer.id, { strokeWidth: Number(e.target.value) })}
                          className="flex-1 accent-red-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Background Pill highlight */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={currentTextLayer.hasBackground || false}
                        onChange={(e) => updateTextLayer(currentTextLayer.id, { hasBackground: e.target.checked })}
                        className="rounded text-red-600"
                      />
                      <span>Ajouter un fond surligné / bandeau derrière ce texte</span>
                    </label>
                    {currentTextLayer.hasBackground && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="color"
                          value={currentTextLayer.backgroundColor || '#000000'}
                          onChange={(e) => updateTextLayer(currentTextLayer.id, { backgroundColor: e.target.value })}
                          className="w-10 h-8 rounded-lg cursor-pointer"
                        />
                        <span className="text-xs text-slate-500">Couleur du bandeau de fond</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Properties Editor for Selected Image / Sticker */}
            {selectedLayerType === 'image' && currentImageLayer && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span>Modifier l’Élément Graphique</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => deleteImageLayer(currentImageLayer.id)}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Supprimer
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Largeur ({currentImageLayer.width}px)</span>
                    <input
                      type="range"
                      min="50"
                      max="600"
                      value={currentImageLayer.width}
                      onChange={(e) => updateImageLayer(currentImageLayer.id, { width: Number(e.target.value) })}
                      className="w-36 accent-blue-600"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Rotation ({currentImageLayer.rotation}°)</span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={currentImageLayer.rotation}
                      onChange={(e) => updateImageLayer(currentImageLayer.id, { rotation: Number(e.target.value) })}
                      className="w-36 accent-blue-600"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Opacité ({Math.round(currentImageLayer.opacity * 100)}%)</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={currentImageLayer.opacity}
                      onChange={(e) => updateImageLayer(currentImageLayer.id, { opacity: Number(e.target.value) })}
                      className="w-36 accent-blue-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Properties Editor for Selected Mask Box */}
            {selectedLayerType === 'mask' && currentMaskLayer && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Square className="w-4 h-4 text-purple-600" />
                    <span>Rectangle de Masquage (Effaceur)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => deleteMaskLayer(currentMaskLayer.id)}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Supprimer
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Déplacez et ajustez ce rectangle pour masquer ou effacer un texte présent sur le thumbnail de départ.
                </p>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Couleur du cache
                      </label>
                      <input
                        type="color"
                        value={currentMaskLayer.color}
                        onChange={(e) => updateMaskLayer(currentMaskLayer.id, { color: e.target.value })}
                        className="w-full h-8 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Arrondi ({currentMaskLayer.borderRadius}px)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="32"
                        value={currentMaskLayer.borderRadius}
                        onChange={(e) => updateMaskLayer(currentMaskLayer.id, { borderRadius: Number(e.target.value) })}
                        className="w-full accent-purple-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Largeur ({currentMaskLayer.width}%)</span>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={currentMaskLayer.width}
                      onChange={(e) => updateMaskLayer(currentMaskLayer.id, { width: Number(e.target.value) })}
                      className="w-36 accent-purple-600"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Hauteur ({currentMaskLayer.height}%)</span>
                    <input
                      type="range"
                      min="3"
                      max="60"
                      value={currentMaskLayer.height}
                      onChange={(e) => updateMaskLayer(currentMaskLayer.id, { height: Number(e.target.value) })}
                      className="w-36 accent-purple-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Background & Lighting Settings */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-red-600" />
                  <span>Image de Fond & Réglages</span>
                </h3>
                <button
                  type="button"
                  onClick={() => bgFileInputRef.current?.click()}
                  className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                >
                  Remplacer fond
                </button>
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadBgImage}
                  className="hidden"
                />
              </div>

              {bgImage && (
                <div
                  onClick={() => setBgType('image')}
                  className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    bgType === 'image'
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/60 ring-2 ring-red-400/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <img src={bgImage} alt="Thumbnail fond" className="w-14 h-9 object-cover rounded-lg shrink-0 shadow-2xs" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      Image Miniature Active
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {bgType === 'image' ? '✓ Actuellement utilisée comme fond' : 'Cliquer pour réactiver'}
                    </div>
                  </div>
                  {bgType === 'image' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-red-600 text-white rounded">
                      Actif
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'fire', label: 'Feu Gamer' },
                  { id: 'cyber', label: 'Cyber Violet' },
                  { id: 'dark', label: 'Sombre Pro' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setBgType('gradient');
                      setGradientPreset(p.id);
                    }}
                    className={`p-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      gradientPreset === p.id && bgType === 'gradient'
                        ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                        : 'border-slate-200 dark:border-slate-750 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Contraste ({contrast}%)</span>
                  <input
                    type="range"
                    min="80"
                    max="160"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-32 accent-red-600"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Saturation ({saturation}%)</span>
                  <input
                    type="range"
                    min="80"
                    max="180"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-32 accent-red-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Live Canvas (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-red-600" />
                  <span>Aperçu Interactif (Glissez pour déplacer n’importe quel élément)</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">1280x720 (16:9)</div>
              </div>

              {/* Main Interactive Canvas Surface */}
              <div
                ref={canvasPreviewRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative aspect-video rounded-xl overflow-hidden shadow-lg border-2 border-slate-300 dark:border-slate-700 select-none touch-none cursor-default"
                style={{
                  background:
                    bgType === 'image'
                      ? '#000000'
                      : gradientPreset === 'fire'
                      ? 'linear-gradient(135deg, #be123c 0%, #ea580c 50%, #facc15 100%)'
                      : gradientPreset === 'cyber'
                      ? 'linear-gradient(135deg, #4338ca 0%, #7c3aed 50%, #ec4899 100%)'
                      : 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)',
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                }}
              >
                {/* Image Background */}
                {bgType === 'image' && bgImage && (
                  <img
                    src={bgImage}
                    alt="Fond miniature"
                    className="absolute inset-0 w-full h-full object-cover -z-0 pointer-events-none"
                  />
                )}

                {/* Render Masking Boxes */}
                {maskLayers.map((mask) => {
                  const isSelected = selectedLayerId === mask.id;
                  return (
                    <div
                      key={mask.id}
                      onPointerDown={(e) => handleStartDrag(e, mask.id, 'mask', mask.x, mask.y)}
                      className={`absolute cursor-move transition-shadow ${
                        isSelected ? 'ring-2 ring-purple-500 shadow-md' : ''
                      }`}
                      style={{
                        left: `${mask.x}%`,
                        top: `${mask.y}%`,
                        width: `${mask.width}%`,
                        height: `${mask.height}%`,
                        backgroundColor: mask.color,
                        borderRadius: `${mask.borderRadius}px`,
                        opacity: mask.opacity,
                      }}
                    />
                  );
                })}

                {/* Render Image & Sticker Layers */}
                {imageLayers.map((layer) => {
                  const isSelected = selectedLayerId === layer.id;
                  return (
                    <div
                      key={layer.id}
                      onPointerDown={(e) => handleStartDrag(e, layer.id, 'image', layer.x, layer.y)}
                      className={`absolute cursor-move transition-all ${
                        isSelected ? 'ring-2 ring-blue-500 rounded-lg p-0.5 shadow-md' : ''
                      }`}
                      style={{
                        left: `${layer.x}%`,
                        top: `${layer.y}%`,
                        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                        width: `${(layer.width / 1280) * 100}%`,
                        opacity: layer.opacity,
                      }}
                    >
                      {layer.src.startsWith('badge:') ? (
                        <div className="px-3 py-1 bg-red-600 text-white font-black text-xs sm:text-sm rounded-lg shadow-lg text-center uppercase tracking-wider">
                          {layer.src.replace('badge:', '')}
                        </div>
                      ) : layer.src === 'sticker:arrow-red' ? (
                        <div className="text-red-500 drop-shadow-md">
                          <Flame className="w-12 h-12 fill-red-500 text-white" />
                        </div>
                      ) : layer.src === 'sticker:flame' ? (
                        <div className="text-orange-500 drop-shadow-md">
                          <Flame className="w-12 h-12 fill-orange-500 text-white" />
                        </div>
                      ) : layer.src === 'sticker:star' ? (
                        <div className="text-yellow-400 drop-shadow-md">
                          <Star className="w-12 h-12 fill-yellow-400 text-white" />
                        </div>
                      ) : (
                        <img src={layer.src} alt={layer.label} className="w-full h-auto object-contain rounded" />
                      )}
                    </div>
                  );
                })}

                {/* Render Text Layers */}
                {textLayers.map((layer) => {
                  if (!layer.text.trim()) return null;
                  const isSelected = selectedLayerId === layer.id;
                  return (
                    <div
                      key={layer.id}
                      onPointerDown={(e) => handleStartDrag(e, layer.id, 'text', layer.x, layer.y)}
                      onDoubleClick={() => setInlineEditingTextId(layer.id)}
                      className={`absolute cursor-move transition-all group ${
                        isSelected ? 'ring-2 ring-yellow-400 rounded-lg p-1 bg-black/25 shadow-lg' : ''
                      }`}
                      style={{
                        left: `${layer.x}%`,
                        top: `${layer.y}%`,
                        transform: `rotate(${layer.rotation}deg)`,
                        color: layer.color,
                        WebkitTextStroke: layer.strokeWidth > 0 ? `${layer.strokeWidth / 4}px ${layer.strokeColor}` : 'none',
                        fontFamily:
                          layer.fontFamily === 'impact'
                            ? 'Impact, Arial Black, sans-serif'
                            : layer.fontFamily === 'bangers'
                            ? 'Impact, sans-serif'
                            : layer.fontFamily === 'montserrat'
                            ? 'Montserrat, sans-serif'
                            : layer.fontFamily === 'serif'
                            ? 'Georgia, serif'
                            : layer.fontFamily === 'mono'
                            ? 'monospace'
                            : 'sans-serif',
                        fontSize: `clamp(14px, ${(layer.fontSize / 720) * 100}cqw, ${(layer.fontSize / 720) * 100}cqh)`,
                        fontWeight: 900,
                        textShadow: '0 4px 10px rgba(0,0,0,0.85)',
                      }}
                    >
                      {layer.hasBackground ? (
                        <span
                          style={{
                            backgroundColor: layer.backgroundColor || '#000000',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          {layer.text}
                        </span>
                      ) : (
                        layer.text
                      )}
                    </div>
                  );
                })}

                {/* YouTube Safe Area Timestamp badge in bottom right (12:45) */}
                <div className="absolute bottom-2.5 right-2.5 bg-black/85 px-2 py-0.5 rounded text-[11px] font-mono text-white pointer-events-none shadow-sm">
                  12:45
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleExportEditorCanvas('png')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Exporter PNG Haute Définition (1280x720 HD)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportEditorCanvas('jpg')}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  JPG
                </button>
                <button
                  type="button"
                  onClick={() => handleExportEditorCanvas('webp')}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  WebP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
