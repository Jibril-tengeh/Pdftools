import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ToolGrid } from './components/ToolGrid';
import { MergeTool } from './components/tools/MergeTool';
import { SplitTool } from './components/tools/SplitTool';
import { OrganizeTool } from './components/tools/OrganizeTool';
import { CropTool } from './components/tools/CropTool';
import { ImagesToPdfTool } from './components/tools/ImagesToPdfTool';
import { PdfToImagesTool } from './components/tools/PdfToImagesTool';
import { PageNumbersTool } from './components/tools/PageNumbersTool';
import { CompressPdfTool } from './components/tools/CompressPdfTool';
import { WatermarkTool } from './components/tools/WatermarkTool';
import { SignTool } from './components/tools/SignTool';
import { MetadataTool } from './components/tools/MetadataTool';
import { ProtectTool } from './components/tools/ProtectTool';
import { ViewerTool } from './components/tools/ViewerTool';
import { AiTool } from './components/tools/AiTool';

// Image tools
import { ImageConvertTool } from './components/tools/ImageConvertTool';
import { ImageFilterTool } from './components/tools/ImageFilterTool';
import { QrTool } from './components/tools/QrTool';

// Video tools
import { VideoTrimTool } from './components/tools/VideoTrimTool';
import { VideoToAudioTool } from './components/tools/VideoToAudioTool';
import { VideoSnapshotTool } from './components/tools/VideoSnapshotTool';

// New Advanced Tools
import { PdfCreatorTool } from './components/tools/PdfCreatorTool';
import { YouTubeThumbnailTool } from './components/tools/YouTubeThumbnailTool';
import { UniversalConverterTool } from './components/tools/UniversalConverterTool';
import { BatchRenamerTool } from './components/tools/BatchRenamerTool';
import { BatchCompressorTool } from './components/tools/BatchCompressorTool';
import { TempFileShareTool } from './components/tools/TempFileShareTool';
import { FilesHistoryTool } from './components/tools/FilesHistoryTool';
import { PdfCompareTool } from './components/tools/PdfCompareTool';
import { PdfAdvancedTools } from './components/tools/PdfAdvancedTools';
import { ImageAdvancedTools } from './components/tools/ImageAdvancedTools';
import { VideoAdvancedTools } from './components/tools/VideoAdvancedTools';
import { MediaSummarizerTool } from './components/tools/MediaSummarizerTool';
import { PromptExtractorTool } from './components/tools/PromptExtractorTool';

import { RecentFilesBar } from './components/RecentFilesBar';
import { createSamplePdf } from './utils/pdfOperations';
import { ChevronRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import type { ToolId } from './types';

export default function App() {
  const [currentTool, setCurrentTool] = useState<ToolId>('home');
  const [sampleBuffer, setSampleBuffer] = useState<ArrayBuffer | null>(null);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);

  // Global Dark Mode state synced with localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pdf_media_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pdf_media_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pdf_media_theme', 'light');
    }
  }, [isDarkMode]);

  // Generate a realistic multi-page PDF sample
  const handleGenerateSample = async (targetTool?: ToolId) => {
    setIsGeneratingSample(true);
    try {
      const sampleUint8 = await createSamplePdf('document_exemple.pdf', 4);
      const buffer = sampleUint8.buffer.slice(
        sampleUint8.byteOffset,
        sampleUint8.byteOffset + sampleUint8.byteLength
      ) as ArrayBuffer;

      setSampleBuffer(buffer);

      if (targetTool) {
        setCurrentTool(targetTool);
      } else if (currentTool === 'home') {
        setCurrentTool('viewer');
      }
    } catch (err) {
      console.error('Error generating sample PDF:', err);
    } finally {
      setIsGeneratingSample(false);
    }
  };

  const toolTitles: Partial<Record<ToolId, string>> = {
    home: 'Accueil',
    merge: 'Fusionner des PDF',
    split: 'Diviser un PDF',
    organize: 'Organiser & Pivoter',
    compress: 'Compresser PDF',
    'page-numbers': 'Numéroter les Pages',
    crop: 'Rogner & Marges',
    'images-to-pdf': 'Images en PDF',
    'pdf-to-images': 'PDF en Images',
    watermark: 'Ajouter un Filigrane',
    sign: 'Signer un PDF',
    protect: 'Protéger par Mot de passe',
    metadata: 'Métadonnées du PDF',
    'image-convert': 'Convertisseur & Compresseur Image',
    'image-crop': 'Rogner une Image',
    'image-filter': 'Filtres & Retouches Photo',
    qr: 'Studio QR Code',
    'video-trim': 'Découper une Vidéo',
    'video-to-audio': 'Extraire l’Audio d’une Vidéo',
    'video-snapshot': 'Capturer des Photos depuis une Vidéo',
    viewer: 'Visionneuse PDF & OCR',
    ai: 'Assistant IA Document',
    'yt-thumbnail-extractor': 'Extracteur Miniatures YouTube',
    'yt-thumbnail-editor': 'Studio Miniatures YouTube',
    'universal-converter': 'Convertisseur Universel',
    'batch-compressor': 'Compresseur par Lots',
    'batch-renamer': 'Renommeur en Masse',
    'temp-file-share': 'Partage Temporaire & QR',
    'files-history': 'Historique des Fichiers',
    'pdf-compare': 'Comparer Deux PDF',
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Header
        currentTool={currentTool}
        onSelectTool={(tool) => {
          setCurrentTool(tool);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onGenerateSample={() => handleGenerateSample()}
        isGeneratingSample={isGeneratingSample}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumb Navigation when inside a tool */}
        {currentTool !== 'home' && (
          <div className="mb-6 flex items-center justify-between">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <button
                type="button"
                onClick={() => setCurrentTool('home')}
                className="hover:text-slate-900 dark:hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Tous les outils</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
              <span className="text-slate-900 dark:text-white font-semibold">{toolTitles[currentTool]}</span>
            </nav>

            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
              Traitement 100% sécurisé et local
            </span>
          </div>
        )}

        {/* View Router */}
        {currentTool === 'home' && (
          <ToolGrid
            onSelectTool={(tool) => {
              setCurrentTool(tool);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGenerateSample={() => handleGenerateSample()}
            isGeneratingSample={isGeneratingSample}
          />
        )}

        {/* --- PDF TOOLS --- */}
        {currentTool === 'pdf-creator' && <PdfCreatorTool />}

        {currentTool === 'merge' && (
          <MergeTool
            onUseSample={() => handleGenerateSample('merge')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}

        {currentTool === 'split' && (
          <SplitTool
            onUseSample={() => handleGenerateSample('split')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}

        {currentTool === 'organize' && (
          <OrganizeTool
            onUseSample={() => handleGenerateSample('organize')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}

        {currentTool === 'compress' && (
          <CompressPdfTool
            onUseSample={() => handleGenerateSample('compress')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}

        {currentTool === 'page-numbers' && (
          <PageNumbersTool
            onUseSample={() => handleGenerateSample('page-numbers')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}

        {currentTool === 'crop' && (
          <CropTool
            onUseSample={() => handleGenerateSample('crop')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}

        {currentTool === 'images-to-pdf' && <ImagesToPdfTool />}

        {currentTool === 'pdf-to-images' && (
          <PdfToImagesTool
            onUseSample={() => handleGenerateSample('pdf-to-images')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}

        {currentTool === 'watermark' && (
          <WatermarkTool
            onUseSample={() => handleGenerateSample('watermark')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}

        {currentTool === 'sign' && (
          <SignTool
            onUseSample={() => handleGenerateSample('sign')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}

        {currentTool === 'protect' && (
          <ProtectTool
            onUseSample={() => handleGenerateSample('protect')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}

        {currentTool === 'metadata' && (
          <MetadataTool
            onUseSample={() => handleGenerateSample('metadata')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}

        {/* --- IMAGE TOOLS --- */}
        {currentTool === 'image-convert' && <ImageConvertTool />}
        {currentTool === 'image-crop' && (
          <CropTool
            onUseSample={() => handleGenerateSample('crop')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}
        {currentTool === 'image-filter' && <ImageFilterTool />}
        {currentTool === 'qr' && <QrTool />}

        {/* --- VIDEO TOOLS --- */}
        {currentTool === 'video-trim' && <VideoTrimTool />}
        {currentTool === 'video-to-audio' && <VideoToAudioTool />}
        {currentTool === 'video-snapshot' && <VideoSnapshotTool />}

        {/* --- VIEWER & AI --- */}
        {currentTool === 'viewer' && (
          <ViewerTool
            onUseSample={() => handleGenerateSample('viewer')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}

        {currentTool === 'ai' && (
          <AiTool
            onUseSample={() => handleGenerateSample('ai')}
            isGeneratingSample={isGeneratingSample}
            sampleBuffer={sampleBuffer}
          />
        )}

        {/* --- PDF TOOLS (NOUVEAUX) --- */}
        {currentTool === 'pdf-compare' && <PdfCompareTool />}
        {[
          'pdf-flatten',
          'pdf-extract-images',
          'pdf-extract-tables',
          'pdf-redact',
          'pdf-header-footer',
          'pdf-repair',
          'pdf-resize-booklet',
        ].includes(currentTool) && <PdfAdvancedTools toolId={currentTool} />}

        {/* --- IMAGE TOOLS (NOUVEAUX) --- */}
        {[
          'image-meme',
          'image-palette',
          'image-social-crop',
          'image-collage',
          'image-exif-cleaner',
          'image-gradients',
          'image-favicon',
          'image-compare',
          'image-watermark',
          'image-remove-bg',
          'image-pixel-art',
          'image-flip',
        ].includes(currentTool) && <ImageAdvancedTools toolId={currentTool} />}

        {/* --- VIDEO TOOLS (NOUVEAUX) --- */}
        {[
          'video-screen-recorder',
          'video-speed',
          'video-gif',
          'video-watermark',
          'video-resize',
          'video-mute',
          'video-compress',
        ].includes(currentTool) && <VideoAdvancedTools toolId={currentTool} />}

        {/* --- MEDIA SUMMARIZERS & PROMPT EXTRACTORS (IA) --- */}
        {(currentTool === 'video-summarizer' || currentTool === 'audio-summarizer') && (
          <MediaSummarizerTool toolId={currentTool} />
        )}
        {(currentTool === 'image-prompt-extractor' || currentTool === 'video-prompt-extractor') && (
          <PromptExtractorTool toolId={currentTool} />
        )}

        {/* --- MINIATURES YOUTUBE --- */}
        {(currentTool === 'yt-thumbnail-extractor' || currentTool === 'yt-thumbnail-editor') && (
          <YouTubeThumbnailTool initialTab={currentTool === 'yt-thumbnail-editor' ? 'editor' : 'extractor'} />
        )}

        {/* --- OUTILS TRANSVERSAUX --- */}
        {currentTool === 'universal-converter' && <UniversalConverterTool />}
        {currentTool === 'batch-compressor' && <BatchCompressorTool />}
        {currentTool === 'batch-renamer' && <BatchRenamerTool />}
        {currentTool === 'temp-file-share' && <TempFileShareTool />}
        {currentTool === 'files-history' && <FilesHistoryTool />}

        {/* Section of 5 last processed files for quick access */}
        <RecentFilesBar
          onOpenTool={(toolId) => {
            setCurrentTool(toolId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </main>
    </div>
  );
}
