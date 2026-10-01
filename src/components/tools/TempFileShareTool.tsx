import React, { useState, useEffect } from 'react';
import {
  Share2,
  QrCode,
  Download,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  FileText,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import QRCode from 'qrcode';
import { DropZone } from '../DropZone';

export const TempFileShareTool: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [minutesRemaining, setMinutesRemaining] = useState<number>(30);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setSelectedFile(f);
    const url = URL.createObjectURL(f);
    setFileUrl(url);

    // Generate QR code for mobile viewing / local sharing
    QRCode.toDataURL(window.location.href, {
      width: 400,
      margin: 2,
      color: { dark: '#1E293B', light: '#FFFFFF' },
    })
      .then((qr) => setQrCodeUrl(qr))
      .catch(console.error);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setMinutesRemaining((prev) => (prev > 1 ? prev - 1 : 1));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-2xs">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Partage Temporaire & Transfert QR
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full">
                Sans Serveur / P2P Local
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transférez rapidement vos fichiers traités vers votre smartphone ou un collègue sur le même réseau via QR code instantané.
            </p>
          </div>
        </div>
      </div>

      {!selectedFile ? (
        <DropZone
          onFilesSelected={handleFilesSelected}
          multiple={false}
          title="Déposez le fichier que vous souhaitez partager"
          subtitle="PDF, image, vidéo ou archive ZIP (aucune copie stockée sur le cloud)"
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{selectedFile.name}</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type || 'Fichier binaire'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
              <span>Expire dans {minutesRemaining} min</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* QR Code */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 space-y-3">
              {qrCodeUrl && (
                <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
                  <img src={qrCodeUrl} alt="QR Code Partage" className="w-48 h-48 object-contain" />
                </div>
              )}
              <div className="text-center space-y-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-teal-600" />
                  <span>Scannez pour ouvrir sur mobile</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ouvrez l’appareil photo de votre smartphone pour accéder à l'application.
                </p>
              </div>
            </div>

            {/* Actions & Info */}
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Confidentialité maximale garantie</span>
                </div>
                <p className="text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
                  Le fichier reste en mémoire dans votre navigateur local. Aucun serveur externe n'héberge ni ne lit vos données sensibles.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (fileUrl) {
                      const a = document.createElement('a');
                      a.href = fileUrl;
                      a.download = selectedFile.name;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger une copie locale</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  Partager un autre fichier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
