import React, { useState, useEffect } from 'react';
import {
  Lock,
  Download,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  KeyRound,
  FileText,
  AlertCircle,
  Printer,
  Copy,
  Edit3,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { protectPdfWithPassword, downloadFile, getPdfPageCount, formatBytes } from '../../utils/pdfOperations';
import { addRecentFile } from '../../utils/recentFiles';

interface ProtectToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const ProtectTool: React.FC<ProtectToolProps> = ({
  onUseSample,
  isGeneratingSample,
  sampleBuffer,
}) => {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(1);
  const [fileSize, setFileSize] = useState<number>(0);

  // Password fields
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [ownerPassword, setOwnerPassword] = useState<string>('');
  const [showAdvancedPerms, setShowAdvancedPerms] = useState<boolean>(false);

  // Encryption Algorithm & Permissions
  const [algorithm, setAlgorithm] = useState<'AES-256' | 'RC4'>('AES-256');
  const [allowPrinting, setAllowPrinting] = useState<boolean>(true);
  const [allowCopying, setAllowCopying] = useState<boolean>(true);
  const [allowModifying, setAllowModifying] = useState<boolean>(false);
  const [allowAnnotating, setAllowAnnotating] = useState<boolean>(true);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (sampleBuffer && !buffer) {
      loadBuffer(sampleBuffer, 'document_exemple.pdf');
    }
  }, [sampleBuffer]);

  const loadBuffer = async (rawBuffer: ArrayBuffer, name: string) => {
    setBuffer(rawBuffer);
    setFileName(name);
    setFileSize(rawBuffer.byteLength);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const count = await getPdfPageCount(rawBuffer);
      setPageCount(count);
    } catch (e) {
      console.error('Error getting page count:', e);
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buf = await f.arrayBuffer();
    loadBuffer(buf, f.name);
  };

  // Password strength evaluation
  const getPasswordStrength = (pwd: string): { label: string; color: string; percent: number } => {
    if (!pwd) return { label: 'Vide', color: 'bg-slate-200', percent: 0 };
    let score = 0;
    if (pwd.length >= 6) score += 25;
    if (pwd.length >= 10) score += 25;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 15;

    if (score < 40) return { label: 'Faible', color: 'bg-rose-500', percent: score };
    if (score < 75) return { label: 'Moyen', color: 'bg-amber-500', percent: score };
    return { label: 'Robuste', color: 'bg-emerald-500', percent: score };
  };

  const strength = getPasswordStrength(password);

  const handleProtect = async () => {
    if (!buffer) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password) {
      setErrorMessage('Veuillez définir un mot de passe d’ouverture.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsProcessing(true);

    try {
      const encryptedBytes = await protectPdfWithPassword(buffer, {
        userPassword: password,
        ownerPassword: ownerPassword.trim() || undefined,
        algorithm: algorithm,
        allowPrinting,
        allowCopying,
        allowModifying,
        allowAnnotating,
      });

      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const outName = `${baseName}_protege.pdf`;

      downloadFile(encryptedBytes, outName);

      addRecentFile({
        name: outName,
        toolName: 'Protéger PDF',
        toolId: 'protect',
        size: encryptedBytes.byteLength,
        pageCount: pageCount,
        data: encryptedBytes,
      });

      setSuccessMessage(
        `Votre document est désormais chiffré et protégé par mot de passe (${algorithm}) !`
      );
    } catch (e: any) {
      console.error('Error encrypting PDF:', e);
      setErrorMessage(
        e?.message || 'Une erreur est survenue lors du chiffrement du document.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Protéger un PDF par Mot de Passe</h1>
            <p className="text-xs text-slate-500">
              Chiffrez votre document localement avec un mot de passe inviolable (AES-256) et contrôlez les autorisations d’impression et de copie.
            </p>
          </div>
        </div>
      </div>

      {!buffer ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          title="Déposez le fichier PDF à chiffrer et protéger"
          subtitle="Sélectionnez un document PDF"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
            {/* File info bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 truncate block max-w-sm">
                    {fileName}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {pageCount} page{pageCount > 1 ? 's' : ''} · {formatBytes(fileSize)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBuffer(null);
                  setPassword('');
                  setConfirmPassword('');
                  setOwnerPassword('');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer self-start sm:self-auto"
              >
                Changer de fichier
              </button>
            </div>

            {/* Passwords Inputs */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Main User Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Mot de passe d’ouverture (Requis)</span>
                    {password && (
                      <span className="text-[10px] font-medium text-slate-500">
                        Force : {strength.label}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Définissez un mot de passe sécurisé..."
                      className="w-full text-xs px-3 py-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength bar */}
                  {password && (
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${strength.percent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retapez le mot de passe..."
                    className={`w-full text-xs px-3 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 font-mono ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-rose-400 focus:ring-rose-400'
                        : 'border-slate-300 focus:ring-rose-500'
                    }`}
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-[11px] text-rose-600">Les mots de passe ne correspondent pas.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Security Options Drawer */}
            <div className="pt-2 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  <span>Algorithme et autorisations d’accès</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvancedPerms(!showAdvancedPerms)}
                  className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer font-medium"
                >
                  {showAdvancedPerms ? 'Masquer les permissions' : 'Personnaliser les permissions'}
                </button>
              </div>

              {/* Encryption Algorithm Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setAlgorithm('AES-256')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    algorithm === 'AES-256'
                      ? 'bg-rose-50/60 border-rose-400 ring-1 ring-rose-400/50'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Chiffrement AES-256</span>
                    <span className="text-[10px] text-rose-700 bg-rose-100 font-semibold px-1.5 py-0.5 rounded">
                      Recommandé
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Standard moderne le plus sécurisé (Norme PDF 2.0). Chiffrement militaire inviolable.
                  </p>
                </div>

                <div
                  onClick={() => setAlgorithm('RC4')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    algorithm === 'RC4'
                      ? 'bg-rose-50/60 border-rose-400 ring-1 ring-rose-400/50'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Chiffrement RC4 (128-bit)</span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 font-medium px-1.5 py-0.5 rounded">
                      Compatibilité
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Compatible avec tous les anciens lecteurs PDF historiques (Acrobat Reader v5+).
                  </p>
                </div>
              </div>

              {/* Granular Permissions Checkboxes */}
              {showAdvancedPerms && (
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Mot de passe administrateur / propriétaire (Optionnel)
                    </label>
                    <input
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="Mot de passe requis pour modifier les permissions..."
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">
                      Permet d’attribuer des droits différents entre la lecture du document et sa modification.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowPrinting}
                        onChange={(e) => setAllowPrinting(e.target.checked)}
                        className="rounded text-rose-600 accent-rose-600"
                      />
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Autoriser l’impression haute résolution</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowCopying}
                        onChange={(e) => setAllowCopying(e.target.checked)}
                        className="rounded text-rose-600 accent-rose-600"
                      />
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Autoriser la copie de texte et d’images</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowAnnotating}
                        onChange={(e) => setAllowAnnotating(e.target.checked)}
                        className="rounded text-rose-600 accent-rose-600"
                      />
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Autoriser les annotations et formulaires</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowModifying}
                        onChange={(e) => setAllowModifying(e.target.checked)}
                        className="rounded text-rose-600 accent-rose-600"
                      />
                      <Shield className="w-3.5 h-3.5 text-slate-500" />
                      <span>Autoriser la modification des pages</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Privacy notice banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Confidentialité garantie à 100%</strong> : Le chiffrement s’effectue directement dans votre navigateur via la Web Crypto API. Aucun mot de passe et aucun fichier n’est transmis sur un serveur distant.
              </span>
            </div>
          </div>

          {/* Action button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs text-slate-500">
              Le fichier généré demandera ce mot de passe pour être ouvert dans n’importe quel lecteur PDF.
            </div>

            <button
              type="button"
              disabled={isProcessing || !password || password !== confirmPassword}
              onClick={handleProtect}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Chiffrement en cours...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Chiffrer et Télécharger le PDF</span>
                </>
              )}
            </button>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
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
