export type ToolCategoryKey = 'pdf' | 'image' | 'video' | 'youtube' | 'transversal';

export type ToolId = 
  | 'home'
  // Outils PDF
  | 'pdf-creator'
  | 'merge'
  | 'split'
  | 'organize'
  | 'crop'
  | 'images-to-pdf'
  | 'pdf-to-images'
  | 'page-numbers'
  | 'compress'
  | 'watermark'
  | 'sign'
  | 'metadata'
  | 'protect'
  | 'viewer'
  | 'ai'
  | 'pdf-compare'
  | 'pdf-flatten'
  | 'pdf-extract-images'
  | 'pdf-extract-tables'
  | 'pdf-redact'
  | 'pdf-header-footer'
  | 'pdf-repair'
  | 'pdf-resize-booklet'
  // Outils Image
  | 'image-convert'
  | 'image-crop'
  | 'image-filter'
  | 'qr'
  | 'image-meme'
  | 'image-palette'
  | 'image-social-crop'
  | 'image-collage'
  | 'image-exif-cleaner'
  | 'image-gradients'
  | 'image-favicon'
  | 'image-compare'
  | 'image-watermark'
  | 'image-remove-bg'
  | 'image-pixel-art'
  | 'image-flip'
  | 'image-prompt-extractor'
  // Outils Vidéo
  | 'video-trim'
  | 'video-to-audio'
  | 'video-snapshot'
  | 'video-screen-recorder'
  | 'video-speed'
  | 'video-gif'
  | 'video-watermark'
  | 'video-resize'
  | 'video-mute'
  | 'video-compress'
  | 'video-summarizer'
  | 'audio-summarizer'
  | 'video-prompt-extractor'
  // Outils Miniatures YouTube
  | 'yt-thumbnail-extractor'
  | 'yt-thumbnail-editor'
  // Outils Transversaux
  | 'universal-converter'
  | 'batch-compressor'
  | 'batch-renamer'
  | 'temp-file-share'
  | 'files-history';

export interface PDFFileInfo {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  arrayBuffer: ArrayBuffer;
  thumbnailUrl?: string;
}

export interface PDFPageItem {
  pageIndex: number; // 0-indexed original index
  displayNumber: number; // 1-indexed
  rotation: number; // 0, 90, 180, 270
  thumbnailUrl?: string;
  selected: boolean;
  isDeleted: boolean;
}

export interface WatermarkItem {
  id: string;
  text: string;
  color: string;
  fontSize: number;
  opacity: number;
  rotation: number;
  position: 'center' | 'top' | 'bottom' | 'repeat';
  applyTo: 'all' | 'first' | 'custom';
  customPages?: string;
}

export type WatermarkOptions = WatermarkItem;

export interface MetadataOptions {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
}

export interface ImageToPdfItem {
  id: string;
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}

export type PageSizeOption = 'fit' | 'a4' | 'a3' | 'a5' | 'letter' | 'mobile_9_16' | 'square';
export type PageOrientationOption = 'portrait' | 'landscape' | 'auto';
export type PageMarginOption = number; // points (0 to 100 pt)
export type ImageQualityOption = 0.95 | 0.8 | 0.6;
export type ImageGridModeOption = 1 | 2 | 4;

export interface AdvancedImageToPdfOptions {
  pageSize: PageSizeOption;
  orientation: PageOrientationOption;
  margin: PageMarginOption;
  fitMode: 'contain' | 'cover';
  backgroundColor: string;
  quality: ImageQualityOption;
  gridMode: ImageGridModeOption;
  showPageNumbers: boolean;
  pageNumberPosition: 'bottom-center' | 'bottom-right';
  showFilenameCaptions: boolean;
  customFilename: string;
}
