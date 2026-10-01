import React, { useState, useMemo } from 'react';
import {
  FileEdit,
  Download,
  FolderArchive,
  RefreshCw,
  Trash2,
  Sliders,
  Check,
  Eye,
  Hash,
  Calendar,
} from 'lucide-react';
import JSZip from 'jszip';
import { DropZone } from '../DropZone';
import { addRecentFile } from '../../utils/recentFiles';

interface RenameItem {
  id: string;
  file: File;
  originalName: string;
}

export const BatchRenamerTool: React.FC = () => {
  const [files, setFiles] = useState<RenameItem[]>([]);
  const [prefix, setPrefix] = useState<string>('');
  const [suffix, setSuffix] = useState<string>('');
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [caseMode, setCaseMode] = useState<'none' | 'lower' | 'upper' | 'title' | 'kebab' | 'snake'>('none');
  const [addNumbering, setAddNumbering] = useState<boolean>(false);
  const [numberStart, setNumberStart] = useState<number>(1);
  const [numberDigits, setNumberDigits] = useState<number>(2);
  const [addDate, setAddDate] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const handleFilesSelected = (selected: File[]) => {
    const items: RenameItem[] = selected.map((f) => ({
      id: `${f.name}_${Math.random()}`,
      file: f,
      originalName: f.name,
    }));
    setFiles((prev) => [...prev, ...items]);
  };

  const computeNewName = (originalName: string, index: number): string => {
    const dotIndex = originalName.lastIndexOf('.');
    let base = dotIndex !== -1 ? originalName.slice(0, dotIndex) : originalName;
    const ext = dotIndex !== -1 ? originalName.slice(dotIndex) : '';

    // Find & Replace
    if (findText) {
      base = base.split(findText).join(replaceText);
    }

    // Case
    if (caseMode === 'lower') base = base.toLowerCase();
    else if (caseMode === 'upper') base = base.toUpperCase();
    else if (caseMode === 'title') {
      base = base.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    } else if (caseMode === 'kebab') {
      base = base.replace(/\s+/g, '-').toLowerCase();
    } else if (caseMode === 'snake') {
      base = base.replace(/\s+/g, '_').toLowerCase();
    }

    // Date
    let dateStr = '';
    if (addDate) {
      const d = new Date();
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      dateStr = `${yr}-${mo}-${da}_`;
    }

    // Numbering
    let numStr = '';
    if (addNumbering) {
      const num = numberStart + index;
      numStr = `_${String(num).padStart(numberDigits, '0')}`;
    }

    return `${dateStr}${prefix}${base}${suffix}${numStr}${ext}`;
  };

  const previewList = useMemo(() => {
    return files.map((item, idx) => ({
      ...item,
      newName: computeNewName(item.originalName, idx),
    }));
  }, [files, prefix, suffix, findText, replaceText, caseMode, addNumbering, numberStart, numberDigits, addDate]);

  const handleDownloadZip = async () => {
    if (previewList.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const item of previewList) {
        zip.file(item.newName, item.file);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `fichiers_renommes_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);

      addRecentFile({
        name: `fichiers_renommes.zip`,
        toolName: 'Renommage en masse',
        toolId: 'batch-renamer',
        size: blob.size,
        pageCount: previewList.length,
      });
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la compression.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-2xs">
            <FileEdit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Renommeur de Fichiers en Masse
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-full">
                Lots & ZIP
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Appliquez des préfixes, suffixes, numérotations séquentielles et remplacements de texte sur des centaines de fichiers.
            </p>
          </div>
        </div>
      </div>

      <DropZone
        onFilesSelected={handleFilesSelected}
        multiple={true}
        title="Glissez-déposez vos fichiers à renommer"
        subtitle="Tous types de fichiers acceptés (PDF, images, vidéos, documents)"
      />

      {files.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Rules Controls (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>Règles de renommage</span>
              </h3>
              <span className="text-[11px] font-mono text-purple-600 font-bold">{files.length} fichiers</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Préfixe (début)
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="ex: FACTURE_"
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Suffixe (fin)
                  </label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="ex: _FINAL"
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Rechercher
                  </label>
                  <input
                    type="text"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    placeholder="ex: copie"
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Remplacer par
                  </label>
                  <input
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="ex: v2"
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Casse des caractères
                </label>
                <select
                  value={caseMode}
                  onChange={(e) => setCaseMode(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="none">Ne pas modifier la casse</option>
                  <option value="lower">tout en minuscules (ex: image_test)</option>
                  <option value="upper">TOUT EN MAJUSCULES (ex: IMAGE_TEST)</option>
                  <option value="title">Majuscule Au Début De Chaque Mot</option>
                  <option value="kebab">kebab-case (tirets-du-6)</option>
                  <option value="snake">snake_case (tirets_du_8)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addDate}
                    onChange={(e) => setAddDate(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Insérer la date du jour (YYYY-MM-DD_)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addNumbering}
                    onChange={(e) => setAddNumbering(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Ajouter une numérotation séquentielle</span>
                </label>

                {addNumbering && (
                  <div className="grid grid-cols-2 gap-2 pl-6 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Départ</span>
                      <input
                        type="number"
                        min="0"
                        value={numberStart}
                        onChange={(e) => setNumberStart(Number(e.target.value))}
                        className="w-full text-xs p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Chiffres (ex: 01, 001)</span>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={numberDigits}
                        onChange={(e) => setNumberDigits(Number(e.target.value))}
                        className="w-full text-xs p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isZipping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FolderArchive className="w-4 h-4" />}
                  <span>{isZipping ? 'Création de l’archive...' : 'Télécharger tout en ZIP renommé'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Preview Table (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-600" />
                <span>Aperçu en direct (Avant / Après)</span>
              </h3>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-xs text-slate-400 hover:text-rose-600 transition-colors"
              >
                Tout retirer
              </button>
            </div>

            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
              {previewList.map((item) => (
                <div key={item.id} className="py-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] truncate">
                    <span className="truncate">{item.originalName}</span>
                    <span>{(item.file.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <div className="font-bold text-purple-600 dark:text-purple-400 font-mono truncate">
                    → {item.newName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
