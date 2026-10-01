import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Download,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Loader2,
  CheckCircle2,
  Film,
  Clock,
  Volume2,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { formatDuration } from '../../utils/mediaOperations';
import { downloadFile, formatBytes } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';

export const VideoTrimTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [trimmedBlob, setTrimmedBlob] = useState<Blob | null>(null);

  const handleFileSelect = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    setTrimmedBlob(null);

    const url = URL.createObjectURL(f);
    setVideoUrl(url);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    setDuration(dur);
    setStartTime(0);
    setEndTime(dur);
    setCurrentTime(0);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (currentTime >= endTime || currentTime < startTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    if (t >= endTime) {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime = startTime;
    }
  };

  const seekTo = (time: number) => {
    if (!videoRef.current) return;
    const safeTime = Math.max(0, Math.min(duration, time));
    videoRef.current.currentTime = safeTime;
    setCurrentTime(safeTime);
  };

  // Perform client-side video trimming using MediaRecorder and video element capture
  const handleExportTrimmed = async () => {
    if (!videoRef.current || !file) return;
    setIsExporting(true);
    setExportProgress(0);

    const video = videoRef.current;
    video.pause();
    setIsPlaying(false);

    try {
      video.currentTime = startTime;
      await new Promise((r) => setTimeout(r, 200));

      const stream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const trimLength = endTime - startTime;

      const completionPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(blob);
        };
      });

      mediaRecorder.start(100);
      video.play();

      const interval = setInterval(() => {
        if (video.currentTime >= endTime || video.paused) {
          clearInterval(interval);
          mediaRecorder.stop();
          video.pause();
        } else {
          const currentTrimmedPos = video.currentTime - startTime;
          setExportProgress(Math.min(99, Math.round((currentTrimmedPos / trimLength) * 100)));
        }
      }, 50);

      const resultBlob = await completionPromise;
      setTrimmedBlob(resultBlob);
      setExportProgress(100);

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      addRecentFile({
        name: `${baseName}_decoupe.webm`,
        toolName: 'Découper Vidéo',
        toolId: 'video-trim',
        size: resultBlob.size,
        pageCount: 1,
      });
    } catch (err) {
      console.error('Trimming error:', err);
      alert('Impossible de découper la vidéo automatiquement.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (!trimmedBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    downloadFile(trimmedBlob, `${baseName}_decoupe.webm`, 'video/webm');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Découper une Vidéo</h1>
            <p className="text-xs text-slate-500">
              Définissez les points de début et de fin sur la timeline et extrayez votre extrait vidéo en local.
            </p>
          </div>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          accept="video/*"
          title="Déposez la vidéo à découper"
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
                <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 truncate block max-w-sm">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatBytes(file.size)} · Durée totale : {formatDuration(duration)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setVideoUrl(null);
                  setTrimmedBlob(null);
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

            {/* Interactive Timeline & Markers */}
            <div className="space-y-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <span className="font-mono text-xs font-bold text-slate-800">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-500">
                    Extrait : <strong className="text-rose-600">{formatDuration(endTime - startTime)}</strong>
                  </span>
                </div>
              </div>

              {/* Range Dual Sliders */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                  <span>Début : <strong className="font-mono text-slate-900">{formatDuration(startTime)}</strong></span>
                  <span>Fin : <strong className="font-mono text-slate-900">{formatDuration(endTime)}</strong></span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Curseur Début</label>
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      step="0.1"
                      value={startTime}
                      onChange={(e) => {
                        const val = Math.min(Number(e.target.value), endTime - 0.2);
                        setStartTime(val);
                        seekTo(val);
                      }}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Curseur Fin</label>
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      step="0.1"
                      value={endTime}
                      onChange={(e) => {
                        const val = Math.max(Number(e.target.value), startTime + 0.2);
                        setEndTime(val);
                        seekTo(val);
                      }}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Fine step buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => seekTo(currentTime - 1)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    -1s
                  </button>
                  <button
                    type="button"
                    onClick={() => seekTo(currentTime - 0.1)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    -0.1s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartTime(currentTime);
                    }}
                    className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold cursor-pointer"
                  >
                    Fixer Début ici
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEndTime(currentTime);
                    }}
                    className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold cursor-pointer"
                  >
                    Fixer Fin ici
                  </button>
                  <button
                    type="button"
                    onClick={() => seekTo(currentTime + 0.1)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    +0.1s
                  </button>
                  <button
                    type="button"
                    onClick={() => seekTo(currentTime + 1)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    +1s
                  </button>
                </div>
              </div>
            </div>

            {/* Results Preview */}
            {trimmedBlob && (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Extrait vidéo découpé avec succès !</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Taille de l’extrait : {formatBytes(trimmedBlob.size)} · Durée : {formatDuration(endTime - startTime)}
                </p>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
            <span className="text-xs text-slate-500">
              Traitement temps réel exécuté dans votre navigateur via WebMedia API.
            </span>

            {trimmedBlob ? (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger la Vidéo Découpée</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isExporting || endTime <= startTime}
                onClick={handleExportTrimmed}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Découpage {exportProgress}%...</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>Découper et Exporter l’Extrait</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
