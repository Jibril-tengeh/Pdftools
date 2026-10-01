import React, { useState, useRef } from 'react';
import {
  Camera,
  Download,
  Play,
  Pause,
  Film,
  Sparkles,
  Eye,
  Trash2,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { captureVideoFrameAtTime, formatDuration } from '../../utils/mediaOperations';
import { downloadFile, formatBytes } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';

interface CapturedFrame {
  id: string;
  dataUrl: string;
  blob: Blob;
  time: number;
  width: number;
  height: number;
}

export const VideoSnapshotTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleFileSelect = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    setFrames([]);
    setPreviewImage(null);

    const url = URL.createObjectURL(f);
    setVideoUrl(url);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleCaptureFrame = async () => {
    if (!videoRef.current || !file) return;

    try {
      const snap = await captureVideoFrameAtTime(videoRef.current, 'image/jpeg', 0.95);
      const newFrame: CapturedFrame = {
        id: `${Date.now()}-${Math.random()}`,
        dataUrl: snap.dataUrl,
        blob: snap.blob,
        time: videoRef.current.currentTime,
        width: snap.width,
        height: snap.height,
      };

      setFrames((prev) => [newFrame, ...prev]);

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      addRecentFile({
        name: `${baseName}_capture_${formatDuration(newFrame.time).replace(':', 'm')}.jpg`,
        toolName: 'Capture Vidéo',
        toolId: 'video-snapshot',
        size: snap.blob.size,
        pageCount: 1,
      });
    } catch (err) {
      console.error('Frame snapshot error:', err);
    }
  };

  const downloadFrame = (frame: CapturedFrame) => {
    if (!file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const timeStr = formatDuration(frame.time).replace(':', 'm').replace('.', 's');
    downloadFile(frame.blob, `${baseName}_frame_${timeStr}.jpg`, 'image/jpeg');
  };

  const removeFrame = (id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Capturer des Photos depuis une Vidéo</h1>
            <p className="text-xs text-slate-500">
              Extrayez des images nettes en pleine résolution d’un moment précis de votre vidéo en un seul clic.
            </p>
          </div>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          accept="video/*"
          title="Déposez la vidéo pour en extraire des photos"
          subtitle="Supporte MP4, WEBM, MOV, MKV"
          onUseSample={() => {}}
          isGeneratingSample={false}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
            {/* File info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 truncate block max-w-sm">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatBytes(file.size)} · Durée : {formatDuration(duration)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setVideoUrl(null);
                  setFrames([]);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer self-start sm:self-auto"
              >
                Changer de vidéo
              </button>
            </div>

            {/* Video Player */}
            <div className="bg-black rounded-xl overflow-hidden shadow-md flex items-center justify-center relative aspect-16/9 max-h-[440px] mx-auto">
              {videoUrl && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full h-full object-contain"
                  playsInline
                />
              )}
            </div>

            {/* Controls Bar */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <span className="font-mono text-xs font-bold text-slate-800">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                </div>

                {/* Big Capture Button */}
                <button
                  type="button"
                  onClick={handleCaptureFrame}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capturer la photo à cet instant</span>
                </button>
              </div>

              {/* Scrubber Range */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.05"
                value={currentTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (videoRef.current) {
                    videoRef.current.currentTime = val;
                    setCurrentTime(val);
                  }
                }}
                className="w-full accent-pink-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Captured Frames Gallery */}
          {frames.length > 0 && (
            <div className="space-y-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900">
                  {frames.length} photo{frames.length > 1 ? 's' : ''} capturée{frames.length > 1 ? 's' : ''}
                </h3>
                <span className="text-[11px] text-slate-400">
                  Haute résolution native du fichier vidéo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {frames.map((frame) => (
                  <div
                    key={frame.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between group shadow-2xs"
                  >
                    <div
                      onClick={() => setPreviewImage(frame.dataUrl)}
                      className="aspect-video bg-black relative overflow-hidden cursor-pointer"
                    >
                      <img
                        src={frame.dataUrl}
                        alt={`Capture à ${formatDuration(frame.time)}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <div className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-slate-800">
                          {formatDuration(frame.time)}
                        </span>
                        <p className="text-[9px] text-slate-400 font-mono">
                          {frame.width}x{frame.height}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => downloadFrame(frame)}
                          className="p-1 text-slate-600 hover:text-pink-600 rounded cursor-pointer"
                          title="Télécharger cette photo"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFrame(frame.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Preview */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 relative">
            <img
              src={previewImage}
              alt="Aperçu photo"
              className="max-h-[85vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
