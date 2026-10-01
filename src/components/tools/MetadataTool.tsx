import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Download,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Eraser,
  FileText,
  Archive,
  Check,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { readPdfMetadata, updatePdfMetadata, convertToPdfA, downloadFile } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';
import type { MetadataOptions } from '../../types';

interface MetadataToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const MetadataTool: React.FC<MetadataToolProps> = ({
  onUseSample,
  isGeneratingSample,
  sampleBuffer,
}) => {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [metadata, setMetadata] = useState<MetadataOptions>({
    title: '',
    author: '',
    subject: '',
    keywords: '',
    creator: '',
    producer: '',
  });
  // PDF/A Options
  const [isPdfAEnabled, setIsPdfAEnabled] = useState<boolean>(false);
  const [pdfaLevel, setPdfaLevel] = useState<'PDF/A-1b' | 'PDF/A-2b'>('PDF/A-1b');
  const [complianceReport, setComplianceReport] = useState<string[] | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (sampleBuffer && !buffer) {
      loadBuffer(sampleBuffer, 'document_exemple.pdf');
    }
  }, [sampleBuffer]);

  const loadBuffer = async (rawBuffer: ArrayBuffer, name: string) => {
    setBuffer(rawBuffer);
    setFileName(name);
    setSuccessMessage(null);
    setComplianceReport(null);

    try {
      const data = await readPdfMetadata(rawBuffer);
      setMetadata(data);
    } catch (e) {
      console.error('Error reading PDF metadata:', e);
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buf = await f.arrayBuffer();
    loadBuffer(buf, f.name);
  };

  const clearAllFields = () => {
    setMetadata({
      title: '',
      author: '',
      subject: '',
      keywords: '',
      creator: '',
      producer: '',
    });
  };

  const handleSave = async () => {
    if (!buffer) return;
    setIsProcessing(true);
    setSuccessMessage(null);
    setComplianceReport(null);

    try {
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      let finalBytes: Uint8Array;
      let outputFileName: string;

      if (isPdfAEnabled) {
        // Convert to PDF/A with ISO 19005 compliance
        const result = await convertToPdfA(buffer, metadata, pdfaLevel);
        finalBytes = result.pdfBytes;
        outputFileName = `${baseName}_${pdfaLevel.toLowerCase().replace('/', '')}.pdf`;
        setComplianceReport(result.complianceDetails);
        setSuccessMessage(`Document converti avec succès au standard ${pdfaLevel} (ISO 19005) pour archivage pérenne !`);
      } else {
        // Standard metadata update
        finalBytes = await updatePdfMetadata(buffer, metadata);
        outputFileName = `${baseName}_metadata.pdf`;
        setSuccessMessage('Métadonnées enregistrées avec succès dans le document PDF !');
      }

      downloadFile(finalBytes, outputFileName);

      // Record in recent files
      addRecentFile({
        name: outputFileName,
        toolName: isPdfAEnabled ? `Archivage ${pdfaLevel}` : 'Métadonnées',
        toolId: 'metadata',
        size: finalBytes.byteLength,
        data: finalBytes,
      });
    } catch (e) {
      console.error('Error saving metadata / PDF-A:', e);
      alert('Une erreur est survenue lors de l’enregistrement du document.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Métadonnées & Archivage PDF/A</h1>
            <p className="text-xs text-slate-500">
              Consultez et modifiez les métadonnées, anonymisez vos fichiers ou convertissez-les vers le standard ISO PDF/A pour la conservation légale à long terme.
            </p>
          </div>
        </div>
      </div>

      {!buffer ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          title="Déposez le fichier PDF dont vous souhaitez éditer les métadonnées ou convertir en PDF/A"
          subtitle="Sélectionnez un document PDF"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold text-slate-900">{fileName}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={clearAllFields}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                  title="Supprimer toutes les métadonnées pour préserver votre anonymat"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Anonymiser (Tout effacer)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBuffer(null);
                    setComplianceReport(null);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700"
                >
                  Changer de fichier
                </button>
              </div>
            </div>

            {/* Standard Metadata Fields Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Titre du document</label>
                <input
                  type="text"
                  value={metadata.title}
                  onChange={(e) => setMetadata((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Contrat de prestation de services"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Auteur</label>
                <input
                  type="text"
                  value={metadata.author}
                  onChange={(e) => setMetadata((prev) => ({ ...prev, author: e.target.value }))}
                  placeholder="Ex: Jean Dupont"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Sujet / Description</label>
                <input
                  type="text"
                  value={metadata.subject}
                  onChange={(e) => setMetadata((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Ex: Synthèse trimestrielle Q3"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Mots-clés (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={metadata.keywords}
                  onChange={(e) => setMetadata((prev) => ({ ...prev, keywords: e.target.value }))}
                  placeholder="Ex: finance, rapport, audit"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Logiciel créateur (Creator)</label>
                <input
                  type="text"
                  value={metadata.creator}
                  onChange={(e) => setMetadata((prev) => ({ ...prev, creator: e.target.value }))}
                  placeholder="Ex: PDF Tools"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Producteur PDF (Producer)</label>
                <input
                  type="text"
                  value={metadata.producer}
                  onChange={(e) => setMetadata((prev) => ({ ...prev, producer: e.target.value }))}
                  placeholder="Ex: PDF Tools Engine"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* PDF/A Standard Conversion Section */}
            <div className="mt-6 pt-5 border-t border-slate-200 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Standard PDF/A pour archivage longue durée (Norme ISO 19005)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Convertit le document pour garantir qu’il pourra être lu et restitué à l’identique dans 10, 20 ou 50 ans, quel que soit le système utilisé. Requis pour les documents administratifs, légaux et comptables.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isPdfAEnabled}
                    onChange={(e) => setIsPdfAEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {isPdfAEnabled && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-emerald-950">
                      Niveau de conformité ISO :
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPdfaLevel('PDF/A-1b')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                          pdfaLevel === 'PDF/A-1b'
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        PDF/A-1b (ISO 19005-1)
                      </button>

                      <button
                        type="button"
                        onClick={() => setPdfaLevel('PDF/A-2b')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                          pdfaLevel === 'PDF/A-2b'
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        PDF/A-2b (ISO 19005-2)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-[11px] text-emerald-900 border-t border-emerald-200/60">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Injection du paquet XML de métadonnées XMP</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Profil colorimétrique standardisé sRGB</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Horodatage et suppression d’éléments volatils</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Validité pour archivage légal d’entreprise</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldAlert className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                Conseil confidentialité : supprimer le nom de l’auteur et les logiciels créateurs permet d’éviter la fuite de renseignements personnels ou professionnels avant de transmettre un document publiquement.
              </span>
            </div>
          </div>

          {/* Action button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-500">
              {isPdfAEnabled ? (
                <span className="text-emerald-700 font-semibold">
                  Le document sera certifié et standardisé selon la norme ISO {pdfaLevel}.
                </span>
              ) : (
                <span>Les métadonnées seront appliquées sans altérer le texte ou les images.</span>
              )}
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSave}
              className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer ${
                isPdfAEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                  : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Traitement en cours...</span>
                </>
              ) : isPdfAEnabled ? (
                <>
                  <Archive className="w-4 h-4" />
                  <span>Convertir en {pdfaLevel} & Télécharger</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Enregistrer et Télécharger</span>
                </>
              )}
            </button>
          </div>

          {/* Compliance Report Card when converted */}
          {complianceReport && (
            <div className="bg-white border border-emerald-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Rapport de conformité PDF/A généré</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {complianceReport.map((detail, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {successMessage && !complianceReport && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
