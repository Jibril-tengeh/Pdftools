import React, { useState } from 'react';
import {
  GitCompare,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { DropZone } from '../DropZone';

export const PdfCompareTool: React.FC = () => {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [docAInfo, setDocAInfo] = useState<{ pages: number; size: number } | null>(null);
  const [docBInfo, setDocBInfo] = useState<{ pages: number; size: number } | null>(null);
  const [urlA, setUrlA] = useState<string | null>(null);
  const [urlB, setUrlB] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'side-by-side' | 'details'>('side-by-side');

  const handleSelectA = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFileA(f);
    setUrlA(URL.createObjectURL(f));
    const buf = await f.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    setDocAInfo({ pages: doc.getPageCount(), size: f.size });
  };

  const handleSelectB = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFileB(f);
    setUrlB(URL.createObjectURL(f));
    const buf = await f.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    setDocBInfo({ pages: doc.getPageCount(), size: f.size });
  };

  const pageDiff = docAInfo && docBInfo ? docAInfo.pages - docBInfo.pages : 0;
  const sizeDiff = docAInfo && docBInfo ? docAInfo.size - docBInfo.size : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Comparer Deux Fichiers PDF
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  Diff Visuel & Métadonnées
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Placez deux versions d'un même contrat ou document côte à côte pour détecter les différences.
              </p>
            </div>
          </div>

          {fileA && fileB && (
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('side-by-side')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'side-by-side'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                Vue Côte-à-Côte
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'details'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                Rapport de Différences
              </button>
            </div>
          )}
        </div>
      </div>

      {(!fileA || !fileB) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Document Original (Version A)
            </span>
            <DropZone
              onFilesSelected={handleSelectA}
              multiple={false}
              accept="application/pdf"
              title={fileA ? fileA.name : 'Déposez le premier PDF'}
              subtitle={docAInfo ? `${docAInfo.pages} pages · ${(docAInfo.size / 1024).toFixed(0)} KB` : 'Fichier de référence'}
            />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Document Modifié (Version B)
            </span>
            <DropZone
              onFilesSelected={handleSelectB}
              multiple={false}
              accept="application/pdf"
              title={fileB ? fileB.name : 'Déposez le deuxième PDF'}
              subtitle={docBInfo ? `${docBInfo.pages} pages · ${(docBInfo.size / 1024).toFixed(0)} KB` : 'Nouvelle version'}
            />
          </div>
        </div>
      )}

      {fileA && fileB && docAInfo && docBInfo && (
        <div className="space-y-6">
          {/* Quick Comparison Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="text-[11px] text-slate-400">Pages Doc A</div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">{docAInfo.pages} pages</div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="text-[11px] text-slate-400">Pages Doc B</div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">{docBInfo.pages} pages</div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="text-[11px] text-slate-400">Écart de Pages</div>
              <div className={`text-base font-bold ${pageDiff === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {pageDiff === 0 ? 'Identique' : `${Math.abs(pageDiff)} page(s) d'écart`}
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="text-[11px] text-slate-400">Écart de Poids</div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                {(Math.abs(sizeDiff) / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>

          {activeTab === 'side-by-side' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    A: {fileA.name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">{(fileA.size / 1024).toFixed(0)} KB</span>
                </div>
                {urlA && (
                  <iframe src={urlA} className="w-full h-[650px] border-none" title="Document A" />
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    B: {fileB.name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">{(fileB.size / 1024).toFixed(0)} KB</span>
                </div>
                {urlB && (
                  <iframe src={urlB} className="w-full h-[650px] border-none" title="Document B" />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Rapport de structure comparée
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Nom du fichier</span>
                  <div className="text-right">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">A: {fileA.name}</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">B: {fileB.name}</div>
                  </div>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Nombre de pages</span>
                  <div className="text-right font-mono font-bold">
                    <span>{docAInfo.pages}</span> vs <span>{docBInfo.pages}</span>
                  </div>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Taille du fichier</span>
                  <div className="text-right font-mono font-bold">
                    <span>{(docAInfo.size / 1024).toFixed(1)} KB</span> vs{' '}
                    <span>{(docBInfo.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setFileA(null);
                    setFileB(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Comparer d'autres documents
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
