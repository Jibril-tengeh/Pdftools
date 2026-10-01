import React, { useState, useRef } from 'react';
import {
  Music,
  Download,
  Loader2,
  CheckCircle2,
  Film,
  Play,
  Pause,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { extractAudioFromVideo } from '../../utils/mediaOperations';
import { downloadFile, formatBytes } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';

export const VideoToAudioTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileSelect = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
  };

  const handleExtract = async () => {
    if (!file) return;
    setIsExtracting(true);
    setStatusMessage('Décodage du flux vidéo et audio...');

    try {
      const wav = await extractAudioFromVideo(file, (status) => {
        setStatusMessage(status);
      });

      setAudioBlob(wav);
      const url = URL.createObjectURL(wav);
      setAudioUrl(url);

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      addRecentFile({
        name: `${baseName}_audio.wav`,
        toolName: 'Extraire l’Audio',
        toolId: 'video-to-audio',
        size: wav.size,
        pageCount: 1,
      });
    } catch (e) {
      console.error('Extraction error:', e);
      alert('Impossible d’extraire la piste audio de cette vidéo.');
    } finally {
      setIsExtracting(false);
    }
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!audioBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    downloadFile(audioBlob, `${baseName}_audio.wav`, 'audio/wav');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Extraire l’Audio d’une Vidéo</h1>
            <p className="text-xs text-slate-500">
              Convertissez la bande sonore de n’importe quelle vidéo (MP4, WEBM, MOV) en fichier audio haute fidélité (WAV 16-bit).
            </p>
          </div>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          accept="video/*"
          title="Déposez la vidéo dont vous voulez extraire le son"
          subtitle="Supporte MP4, WEBM, MOV, MKV, AVI"
          onUseSample={() => {}}
          isGeneratingSample={false}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
            {/* File info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 truncate block max-w-sm">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatBytes(file.size)} · Prêt pour extraction audio
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setAudioBlob(null);
                  setAudioUrl(null);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer self-start sm:self-auto"
              >
                Changer de fichier
              </button>
            </div>

            {/* Audio extracted card with player */}
            {audioUrl ? (
              <div className="p-5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Piste sonore extraite avec succès !</span>
                  </div>

                  <span className="text-xs font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                    WAV 16-bit PCM (Sans compression)
                  </span>
                </div>

                {/* Audio player UI */}
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-indigo-100">
                  <button
                    type="button"
                    onClick={togglePlayAudio}
                    className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>

                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    controls
                    className="w-full h-8"
                  />
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                <Volume2 className="w-8 h-8 text-indigo-500 mx-auto" />
                <p className="text-xs text-slate-700 font-medium">
                  Le moteur audio WebAssembly décode tous les canaux sonores pour générer un fichier WAV pur.
                </p>
                <p className="text-[11px] text-slate-400">
                  Idéal pour récupérer un discours, une conférence, une chanson ou une interview sans altération.
                </p>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
            <span className="text-xs text-slate-500">
              Extraction 100% exécutée dans votre navigateur via la Web Audio API.
            </span>

            {audioBlob ? (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger la Piste Audio (.WAV)</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isExtracting}
                onClick={handleExtract}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{statusMessage || 'Extraction en cours...'}</span>
                  </>
                ) : (
                  <>
                    <Music className="w-4 h-4" />
                    <span>Extraire la Piste Audio</span>
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
