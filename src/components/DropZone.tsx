import React, { useRef, useState } from 'react';
import { UploadCloud, FileUp, Sparkles, AlertCircle } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  onUseSample?: () => void;
  isGeneratingSample?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  accept = '.pdf,application/pdf',
  multiple = false,
  title = 'Glissez-déposez vos fichiers ici',
  subtitle = 'ou cliquez pour parcourir vos dossiers',
  onUseSample,
  isGeneratingSample = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const validFiles: File[] = [];
    const isImageMode = accept.includes('image');
    const isVideoMode = accept.includes('video');

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (isImageMode) {
        if (file.type.startsWith('image/')) {
          validFiles.push(file);
        }
      } else if (isVideoMode) {
        if (file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(file.name)) {
          validFiles.push(file);
        }
      } else {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          validFiles.push(file);
        }
      }
    }

    if (validFiles.length === 0) {
      setErrorMessage(
        isVideoMode
          ? 'Veuillez sélectionner un fichier vidéo valide (MP4, WEBM, MOV).'
          : isImageMode
          ? 'Veuillez sélectionner des images valides (PNG, JPG, WEBP).'
          : 'Veuillez sélectionner des fichiers PDF valides.'
      );
      return;
    }

    onFilesSelected(multiple ? validFiles : [validFiles[0]]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer select-none ${
          isDragOver
            ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 ring-4 ring-rose-500/10'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900/60 hover:bg-slate-50/50 dark:hover:bg-slate-850/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform ${
              isDragOver ? 'scale-110 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {isDragOver ? <FileUp className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
          </div>

          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            {multiple && (
              <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/60 px-2.5 py-0.5 rounded-full">
                Traitement par lot disponible (Glissez plusieurs fichiers)
              </span>
            )}
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Sélectionner {multiple ? 'des fichiers' : 'un fichier'}
            </button>

            {onUseSample && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUseSample();
                }}
                disabled={isGeneratingSample}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 active:bg-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{isGeneratingSample ? 'Chargement...' : 'Tester avec un PDF exemple'}</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            Traitement local et sécurisé · {accept.includes('image') ? 'Images JPG, PNG, WEBP' : 'Fichiers PDF'}
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
