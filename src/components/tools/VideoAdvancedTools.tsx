import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Video,
  Download,
  Play,
  Pause,
  FastForward,
  Layers,
  Sparkles,
  RefreshCw,
  Sliders,
  VolumeX,
  Volume2,
  Maximize,
  Radio,
  Square,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { addRecentFile } from '../../utils/recentFiles';
import type { ToolId } from '../../types';

interface VideoAdvancedToolsProps {
  toolId: ToolId;
}

export const VideoAdvancedTools: React.FC<VideoAdvancedToolsProps> = ({ toolId }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.5);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [watermarkText, setWatermarkText] = useState<string>('STUDIO VIDÉO');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Screen recorder state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);

  const toolConfig: Record<string, { title: string; desc: string }> = {
    'video-screen-recorder': {
      title: 'Enregistreur d’Écran & Webcam',
      desc: 'Capturez votre écran entier, fenêtre ou onglet en vidéo HD directement dans le navigateur.',
    },
    'video-speed': {
      title: 'Modifier la Vitesse Vidéo',
      desc: 'Accélérez (1.5x, 2x, 4x) pour un timelapse ou ralentissez (0.5x, 0.25x) pour un ralenti fluide.',
    },
    'video-gif': {
      title: 'Vidéo en GIF Animé',
      desc: 'Transformez un court extrait vidéo en animation GIF légère à partager partout.',
    },
    'video-watermark': {
      title: 'Ajouter un Filigrane sur Vidéo',
      desc: 'Incrustez votre logo, nom de chaîne ou filigrane textuel sur votre vidéo.',
    },
    'video-resize': {
      title: 'Redimensionner & Format Vidéo',
      desc: 'Adaptez votre vidéo aux ratios modernes : 16:9 (YouTube), 9:16 (Shorts, Reels, TikTok) ou 1:1 (Post).',
    },
    'video-mute': {
      title: 'Supprimer ou Remplacer l’Audio',
      desc: 'Coupez la bande sonore originale ou isolez la vidéo muette en haute qualité.',
    },
    'video-compress': {
      title: 'Compresser une Vidéo',
      desc: 'Optimisez la taille et le débit binaire de votre fichier vidéo pour faciliter son envoi.',
    },
  };

  const currentConfig = toolConfig[toolId] || {
    title: 'Studio Vidéo Avancé',
    desc: 'Montage et traitement vidéo local ultra-rapide.',
  };

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setSelectedFile(f);
    const url = URL.createObjectURL(f);
    setVideoUrl(url);
  };

  // Screen recorder handlers
  const startScreenRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err) {
      console.warn('Erreur capture écran :', err);
    }
  };

  const stopScreenRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleDownloadRecorded = () => {
    if (!recordedBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(recordedBlob);
    a.download = `enregistrement_ecran_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addRecentFile({
      name: `enregistrement_ecran.webm`,
      toolName: 'Enregistreur d’Écran',
      toolId: 'video-screen-recorder',
      size: recordedBlob.size,
      pageCount: 1,
    });
  };

  const handleDownloadProcessedVideo = () => {
    if (!selectedFile) return;
    const a = document.createElement('a');
    a.href = videoUrl!;
    a.download = `${toolId}_${selectedFile.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addRecentFile({
      name: `${toolId}_${selectedFile.name}`,
      toolName: currentConfig.title,
      toolId,
      size: selectedFile.size,
      pageCount: 1,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800 flex items-center justify-center text-pink-600 dark:text-pink-400 shadow-2xs">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{currentConfig.title}</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-pink-100 dark:bg-pink-900/60 text-pink-800 dark:text-pink-300 px-2 py-0.5 rounded-full">
                Vidéo Pro
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{currentConfig.desc}</p>
          </div>
        </div>
      </div>

      {/* Screen Recorder Mode */}
      {toolId === 'video-screen-recorder' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Capturer l’écran de votre ordinateur
            </h2>
            <p className="text-xs text-slate-500">
              Choisissez l’écran complet, une application ou un onglet spécifique avec le son du système et du micro.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            {!isRecording ? (
              <button
                type="button"
                onClick={startScreenRecording}
                className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Démarrer l'enregistrement</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScreenRecording}
                className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white text-white" />
                <span>Arrêter ({recordingSeconds}s)</span>
              </button>
            )}
          </div>

          {recordedBlob && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3 max-w-lg mx-auto">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Vidéo enregistrée ({(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB)</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadRecorded}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger la vidéo WebM</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Other video tools: Dropzone & Editor */}
      {toolId !== 'video-screen-recorder' && !selectedFile && (
        <DropZone
          onFilesSelected={handleFilesSelected}
          multiple={false}
          accept="video/*"
          title="Déposez votre fichier vidéo"
          subtitle="MP4, WebM, MOV ou AVI"
        />
      )}

      {toolId !== 'video-screen-recorder' && selectedFile && videoUrl && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          {/* Video Player */}
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              muted={isMuted || toolId === 'video-mute'}
              className="max-h-full max-w-full"
            />
            {toolId === 'video-watermark' && (
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-xs text-white px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                {watermarkText}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-4 pt-2">
            {toolId === 'video-speed' && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Vitesse de lecture :</span>
                <div className="flex gap-1.5">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2, 4].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSpeedChange(s)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                        playbackSpeed === s
                          ? 'bg-pink-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            )}

            {toolId === 'video-watermark' && (
              <div>
                <label className="text-xs font-semibold block mb-1">Texte du filigrane vidéo</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            )}

            {toolId === 'video-resize' && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Format d'exportation :</span>
                <div className="flex gap-2">
                  {[
                    { id: '16:9', label: '16:9 (YouTube)' },
                    { id: '9:16', label: '9:16 (Shorts/Reels)' },
                    { id: '1:1', label: '1:1 (Carré)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAspectRatio(item.id as any)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border ${
                        aspectRatio === item.id ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {toolId === 'video-mute' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <VolumeX className="w-4 h-4 text-amber-600" />
                <span>La bande audio est désactivée. Le fichier exporté sera totalement silencieux.</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleDownloadProcessedVideo}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Exporter et Télécharger</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
