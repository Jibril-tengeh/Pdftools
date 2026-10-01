/**
 * Client-Side Media Operations (Image & Video)
 * Runs 100% locally in the browser with Canvas, Web Audio API, and MediaRecorder.
 */

export interface ImageFilterOptions {
  brightness: number; // 50 to 150 (default 100)
  contrast: number; // 50 to 150 (default 100)
  saturation: number; // 0 to 200 (default 100)
  blur: number; // 0 to 20px (default 0)
  sepia: number; // 0 to 100% (default 0)
  grayscale: number; // 0 to 100% (default 0)
  invert: number; // 0 to 100% (default 0)
  rotation: number; // 0, 90, 180, 270
}

/**
 * Convert and compress an image file to another format (JPEG, PNG, WEBP)
 */
export async function convertImageFormat(
  file: File,
  targetFormat: 'image/jpeg' | 'image/png' | 'image/webp',
  quality: number = 0.9,
  targetWidth?: number,
  targetHeight?: number
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number; originalSize: number; newSize: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const outWidth = targetWidth || img.naturalWidth;
      const outHeight = targetHeight || img.naturalHeight;

      canvas.width = outWidth;
      canvas.height = outHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Impossible de créer le contexte 2D'));
        return;
      }

      // If converting to JPEG, fill white background (in case of PNG transparency)
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, outWidth, outHeight);
      }

      ctx.drawImage(img, 0, 0, outWidth, outHeight);

      const dataUrl = canvas.toDataURL(targetFormat, quality);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Erreur de conversion de l’image'));
            return;
          }
          resolve({
            blob,
            dataUrl,
            width: outWidth,
            height: outHeight,
            originalSize: file.size,
            newSize: blob.size,
          });
        },
        targetFormat,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Format d’image non supporté ou fichier corrompu'));
    };

    img.src = url;
  });
}

/**
 * Crops an image to specific rectangular coordinates
 */
export async function cropImageToBlob(
  file: File,
  cropArea: { x: number; y: number; width: number; height: number },
  format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/png',
  quality: number = 0.92
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, cropArea.width);
      canvas.height = Math.max(1, cropArea.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
      );

      const dataUrl = canvas.toDataURL(format, quality);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Crop failed'));
          return;
        }
        resolve({ blob, dataUrl });
      }, format, quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image failed to load'));
    };

    img.src = url;
  });
}

/**
 * Encodes an AudioBuffer into standard 16-bit PCM WAV Blob
 */
export function encodeAudioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let samples: Float32Array;
  if (numChannels === 2) {
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.getChannelData(1);
    samples = new Float32Array(ch0.length * 2);
    for (let i = 0; i < ch0.length; i++) {
      samples[i * 2] = ch0[i];
      samples[i * 2 + 1] = ch1[i];
    }
  } else {
    samples = audioBuffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV Header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Extracts and decodes the audio track of a video file into a WAV audio file
 */
export async function extractAudioFromVideo(
  file: File,
  onProgress?: (status: string) => void
): Promise<Blob> {
  if (onProgress) onProgress('Lecture et décodage du flux audio...');

  const arrayBuffer = await file.arrayBuffer();
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    if (onProgress) onProgress('Encodage du fichier audio WAV haute fidélité...');
    const wavBlob = encodeAudioBufferToWav(audioBuffer);
    return wavBlob;
  } finally {
    audioCtx.close();
  }
}

/**
 * Captures a sharp frame snapshot from a video at a specific playback second
 */
export async function captureVideoFrameAtTime(
  videoElement: HTMLVideoElement,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality: number = 0.95
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth || 1280;
  canvas.height = videoElement.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Impossible d’initialiser le canvas');

  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL(format, quality);
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), format, quality);
  });

  return {
    dataUrl,
    blob,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 10);

  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis}`;
}
