import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  FileText,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { extractTextFromPdf } from '../../utils/pdfOperations';

interface AiToolProps {
  onUseSample: () => void;
  isGeneratingSample: boolean;
  sampleBuffer?: ArrayBuffer | null;
}

export const AiTool: React.FC<AiToolProps> = ({
  onUseSample,
  isGeneratingSample,
  sampleBuffer,
}) => {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [resultText, setResultText] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ai' | 'raw'>('ai');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (sampleBuffer && !buffer) {
      loadBuffer(sampleBuffer, 'document_exemple.pdf');
    }
  }, [sampleBuffer]);

  const loadBuffer = async (rawBuffer: ArrayBuffer, name: string) => {
    setBuffer(rawBuffer);
    setFileName(name);
    setIsExtracting(true);
    setResultText('');

    try {
      const { fullText, pageTexts: pages } = await extractTextFromPdf(rawBuffer);
      setExtractedText(fullText);
      setPageTexts(pages);

      // Trigger automatic executive summary on load
      generateSummary(fullText, 'executive');
    } catch (e) {
      console.error('Error extracting text from PDF:', e);
      alert('Impossible d’extraire le texte de ce fichier PDF.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buf = await f.arrayBuffer();
    loadBuffer(buf, f.name);
  };

  const generateSummary = async (
    textToAnalyze: string,
    mode: 'executive' | 'bullets' | 'dates' | 'custom',
    customQuery?: string
  ) => {
    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
      setResultText('Le document ne contient pas de texte extractible (il peut s’agir d’un document scanné sous forme d’image pure).');
      return;
    }

    setIsGenerating(true);

    let systemInstruction = `Tu es un expert analyste de documents professionnels et juridiques en français.
Fournis une réponse claire, structurée et soignée en Markdown (titres, puces, gras).`;

    let userPrompt = '';
    if (mode === 'executive') {
      userPrompt = `Analyse et résume ce document de manière synthétique et percutante.
Structure :
1. Objet principal du document
2. Points et constats majeurs
3. Conclusions ou actions recommandées

Document :
"""
${textToAnalyze.slice(0, 15000)}
"""`;
    } else if (mode === 'bullets') {
      userPrompt = `Extrais les 5 à 10 points clés fondamentaux de ce document sous forme de liste à puces claire et concise.

Document :
"""
${textToAnalyze.slice(0, 15000)}
"""`;
    } else if (mode === 'dates') {
      userPrompt = `Identifie et liste toutes les échéances, dates, montants financiers ou obligations contractuelles mentionnées dans le document suivant.

Document :
"""
${textToAnalyze.slice(0, 15000)}
"""`;
    } else if (mode === 'custom' && customQuery) {
      userPrompt = `Réponds à la question suivante en te basant exclusivement sur le contenu du document fourni.

Question : ${customQuery}

Document :
"""
${textToAnalyze.slice(0, 15000)}
"""`;
    }

    try {
      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToAnalyze,
          titleOrName: fileName || 'Document PDF',
          mediaType: 'pdf',
          mode,
          customQuestion: customQuery,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          setResultText(data.text);
          return;
        }
      }

      // Fallback: Smart local extractive summary when no API key is available
      const lines = textToAnalyze
        .split(/[.\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 25);

      const sampleLines = lines.slice(0, 6);
      const fallbackOutput = `### Analyse Documentaire Locale (Sans API Externe)

**Objet du document :** ${fileName} (${pageTexts.length} pages analysées)

**Extraits et points saillants relevés :**
${sampleLines.map((l) => `• ${l}.`).join('\n')}

---
*Note : Pour activer l'analyse approfondie avec Gemini 2.5 Flash, renseignez votre clé GEMINI_API_KEY.*`;

      setResultText(fallbackOutput);
    } catch (e: any) {
      console.warn('Gemini API call failed, falling back to local analysis:', e);
      // Smart fallback
      const lines = textToAnalyze
        .split(/[.\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 25);

      const sampleLines = lines.slice(0, 6);
      setResultText(`### Synthèse Extractive du Document (${fileName})

**Points principaux :**
${sampleLines.map((l) => `• ${l}.`).join('\n')}

*Total mots analysés : ${textToAnalyze.split(/\s+/).length} mots.*`);
    } finally {
      setIsGenerating(false);
    }
  };

  const wordCount = extractedText.split(/\s+/).filter(Boolean).length;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Assistant IA Document</h1>
            <p className="text-xs text-slate-500">
              Extraction de texte haute fidélité, résumés intelligents et réponses à vos questions sur le document.
            </p>
          </div>
        </div>
      </div>

      {!buffer ? (
        <DropZone
          onFilesSelected={handleFileSelect}
          multiple={false}
          title="Déposez le document PDF à analyser par l’IA"
          subtitle="Sélectionnez un document PDF"
          onUseSample={onUseSample}
          isGeneratingSample={isGeneratingSample}
        />
      ) : (
        <div className="space-y-6">
          {/* Top Info Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold text-slate-900">{fileName}</span>
                <span className="text-slate-400">·</span>
                <span className="text-xs font-mono text-slate-500">
                  {pageTexts.length} pages · {wordCount} mots
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isExtracting ? 'Extraction du texte en cours...' : 'Texte extrait et prêt pour analyse'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                    activeTab === 'ai' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Analyse IA
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('raw')}
                  className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                    activeTab === 'raw' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Texte brut extrait
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBuffer(null);
                  setExtractedText('');
                  setResultText('');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 ml-2"
              >
                Changer de fichier
              </button>
            </div>
          </div>

          {activeTab === 'ai' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Presets & Query Input (4 cols) */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Actions rapides
                </h3>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => generateSummary(extractedText, 'executive')}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all text-xs space-y-0.5 cursor-pointer disabled:opacity-50"
                  >
                    <p className="font-semibold text-slate-900">Résumé Exécutif</p>
                    <p className="text-[11px] text-slate-500">Synthèse claire de l’objet et conclusions</p>
                  </button>

                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => generateSummary(extractedText, 'bullets')}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all text-xs space-y-0.5 cursor-pointer disabled:opacity-50"
                  >
                    <p className="font-semibold text-slate-900">Points Clés & Décisions</p>
                    <p className="text-[11px] text-slate-500">Liste des faits majeurs sous forme de puces</p>
                  </button>

                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => generateSummary(extractedText, 'dates')}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all text-xs space-y-0.5 cursor-pointer disabled:opacity-50"
                  >
                    <p className="font-semibold text-slate-900">Dates, Montants & Délais</p>
                    <p className="text-[11px] text-slate-500">Obligations contractuelles et échéances</p>
                  </button>
                </div>

                {/* Custom Query Input */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-violet-600" />
                    Poser une question spécifique
                  </label>
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Ex: Quelles sont les conditions de résiliation mentionnées ?"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      type="button"
                      disabled={isGenerating || !customPrompt.trim()}
                      onClick={() => generateSummary(extractedText, 'custom', customPrompt)}
                      className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Interroger le document</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Output Area (8 cols) */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                    Résultat de l’analyse
                  </h3>

                  {resultText && (
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copié !' : 'Copier'}</span>
                    </button>
                  )}
                </div>

                <div className="min-h-[360px] max-h-[550px] overflow-auto p-4 bg-slate-50/70 border border-slate-200/80 rounded-lg">
                  {isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center py-16 space-y-3 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                      <p className="text-xs font-medium text-slate-600">
                        Analyse du texte et synthèse en cours...
                      </p>
                    </div>
                  ) : resultText ? (
                    <div className="prose prose-sm max-w-none text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {resultText}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-16 text-slate-400 text-xs">
                      Cliquez sur une action à gauche ou posez une question pour démarrer.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Raw Extracted Text View */
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-800">
                  Texte brut ({wordCount} mots, {extractedText.length} caractères)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(extractedText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copié !' : 'Copier tout le texte'}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={16}
                value={extractedText}
                className="w-full text-xs font-mono p-4 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
