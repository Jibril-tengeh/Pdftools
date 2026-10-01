import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Sparkles,
  Building2,
  User,
  Calendar,
  Hash,
  Plus,
  Trash2,
  Upload,
  Palette,
  CheckCircle2,
  FileCheck,
  FileSpreadsheet,
  Award,
  ScrollText,
  Mail,
  Sliders,
  Eye,
  PenTool,
  RotateCcw,
  Copy,
  FolderArchive,
  Layers,
  ChevronDown,
  FilePlus2,
  Grid3X3,
  AlignLeft,
  QrCode,
  Stamp,
  BadgeAlert,
  List,
  Minus,
  ArrowUp,
  ArrowDown,
  Info,
  Maximize2,
  Check,
  Settings2,
  Shield,
  FileCode,
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import QRCode from 'qrcode';
import { addRecentFile } from '../../utils/recentFiles';
import { safePdfText } from '../../utils/pdfOperations';

export type TemplateType = 'blank' | 'invoice' | 'report' | 'contract' | 'certificate' | 'letter';

export type PaperPattern = 'plain' | 'lined' | 'grid' | 'dots';

export type PageSizeOption = 'A4' | 'LETTER' | 'A3' | 'A5';

export type MarginOption = 'normal' | 'compact' | 'wide' | 'none';

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'table'
  | 'callout'
  | 'bullet-list'
  | 'separator'
  | 'qrcode'
  | 'stamp'
  | 'signature';

export interface DocumentBlock {
  id: string;
  type: BlockType;
  title?: string;
  content?: string;
  imageUrl?: string;
  imageWidth?: number; // in pt
  imageAlign?: 'left' | 'center' | 'right';
  calloutType?: 'info' | 'success' | 'warning' | 'alert';
  calloutTitle?: string;
  listItems?: string[];
  tableHeaders?: string[];
  tableRows?: string[][];
  qrText?: string;
  qrSize?: number;
  qrCaption?: string;
  stampText?: string;
  stampSubtext?: string;
  stampColor?: string;
  separatorStyle?: 'solid' | 'dashed' | 'double';
  pageNumber?: number; // 1-indexed
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // percentage (e.g. 20)
}

export interface KpiItem {
  id: string;
  label: string;
  value: string;
  trend?: string;
}

export interface SectionItem {
  id: string;
  title: string;
  content: string;
}

export interface PdfCreatorData {
  template: TemplateType;

  // Page Setup & Geometry
  pageSize: PageSizeOption;
  orientation: 'portrait' | 'landscape';
  marginSize: MarginOption;
  pageCount: number; // Multi-pages
  paperPattern: PaperPattern;
  paperColor: 'white' | 'ivory' | 'slate';

  // Visual Theme & Fonts
  primaryColor: string; // HEX
  secondaryColor: string; // HEX
  fontFamily: 'helvetica' | 'times' | 'courier';
  headerAccentBar: boolean;

  // Advanced Watermark
  showWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number; // 0.05 to 0.5
  watermarkAngle: number; // -45, 0, 35, 45

  // Official Stamp / Cachet
  showOfficialStamp: boolean;
  stampText: string;
  stampDate: string;
  stampCompany: string;
  stampColor: string;

  // Pagination & Headers/Footers
  showPageNumbers: boolean;
  pageNumberFormat: 'page_x_of_y' | 'x_slash_y' | 'dash_x_dash' | 'page_x';
  pageNumberPosition: 'bottom_right' | 'bottom_center' | 'top_right';
  hideHeaderOnFirstPage: boolean;
  footerNote: string;

  // Header & Issuer Info
  logoUrl: string | null;
  issuerName: string;
  issuerSubtitle: string;
  issuerAddress: string;
  issuerEmail: string;
  issuerPhone: string;
  issuerTaxId: string; // SIRET / N° TVA

  // Recipient / Client
  recipientName: string;
  recipientCompany: string;
  recipientAddress: string;
  recipientEmail: string;

  // Document Metadata
  docTitle: string;
  docReference: string;
  docDate: string;
  docDueDate: string;
  statusBadge: string;

  // Embedded QR Code
  showDocQrCode: boolean;
  docQrText: string;
  docQrCaption: string;

  // PDF Document Properties (Metadata)
  pdfAuthor: string;
  pdfSubject: string;
  pdfKeywords: string;

  // Invoice Specifics
  currency: string;
  items: InvoiceItem[];
  discountPercent: number;
  paymentTerms: string;
  bankDetails: string;

  // Report Specifics
  executiveSummary: string;
  kpis: KpiItem[];
  sections: SectionItem[];

  // Certificate Specifics
  recipientTitle: string;
  certificateReason: string;
  certificateAuthority: string;

  // Signature
  signatoryName: string;
  signatoryTitle: string;
  signatureImage: string | null;
  includeDateInSignature: boolean;

  // Blank Sheet Modular Blocks
  blankBlocks: DocumentBlock[];
}

const DEFAULT_INVOICE_ITEMS: InvoiceItem[] = [
  { id: '1', description: 'Développement d’application web sur-mesure (Phase 1)', quantity: 1, unitPrice: 2400, taxRate: 20 },
  { id: '2', description: 'Intégration d’API & Design UI responsive', quantity: 2, unitPrice: 650, taxRate: 20 },
  { id: '3', description: 'Maintenance applicative & Hébergement cloud sécurisé', quantity: 1, unitPrice: 350, taxRate: 20 },
];

const DEFAULT_KPIS: KpiItem[] = [
  { id: '1', label: 'Chiffre d’affaires Q3', value: '148 500 €', trend: '+18.4%' },
  { id: '2', label: 'Taux de satisfaction', value: '98.2%', trend: '+4.1%' },
  { id: '3', label: 'Projets livrés à temps', value: '100%', trend: 'Objectif atteint' },
];

const DEFAULT_SECTIONS: SectionItem[] = [
  {
    id: '1',
    title: '1. Contexte & Enjeux Stratégiques',
    content: 'Ce rapport détaille les performances opérationnelles et les indicateurs clés de succès atteints au cours de la période. L’accent a été mis sur la sécurisation des processus et la réduction des délais d’exécution.',
  },
  {
    id: '2',
    title: '2. Bilan des Réalisations Opérationnelles',
    content: 'Les principaux objectifs fixés lors du comité de pilotage précédent ont été menés à bien dans le respect strict des budgets alloués et des normes de qualité en vigueur.',
  },
  {
    id: '3',
    title: '3. Recommandations & Perspectives',
    content: 'Pour le trimestre suivant, nous préconisons l’accélération de l’automatisation des tâches récurrentes et le déploiement continu des mises à niveau d’infrastructure.',
  },
];

const INITIAL_BLANK_BLOCKS: DocumentBlock[] = [
  {
    id: 'b-1',
    type: 'heading',
    title: 'TITRE DU DOCUMENT LIBRE',
    content: 'Sous-titre ou description du document personnalisable',
  },
  {
    id: 'b-2',
    type: 'paragraph',
    content: 'Vous pouvez concevoir librement votre page blanche en ajoutant des paragraphes, des tableaux, des listes, des encadrés d’alerte, des QR codes ou des signatures. Modifiez, réorganisez ou supprimez les blocs à tout moment.',
  },
  {
    id: 'b-3',
    type: 'callout',
    calloutType: 'info',
    calloutTitle: 'Information Importante',
    content: 'Cette feuille vierge vous permet de composer n’importe quel type de mise en page, d’ajouter un fond quadrillé ou ligné, et d’exporter un PDF vectoriel haute définition.',
  },
  {
    id: 'b-4',
    type: 'bullet-list',
    listItems: [
      'Document entièrement personnalisable de A à Z',
      'Support multi-pages avec pagination automatique',
      'Intégration de QR code vectoriel et tampons certifiés',
      'Impression directe ou export haute fidélité',
    ],
  },
];

export const PdfCreatorTool: React.FC = () => {
  const [data, setData] = useState<PdfCreatorData>({
    template: 'blank', // Blank sheet as a first-class citizen!

    // Page Geometry
    pageSize: 'A4',
    orientation: 'portrait',
    marginSize: 'normal',
    pageCount: 1,
    paperPattern: 'plain',
    paperColor: 'white',

    // Theme
    primaryColor: '#1E3A8A', // Deep corporate blue
    secondaryColor: '#3B82F6',
    fontFamily: 'helvetica',
    headerAccentBar: true,

    // Watermark
    showWatermark: false,
    watermarkText: 'CONFIDENTIEL',
    watermarkOpacity: 0.15,
    watermarkAngle: 35,

    // Stamp
    showOfficialStamp: false,
    stampText: 'VALIDÉ & CERTIFIÉ',
    stampDate: new Date().toLocaleDateString('fr-FR'),
    stampCompany: 'DIRECTION GÉNÉRALE',
    stampColor: '#DC2626',

    // Pagination
    showPageNumbers: true,
    pageNumberFormat: 'page_x_of_y',
    pageNumberPosition: 'bottom_right',
    hideHeaderOnFirstPage: false,
    footerNote: 'Document professionnel certifié · Reproduction interdite sans autorisation',

    // Header & Issuer
    logoUrl: null,
    issuerName: 'CABINET DIGITAL & SOLUTIONS',
    issuerSubtitle: 'Conseil en ingénierie logicielle & transformation numérique',
    issuerAddress: '15 Boulevard Haussmann, 75009 Paris',
    issuerEmail: 'contact@cabinetdigital.fr',
    issuerPhone: '+33 1 42 68 00 00',
    issuerTaxId: 'SIRET: 842 910 456 00012 · TVA: FR 34 842910456',

    // Recipient
    recipientName: 'M. Thomas Bernard',
    recipientCompany: 'INNOVATION GROUP SAS',
    recipientAddress: '42 Avenue des Champs-Élysées, 75008 Paris',
    recipientEmail: 't.bernard@innovationgroup.com',

    // Meta
    docTitle: 'DOCUMENT DE TRAVAIL VIERGE',
    docReference: `DOC-${new Date().getFullYear()}-001`,
    docDate: new Date().toISOString().split('T')[0],
    docDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    statusBadge: 'BROUILLON',

    // QR Code
    showDocQrCode: false,
    docQrText: 'https://example.com/document/verify',
    docQrCaption: 'Scanner pour vérifier l’authenticité',

    // PDF Properties
    pdfAuthor: 'Service Administratif',
    pdfSubject: 'Document professionnel',
    pdfKeywords: 'PDF, Professionnel, Document, Certifié',

    // Invoice Specifics
    currency: '€',
    items: DEFAULT_INVOICE_ITEMS,
    discountPercent: 0,
    paymentTerms: 'Règlement par virement bancaire sous 30 jours à réception.',
    bankDetails: 'IBAN: FR76 3000 4000 0112 3456 7890 123 · BIC: BNPAFRPP',

    // Report Specifics
    executiveSummary: 'Synthèse des performances trimestrielles démontrant une croissance de 18% du chiffre d’affaires et une efficience accrue sur l’ensemble des pôles opérationnels.',
    kpis: DEFAULT_KPIS,
    sections: DEFAULT_SECTIONS,

    // Certificate Specifics
    recipientTitle: 'Attestation décernée avec félicitations à :',
    certificateReason: 'Pour avoir complété avec succès le programme d’excellence professionnelle et démontré une maîtrise avancée des architectures numériques modernes.',
    certificateAuthority: 'Direction Générale des Certifications Professionnelles',

    // Signature
    signatoryName: 'Alexandre de Montmirail',
    signatoryTitle: 'Directeur Associé & Responsable Administratif',
    signatureImage: null,
    includeDateInSignature: true,

    // Blank Modular Blocks
    blankBlocks: INITIAL_BLANK_BLOCKS,
  });

  const [activeTab, setActiveTab] = useState<'content' | 'blocks' | 'issuer' | 'advanced'>('content');
  const [activePreviewPage, setActivePreviewPage] = useState<number>(1);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [signatureCanvasActive, setSignatureCanvasActive] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const blockImageInputRef = useRef<HTMLInputElement>(null);
  const targetBlockIdForImage = useRef<string | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

  // Template Switch Presets
  const handleSelectTemplate = (tmpl: TemplateType) => {
    if (tmpl === 'blank') {
      setData((prev) => ({
        ...prev,
        template: 'blank',
        docTitle: 'DOCUMENT DE TRAVAIL VIERGE',
        docReference: `DOC-${new Date().getFullYear()}-001`,
        statusBadge: 'PAGE VIERGE',
        orientation: 'portrait',
        paperPattern: 'plain',
      }));
    } else if (tmpl === 'invoice') {
      setData((prev) => ({
        ...prev,
        template: 'invoice',
        docTitle: 'FACTURE PROFESSIONNELLE',
        docReference: `FAC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        statusBadge: 'PAYABLE À 30 JOURS',
        orientation: 'portrait',
        paperPattern: 'plain',
      }));
    } else if (tmpl === 'report') {
      setData((prev) => ({
        ...prev,
        template: 'report',
        docTitle: 'RAPPORT D’ACTIVITÉ EXÉCUTIF',
        docReference: `RAP-${new Date().getFullYear()}-Q3`,
        statusBadge: 'DOCUMENT CONFIDENTIEL',
        orientation: 'portrait',
        paperPattern: 'plain',
      }));
    } else if (tmpl === 'contract') {
      setData((prev) => ({
        ...prev,
        template: 'contract',
        docTitle: 'ACCORD DE PRESTATION DE SERVICES',
        docReference: `CTR-${new Date().getFullYear()}-042`,
        statusBadge: 'CONTRAT FERME',
        orientation: 'portrait',
        paperPattern: 'plain',
      }));
    } else if (tmpl === 'certificate') {
      setData((prev) => ({
        ...prev,
        template: 'certificate',
        docTitle: 'CERTIFICAT D’ACCOMPLISSEMENT',
        docReference: `CERT-${new Date().getFullYear()}-9901`,
        statusBadge: 'CERTIFICATION VÉRIFIÉE',
        orientation: 'landscape',
        primaryColor: '#854D0E',
        paperPattern: 'plain',
      }));
    } else if (tmpl === 'letter') {
      setData((prev) => ({
        ...prev,
        template: 'letter',
        docTitle: 'LETTRE OFFICIELLE DE MISSION',
        docReference: `LET-${new Date().getFullYear()}-015`,
        statusBadge: 'COURRIER OFFICIEL',
        orientation: 'portrait',
        paperPattern: 'plain',
      }));
    }
  };

  // Generate QR code data URL whenever docQrText changes
  useEffect(() => {
    if (data.showDocQrCode && data.docQrText) {
      QRCode.toDataURL(data.docQrText, { width: 180, margin: 1 })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(null));
    } else {
      setQrCodeDataUrl(null);
    }
  }, [data.showDocQrCode, data.docQrText]);

  // Color Palettes
  const COLOR_PALETTES = [
    { label: 'Bleu Corporate', color: '#1E3A8A' },
    { label: 'Bleu Océan', color: '#0284C7' },
    { label: 'Émeraude FinTech', color: '#065F46' },
    { label: 'Bordeaux Exécutif', color: '#881337' },
    { label: 'Violet Moderne', color: '#4F46E5' },
    { label: 'Ardoise / Noir Pro', color: '#0F172A' },
    { label: 'Ambre / Or Noble', color: '#854D0E' },
  ];

  // Calculations for Invoice
  const subtotalHT = useMemo(() => {
    return data.items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
  }, [data.items]);

  const discountAmount = useMemo(() => {
    return (subtotalHT * (data.discountPercent || 0)) / 100;
  }, [subtotalHT, data.discountPercent]);

  const discountedHT = useMemo(() => {
    return Math.max(0, subtotalHT - discountAmount);
  }, [subtotalHT, discountAmount]);

  const taxAmount = useMemo(() => {
    return data.items.reduce((acc, it) => {
      const lineHT = it.quantity * it.unitPrice;
      const factor = (100 - (data.discountPercent || 0)) / 100;
      return acc + lineHT * factor * (it.taxRate / 100);
    }, 0);
  }, [data.items, data.discountPercent]);

  const totalTTC = useMemo(() => {
    return discountedHT + taxAmount;
  }, [discountedHT, taxAmount]);

  // --- BLANK MODULAR BLOCKS ACTIONS ---
  const handleAddBlock = (type: BlockType) => {
    const newId = `blk-${Date.now()}`;
    let newBlock: DocumentBlock = { id: newId, type };

    if (type === 'heading') {
      newBlock = { ...newBlock, title: 'Nouveau Titre de Section', content: 'Sous-titre explicatif...' };
    } else if (type === 'paragraph') {
      newBlock = { ...newBlock, content: 'Saisissez votre paragraphe de texte libre avec les détails, consignes ou arguments de votre document...' };
    } else if (type === 'callout') {
      newBlock = { ...newBlock, calloutType: 'info', calloutTitle: 'Note d’information', content: 'Contenu du message mis en exergue avec cadre et couleur thématique.' };
    } else if (type === 'bullet-list') {
      newBlock = { ...newBlock, listItems: ['Premier point essentiel', 'Deuxième recommandation pratique', 'Troisième élément de suivi'] };
    } else if (type === 'separator') {
      newBlock = { ...newBlock, separatorStyle: 'solid' };
    } else if (type === 'qrcode') {
      newBlock = { ...newBlock, qrText: 'https://example.com', qrSize: 90, qrCaption: 'Scanner avec un smartphone' };
    } else if (type === 'stamp') {
      newBlock = { ...newBlock, stampText: 'APPROUVÉ & CERTIFIÉ', stampSubtext: 'LE ' + new Date().toLocaleDateString('fr-FR'), stampColor: '#DC2626' };
    } else if (type === 'table') {
      newBlock = {
        ...newBlock,
        tableHeaders: ['Désignation', 'Référence', 'Quantité', 'Statut'],
        tableRows: [
          ['Module Alpha', 'REF-01', '10', 'Conforme'],
          ['Module Bêta', 'REF-02', '5', 'En cours'],
          ['Module Gamma', 'REF-03', '25', 'Validé'],
        ],
      };
    } else if (type === 'image') {
      newBlock = { ...newBlock, imageWidth: 200, imageAlign: 'center' };
    } else if (type === 'signature') {
      newBlock = { ...newBlock, title: 'Signature & Accord', content: 'Fait pour valoir ce que de droit.' };
    }

    setData((prev) => ({ ...prev, blankBlocks: [...prev.blankBlocks, newBlock] }));
  };

  const handleUpdateBlock = (id: string, updates: Partial<DocumentBlock>) => {
    setData((prev) => ({
      ...prev,
      blankBlocks: prev.blankBlocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  };

  const handleDeleteBlock = (id: string) => {
    setData((prev) => ({
      ...prev,
      blankBlocks: prev.blankBlocks.filter((b) => b.id !== id),
    }));
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= data.blankBlocks.length) return;
    const copy = [...data.blankBlocks];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    setData((prev) => ({ ...prev, blankBlocks: copy }));
  };

  // Upload image into block
  const handleUploadBlockImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetBlockIdForImage.current) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleUpdateBlock(targetBlockIdForImage.current!, { imageUrl: reader.result as string });
      targetBlockIdForImage.current = null;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Signature canvas
  useEffect(() => {
    if (signatureCanvasActive && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let drawing = false;
      const startDraw = (e: MouseEvent | TouchEvent) => {
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
      };
      const draw = (e: MouseEvent | TouchEvent) => {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
      };
      const stopDraw = () => {
        drawing = false;
      };

      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', draw);
      window.addEventListener('mouseup', stopDraw);
      canvas.addEventListener('touchstart', startDraw);
      canvas.addEventListener('touchmove', draw);
      window.addEventListener('touchend', stopDraw);

      return () => {
        canvas.removeEventListener('mousedown', startDraw);
        canvas.removeEventListener('mousemove', draw);
        window.removeEventListener('mouseup', stopDraw);
        canvas.removeEventListener('touchstart', startDraw);
        canvas.removeEventListener('touchmove', draw);
        window.removeEventListener('touchend', stopDraw);
      };
    }
  }, [signatureCanvasActive]);

  const handleSaveDrawnSignature = () => {
    if (signatureCanvasRef.current) {
      const dataUrl = signatureCanvasRef.current.toDataURL('image/png');
      setData((prev) => ({ ...prev, signatureImage: dataUrl }));
      setSignatureCanvasActive(false);
    }
  };

  const handleClearSignatureCanvas = () => {
    if (signatureCanvasRef.current) {
      const ctx = signatureCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
    }
  };

  // Convert Hex to pdf-lib rgb
  const hexToPdfRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return rgb(isNaN(r) ? 0.1 : r, isNaN(g) ? 0.2 : g, isNaN(b) ? 0.5 : b);
  };

  // --- FULL VECTOR PDF-LIB EXPORT ENGINE (ADVANCED) ---
  const handleGeneratePdf = async (shouldPrint: boolean = false) => {
    setIsExporting(true);
    try {
      const pdfDoc = await PDFDocument.create();

      // Determine dimensions
      let baseW = 595.28; // A4 default
      let baseH = 841.89;

      if (data.pageSize === 'LETTER') {
        baseW = 612;
        baseH = 792;
      } else if (data.pageSize === 'A3') {
        baseW = 841.89;
        baseH = 1190.55;
      } else if (data.pageSize === 'A5') {
        baseW = 419.53;
        baseH = 595.28;
      }

      const isLandscape = data.orientation === 'landscape';
      const pageWidth = isLandscape ? baseH : baseW;
      const pageHeight = isLandscape ? baseW : baseH;

      // Margins
      let marginX = 42;
      let marginY = 40;
      if (data.marginSize === 'compact') {
        marginX = 24;
        marginY = 24;
      } else if (data.marginSize === 'wide') {
        marginX = 64;
        marginY = 54;
      } else if (data.marginSize === 'none') {
        marginX = 16;
        marginY = 16;
      }

      const contentWidth = pageWidth - marginX * 2;

      // Fonts
      const font = await pdfDoc.embedFont(
        data.fontFamily === 'times'
          ? StandardFonts.TimesRoman
          : data.fontFamily === 'courier'
          ? StandardFonts.Courier
          : StandardFonts.Helvetica
      );
      const fontBold = await pdfDoc.embedFont(
        data.fontFamily === 'times'
          ? StandardFonts.TimesRomanBold
          : data.fontFamily === 'courier'
          ? StandardFonts.CourierBold
          : StandardFonts.HelveticaBold
      );

      // Set Document Metadata with safe sanitization
      pdfDoc.setTitle(safePdfText(font, data.docTitle || 'Document Professionnel'));
      pdfDoc.setAuthor(safePdfText(font, data.pdfAuthor || data.issuerName || 'PDF Tools'));
      pdfDoc.setSubject(safePdfText(font, data.pdfSubject || 'Document certifié'));
      pdfDoc.setKeywords([safePdfText(font, data.pdfKeywords || 'PDF, Pro')]);
      pdfDoc.setProducer('PDF Tools Studio');

      const primaryRgb = hexToPdfRgb(data.primaryColor);
      const slateDark = rgb(0.06, 0.09, 0.16);
      const slateGray = rgb(0.39, 0.45, 0.55);
      const white = rgb(1, 1, 1);
      const lightBg = rgb(0.96, 0.97, 0.98);

      // Embed Logo
      let logoImage: any = null;
      if (data.logoUrl) {
        try {
          const bytes = Uint8Array.from(atob(data.logoUrl.split(',')[1]), (c) => c.charCodeAt(0));
          logoImage = data.logoUrl.startsWith('data:image/png')
            ? await pdfDoc.embedPng(bytes)
            : await pdfDoc.embedJpg(bytes);
        } catch (e) {
          console.warn('Logo embed error:', e);
        }
      }

      // Embed QR Code
      let qrImage: any = null;
      if (qrCodeDataUrl) {
        try {
          const bytes = Uint8Array.from(atob(qrCodeDataUrl.split(',')[1]), (c) => c.charCodeAt(0));
          qrImage = await pdfDoc.embedPng(bytes);
        } catch (e) {
          console.warn('QR code embed error:', e);
        }
      }

      // Embed Signature
      let sigImage: any = null;
      if (data.signatureImage) {
        try {
          const bytes = Uint8Array.from(atob(data.signatureImage.split(',')[1]), (c) => c.charCodeAt(0));
          sigImage = await pdfDoc.embedPng(bytes);
        } catch (e) {
          console.warn('Signature embed error:', e);
        }
      }

      // MULTI-PAGES GENERATION LOOP
      const totalPagesToGenerate = Math.max(1, data.pageCount || 1);

      for (let pIdx = 1; pIdx <= totalPagesToGenerate; pIdx++) {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        const drawText = (
          rawText: string | null | undefined,
          opts: {
            x: number;
            y: number;
            size: number;
            font?: any;
            color?: any;
            rotate?: any;
            opacity?: number;
          }
        ) => {
          try {
            const usedFont = opts.font || font;
            const clean = safePdfText(usedFont, rawText);
            if (!clean || !clean.trim()) return;
            page.drawText(clean, { ...opts, font: usedFont });
          } catch (err) {
            console.warn('drawText prevented unencodable character error:', err);
          }
        };

        const textWidth = (f: any, rawText: string | null | undefined, size: number) => {
          try {
            const usedFont = f || font;
            const clean = safePdfText(usedFont, rawText);
            if (!clean) return 0;
            return usedFont.widthOfTextAtSize(clean, size);
          } catch {
            return (rawText?.length || 0) * (size * 0.5);
          }
        };

        // Background color
        if (data.paperColor === 'ivory') {
          page.drawRectangle({
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
            color: rgb(0.99, 0.98, 0.97),
          });
        } else if (data.paperColor === 'slate') {
          page.drawRectangle({
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
            color: rgb(0.97, 0.98, 0.99),
          });
        }

        // Draw Paper Pattern (Grid, Lined, Dots)
        if (data.paperPattern === 'lined') {
          for (let y = marginY + 20; y < pageHeight - marginY - 20; y += 22) {
            page.drawLine({
              start: { x: marginX, y },
              end: { x: pageWidth - marginX, y },
              thickness: 0.5,
              color: rgb(0.91, 0.93, 0.95),
            });
          }
        } else if (data.paperPattern === 'grid') {
          for (let y = marginY; y < pageHeight - marginY; y += 18) {
            page.drawLine({
              start: { x: marginX, y },
              end: { x: pageWidth - marginX, y },
              thickness: 0.35,
              color: rgb(0.92, 0.94, 0.96),
            });
          }
          for (let x = marginX; x < pageWidth - marginX; x += 18) {
            page.drawLine({
              start: { x, y: marginY },
              end: { x, y: pageHeight - marginY },
              thickness: 0.35,
              color: rgb(0.92, 0.94, 0.96),
            });
          }
        } else if (data.paperPattern === 'dots') {
          for (let y = marginY + 10; y < pageHeight - marginY; y += 18) {
            for (let x = marginX + 10; x < pageWidth - marginX; x += 18) {
              page.drawRectangle({
                x,
                y,
                width: 1,
                height: 1,
                color: rgb(0.85, 0.88, 0.91),
              });
            }
          }
        }

        // Top Accent Bar
        if (data.headerAccentBar && (pIdx === 1 || !data.hideHeaderOnFirstPage)) {
          page.drawRectangle({
            x: 0,
            y: pageHeight - 8,
            width: pageWidth,
            height: 8,
            color: primaryRgb,
          });
        }

        // Watermark
        if (data.showWatermark && data.watermarkText) {
          drawText(data.watermarkText, {
            x: pageWidth / 2 - 160,
            y: pageHeight / 2 - 20,
            size: 40,
            font: fontBold,
            color: rgb(0.85, 0.88, 0.92),
            rotate: degrees(data.watermarkAngle || 35),
            opacity: data.watermarkOpacity || 0.15,
          });
        }

        let cursorY = pageHeight - marginY - 10;

        // Header on Page 1 or non-hidden pages
        if (pIdx === 1 || !data.hideHeaderOnFirstPage) {
          if (logoImage) {
            const logoDims = logoImage.scaleToFit(110, 45);
            page.drawImage(logoImage, {
              x: marginX,
              y: cursorY - logoDims.height + 15,
              width: logoDims.width,
              height: logoDims.height,
            });
          }

          const issuerStartX = logoImage ? marginX + 125 : marginX;
          drawText(data.issuerName || 'ENTREPRISE', {
            x: issuerStartX,
            y: cursorY + 4,
            size: 12,
            font: fontBold,
            color: primaryRgb,
          });

          if (data.issuerSubtitle) {
            drawText(data.issuerSubtitle.slice(0, 65), {
              x: issuerStartX,
              y: cursorY - 8,
              size: 8,
              font: font,
              color: slateGray,
            });
          }

          // Document title on top right
          const titleWidth = textWidth(fontBold, data.docTitle, 14);
          drawText(data.docTitle, {
            x: pageWidth - marginX - titleWidth,
            y: cursorY + 4,
            size: 14,
            font: fontBold,
            color: slateDark,
          });

          const refText = `Réf : ${data.docReference}`;
          const refW = textWidth(font, refText, 8.5);
          drawText(refText, {
            x: pageWidth - marginX - refW,
            y: cursorY - 9,
            size: 8.5,
            font: font,
            color: slateGray,
          });

          cursorY -= 48;

          // Header separator line
          page.drawLine({
            start: { x: marginX, y: cursorY },
            end: { x: pageWidth - marginX, y: cursorY },
            thickness: 0.8,
            color: rgb(0.88, 0.9, 0.94),
          });

          cursorY -= 20;
        }

        // CONTENT: BLANK SHEET MODULAR BLOCKS OR SPECIFIC TEMPLATE
        if (data.template === 'blank') {
          // Render each modular block
          for (const block of data.blankBlocks) {
            if (cursorY < marginY + 80) break; // stay within page boundaries

            if (block.type === 'heading') {
              drawText(block.title || '', {
                x: marginX,
                y: cursorY,
                size: 14,
                font: fontBold,
                color: primaryRgb,
              });
              cursorY -= 15;
              if (block.content) {
                drawText(block.content.slice(0, 100), {
                  x: marginX,
                  y: cursorY,
                  size: 9,
                  font: font,
                  color: slateGray,
                });
                cursorY -= 18;
              }
            } else if (block.type === 'paragraph') {
              const textContent = block.content || '';
              const paragraphs = textContent.split(/\r?\n/);
              for (const para of paragraphs) {
                if (cursorY < marginY + 40) break;
                if (!para.trim()) {
                  cursorY -= 8;
                  continue;
                }
                const lines = para.match(/.{1,90}(\s|$)/g) || [para];
                for (const line of lines) {
                  if (cursorY < marginY + 40) break;
                  drawText(line.trim(), {
                    x: marginX,
                    y: cursorY,
                    size: 9,
                    font: font,
                    color: slateDark,
                  });
                  cursorY -= 13;
                }
                cursorY -= 4;
              }
              cursorY -= 4;
            } else if (block.type === 'callout') {
              const callH = 45;
              page.drawRectangle({
                x: marginX,
                y: cursorY - callH + 8,
                width: contentWidth,
                height: callH,
                color: rgb(0.96, 0.98, 1),
                borderColor: primaryRgb,
                borderWidth: 1,
              });
              drawText(block.calloutTitle || 'Note importante', {
                x: marginX + 12,
                y: cursorY - 4,
                size: 8.5,
                font: fontBold,
                color: primaryRgb,
              });
              drawText((block.content || '').slice(0, 180), {
                x: marginX + 12,
                y: cursorY - 20,
                size: 8,
                font: font,
                color: slateDark,
              });
              cursorY -= callH + 12;
            } else if (block.type === 'bullet-list') {
              if (block.listItems) {
                for (const item of block.listItems) {
                  page.drawCircle({
                    x: marginX + 6,
                    y: cursorY + 3,
                    size: 2,
                    color: primaryRgb,
                  });
                  drawText(item.slice(0, 85), {
                    x: marginX + 16,
                    y: cursorY,
                    size: 8.5,
                    font: font,
                    color: slateDark,
                  });
                  cursorY -= 15;
                }
              }
              cursorY -= 6;
            } else if (block.type === 'separator') {
              page.drawLine({
                start: { x: marginX, y: cursorY },
                end: { x: pageWidth - marginX, y: cursorY },
                thickness: 1,
                color: rgb(0.85, 0.88, 0.92),
              });
              cursorY -= 16;
            } else if (block.type === 'stamp') {
              // Circular or Box Stamp
              const stampW = 160;
              const stampH = 45;
              page.drawRectangle({
                x: marginX,
                y: cursorY - stampH + 10,
                width: stampW,
                height: stampH,
                borderColor: rgb(0.86, 0.15, 0.15),
                borderWidth: 2,
              });
              drawText(block.stampText || 'VALIDÉ', {
                x: marginX + 12,
                y: cursorY - 6,
                size: 10,
                font: fontBold,
                color: rgb(0.86, 0.15, 0.15),
              });
              if (block.stampSubtext) {
                drawText(block.stampSubtext, {
                  x: marginX + 12,
                  y: cursorY - 22,
                  size: 7.5,
                  font: fontBold,
                  color: rgb(0.86, 0.15, 0.15),
                });
              }
              cursorY -= stampH + 14;
            } else if (block.type === 'qrcode' && qrImage) {
              page.drawImage(qrImage, {
                x: marginX,
                y: cursorY - 65,
                width: 65,
                height: 65,
              });
              drawText(block.qrCaption || 'Vérification numérique', {
                x: marginX + 75,
                y: cursorY - 30,
                size: 8,
                font: fontBold,
                color: slateDark,
              });
              cursorY -= 80;
            } else if (block.type === 'table' && block.tableHeaders && block.tableRows) {
              const colW = contentWidth / block.tableHeaders.length;
              // Header
              page.drawRectangle({
                x: marginX,
                y: cursorY - 4,
                width: contentWidth,
                height: 18,
                color: primaryRgb,
              });
              block.tableHeaders.forEach((th, cIdx) => {
                drawText(th, {
                  x: marginX + cIdx * colW + 6,
                  y: cursorY,
                  size: 7.5,
                  font: fontBold,
                  color: white,
                });
              });
              cursorY -= 20;

              // Rows
              block.tableRows.forEach((row, rIdx) => {
                if (rIdx % 2 === 0) {
                  page.drawRectangle({
                    x: marginX,
                    y: cursorY - 3,
                    width: contentWidth,
                    height: 16,
                    color: rgb(0.97, 0.98, 0.99),
                  });
                }
                row.forEach((cell, cIdx) => {
                  drawText(cell.slice(0, 25), {
                    x: marginX + cIdx * colW + 6,
                    y: cursorY,
                    size: 8,
                    font: font,
                    color: slateDark,
                  });
                });
                cursorY -= 17;
              });
              cursorY -= 10;
            }
          }
        } else if (data.template === 'invoice') {
          // INVOICE PRESET RENDERING
          const colDescX = marginX + 10;
          const colQtyX = marginX + contentWidth * 0.58;
          const colPriceX = marginX + contentWidth * 0.72;
          const colTotalX = marginX + contentWidth * 0.88;

          page.drawRectangle({
            x: marginX,
            y: cursorY - 6,
            width: contentWidth,
            height: 22,
            color: primaryRgb,
          });

          drawText('DÉSIGNATION / PRESTATION', { x: colDescX, y: cursorY, size: 8, font: fontBold, color: white });
          drawText('QTÉ', { x: colQtyX, y: cursorY, size: 8, font: fontBold, color: white });
          drawText('P.U. HT', { x: colPriceX, y: cursorY, size: 8, font: fontBold, color: white });
          drawText('TOTAL HT', { x: colTotalX, y: cursorY, size: 8, font: fontBold, color: white });

          cursorY -= 24;

          data.items.forEach((item, idx) => {
            const rowH = 22;
            if (idx % 2 === 0) {
              page.drawRectangle({
                x: marginX,
                y: cursorY - 4,
                width: contentWidth,
                height: rowH,
                color: rgb(0.98, 0.98, 0.99),
              });
            }
            drawText(item.description.slice(0, 52), { x: colDescX, y: cursorY + 2, size: 8.5, font, color: slateDark });
            drawText(item.quantity.toString(), { x: colQtyX + 5, y: cursorY + 2, size: 8.5, font, color: slateDark });
            drawText(`${item.unitPrice.toFixed(2)} ${data.currency}`, { x: colPriceX - 4, y: cursorY + 2, size: 8.5, font, color: slateDark });
            drawText(`${(item.quantity * item.unitPrice).toFixed(2)} ${data.currency}`, { x: colTotalX - 4, y: cursorY + 2, size: 8.5, font: fontBold, color: slateDark });
            cursorY -= rowH;
          });

          cursorY -= 15;
          const totBoxW = 200;
          const totBoxX = pageWidth - marginX - totBoxW;

          page.drawRectangle({
            x: totBoxX,
            y: cursorY - 60,
            width: totBoxW,
            height: 68,
            color: lightBg,
            borderColor: rgb(0.85, 0.88, 0.92),
            borderWidth: 1,
          });

          drawText('Sous-total HT :', { x: totBoxX + 12, y: cursorY - 5, size: 8.5, font, color: slateGray });
          drawText(`${subtotalHT.toFixed(2)} ${data.currency}`, { x: totBoxX + totBoxW - 85, y: cursorY - 5, size: 8.5, font: fontBold, color: slateDark });
          drawText('Total TVA :', { x: totBoxX + 12, y: cursorY - 20, size: 8.5, font, color: slateGray });
          drawText(`${taxAmount.toFixed(2)} ${data.currency}`, { x: totBoxX + totBoxW - 85, y: cursorY - 20, size: 8.5, font, color: slateDark });

          page.drawRectangle({ x: totBoxX, y: cursorY - 60, width: totBoxW, height: 28, color: primaryRgb });
          drawText('NET À PAYER TTC :', { x: totBoxX + 12, y: cursorY - 48, size: 9, font: fontBold, color: white });
          drawText(`${totalTTC.toFixed(2)} ${data.currency}`, { x: totBoxX + totBoxW - 90, y: cursorY - 48, size: 11, font: fontBold, color: white });
        } else if (data.template === 'report') {
          // EXECUTIVE SUMMARY
          if (data.executiveSummary) {
            page.drawRectangle({
              x: marginX,
              y: cursorY - 46,
              width: contentWidth,
              height: 48,
              color: rgb(0.97, 0.98, 1),
              borderColor: primaryRgb,
              borderWidth: 1,
            });
            drawText('SYNTHÈSE EXÉCUTIVE', { x: marginX + 12, y: cursorY - 12, size: 9, font: fontBold, color: primaryRgb });
            const sumLines = (data.executiveSummary || '').match(/.{1,105}(\s|$)/g) || [data.executiveSummary];
            let sY = cursorY - 26;
            for (const sl of sumLines.slice(0, 2)) {
              drawText(sl.trim(), { x: marginX + 12, y: sY, size: 8, font, color: slateDark });
              sY -= 11;
            }
            cursorY -= 60;
          }

          // KPIS CARDS ROW
          if (data.kpis && data.kpis.length > 0) {
            const cardW = (contentWidth - (data.kpis.length - 1) * 12) / data.kpis.length;
            const cardH = 50;
            data.kpis.forEach((kpi, kIdx) => {
              const kX = marginX + kIdx * (cardW + 12);
              page.drawRectangle({
                x: kX,
                y: cursorY - cardH + 10,
                width: cardW,
                height: cardH,
                color: rgb(0.98, 0.98, 0.99),
                borderColor: rgb(0.88, 0.9, 0.93),
                borderWidth: 1,
              });
              drawText(kpi.label.slice(0, 25), { x: kX + 10, y: cursorY - 4, size: 7.5, font, color: slateGray });
              drawText(kpi.value.slice(0, 18), { x: kX + 10, y: cursorY - 20, size: 12, font: fontBold, color: primaryRgb });
              if (kpi.trend) {
                drawText(kpi.trend.slice(0, 22), { x: kX + 10, y: cursorY - 32, size: 7, font: fontBold, color: rgb(0.1, 0.6, 0.3) });
              }
            });
            cursorY -= cardH + 16;
          }

          // SECTIONS
          if (data.sections) {
            for (const sec of data.sections) {
              if (cursorY < marginY + 50) break;
              drawText(sec.title, { x: marginX, y: cursorY, size: 11, font: fontBold, color: slateDark });
              cursorY -= 14;
              page.drawLine({
                start: { x: marginX, y: cursorY + 4 },
                end: { x: marginX + 120, y: cursorY + 4 },
                thickness: 1.5,
                color: primaryRgb,
              });
              cursorY -= 8;
              const secLines = (sec.content || '').match(/.{1,95}(\s|$)/g) || [sec.content];
              for (const sl of secLines) {
                if (cursorY < marginY + 40) break;
                drawText(sl.trim(), { x: marginX, y: cursorY, size: 8.5, font, color: slateDark });
                cursorY -= 12;
              }
              cursorY -= 10;
            }
          }
        } else if (data.template === 'contract') {
          // CONTRACT PREAMBLE & CLAUSES
          drawText('ENTRE LES SOUSSIGNÉS :', { x: marginX, y: cursorY, size: 9, font: fontBold, color: primaryRgb });
          cursorY -= 14;
          drawText(`D'une part : ${data.issuerName || 'Le Prestataire'}, et d'autre part : ${data.recipientName || 'Le Client'}.`, {
            x: marginX,
            y: cursorY,
            size: 8.5,
            font,
            color: slateDark,
          });
          cursorY -= 22;

          const clauses = [
            { num: 'ARTICLE 1', title: 'OBJET ET ÉTENDUE DE LA MISSION', text: 'Le prestataire s’engage à réaliser l’ensemble des prestations convenues selon les règles de l’art et les meilleurs standards professionnels en vigueur.' },
            { num: 'ARTICLE 2', title: 'CONFIDENTIALITÉ ET PROPRIÉTÉ INTELLECTUELLE', text: 'Chacune des parties s’engage à conserver confidentielles toutes les informations commerciales, financières ou techniques échangées.' },
            { num: 'ARTICLE 3', title: 'RÈGLEMENT ET PÉNALITÉS DE RETARD', text: `Les factures sont payables selon les conditions convenues (${data.paymentTerms || '30 jours'}). Tout retard donne lieu à pénalités légales.` },
          ];

          for (const cl of clauses) {
            if (cursorY < marginY + 80) break;
            drawText(`${cl.num} - ${cl.title}`, { x: marginX, y: cursorY, size: 8.5, font: fontBold, color: primaryRgb });
            cursorY -= 13;
            const clLines = cl.text.match(/.{1,100}(\s|$)/g) || [cl.text];
            for (const l of clLines) {
              if (cursorY < marginY + 60) break;
              drawText(l.trim(), { x: marginX, y: cursorY, size: 8, font, color: slateDark });
              cursorY -= 11;
            }
            cursorY -= 10;
          }

          if (cursorY > marginY + 65) {
            cursorY -= 10;
            const sigBoxW = (contentWidth - 20) / 2;
            page.drawRectangle({ x: marginX, y: cursorY - 55, width: sigBoxW, height: 60, borderColor: rgb(0.85, 0.88, 0.92), borderWidth: 1 });
            page.drawRectangle({ x: marginX + sigBoxW + 20, y: cursorY - 55, width: sigBoxW, height: 60, borderColor: rgb(0.85, 0.88, 0.92), borderWidth: 1 });
            drawText('Pour le Prestataire (Bon pour accord)', { x: marginX + 8, y: cursorY - 12, size: 7.5, font: fontBold, color: slateDark });
            drawText('Pour le Client (Lu et approuvé)', { x: marginX + sigBoxW + 28, y: cursorY - 12, size: 7.5, font: fontBold, color: slateDark });
            drawText(data.signatoryName || 'Alexandre de Montmirail', { x: marginX + 8, y: cursorY - 26, size: 7.5, font, color: slateGray });
            drawText(data.recipientName || 'M. Thomas Bernard', { x: marginX + sigBoxW + 28, y: cursorY - 26, size: 7.5, font, color: slateGray });
            cursorY -= 65;
          }
        } else if (data.template === 'certificate') {
          // ORNAMENTAL CERTIFICATE
          cursorY -= 15;
          const certTitle = 'ATTESTATION DE RÉUSSITE & D’EXCELLENCE';
          const ctW = textWidth(fontBold, certTitle, 16);
          drawText(certTitle, { x: pageWidth / 2 - ctW / 2, y: cursorY, size: 16, font: fontBold, color: primaryRgb });
          cursorY -= 32;

          const decerneA = data.recipientTitle || 'Attestation décernée avec félicitations à :';
          const decW = textWidth(font, decerneA, 10);
          drawText(decerneA, { x: pageWidth / 2 - decW / 2, y: cursorY, size: 10, font, color: slateGray });
          cursorY -= 28;

          const recName = data.recipientName || 'Alexandre Martin';
          const recW = textWidth(fontBold, recName, 20);
          drawText(recName, { x: pageWidth / 2 - recW / 2, y: cursorY, size: 20, font: fontBold, color: slateDark });
          cursorY -= 12;
          page.drawLine({
            start: { x: pageWidth / 2 - 120, y: cursorY },
            end: { x: pageWidth / 2 + 120, y: cursorY },
            thickness: 1,
            color: primaryRgb,
          });
          cursorY -= 25;

          const reasonLines = (data.certificateReason || '').match(/.{1,80}(\s|$)/g) || [data.certificateReason];
          for (const rl of reasonLines) {
            const rW = textWidth(font, rl.trim(), 9.5);
            drawText(rl.trim(), { x: pageWidth / 2 - rW / 2, y: cursorY, size: 9.5, font, color: slateDark });
            cursorY -= 15;
          }
          cursorY -= 25;

          drawText(data.certificateAuthority || 'Direction des Certifications Professionnelles', {
            x: marginX + 30,
            y: cursorY,
            size: 8.5,
            font: fontBold,
            color: slateDark,
          });
          drawText(`Fait le ${data.docDate || new Date().toLocaleDateString('fr-FR')}`, {
            x: marginX + 30,
            y: cursorY - 14,
            size: 8,
            font,
            color: slateGray,
          });

          if (sigImage) {
            const sDims = sigImage.scaleToFit(110, 40);
            page.drawImage(sigImage, { x: pageWidth - marginX - 140, y: cursorY - 20, width: sDims.width, height: sDims.height });
          }
        } else if (data.template === 'letter') {
          // FORMAL OFFICIAL LETTER
          const rcX = pageWidth - marginX - 220;
          let rcY = cursorY;
          drawText(data.recipientName || 'M. Destinataire', { x: rcX, y: rcY, size: 9.5, font: fontBold, color: slateDark });
          rcY -= 14;
          if (data.recipientCompany) {
            drawText(data.recipientCompany, { x: rcX, y: rcY, size: 8.5, font: fontBold, color: slateDark });
            rcY -= 13;
          }
          if (data.recipientAddress) {
            drawText(data.recipientAddress, { x: rcX, y: rcY, size: 8, font, color: slateGray });
            rcY -= 13;
          }
          cursorY = rcY - 18;

          drawText(`Fait à Paris, le ${data.docDate || new Date().toLocaleDateString('fr-FR')}`, {
            x: marginX,
            y: cursorY,
            size: 8.5,
            font,
            color: slateGray,
          });
          cursorY -= 20;

          drawText(`Objet : ${data.docTitle || 'Mission professionnelle'}`, {
            x: marginX,
            y: cursorY,
            size: 9.5,
            font: fontBold,
            color: primaryRgb,
          });
          cursorY -= 24;

          const letterText = data.executiveSummary || 'Madame, Monsieur,\n\nNous avons l’honneur de vous soumettre le présent document dans le cadre de notre collaboration continue. Nous restons à votre entière disposition pour tout renseignement complémentaire.\n\nVeuillez agréer, Madame, Monsieur, l’expression de nos salutations distinguées.';
          const letterParas = letterText.split(/\r?\n/);
          for (const lp of letterParas) {
            if (!lp.trim()) {
              cursorY -= 10;
              continue;
            }
            const lLines = lp.match(/.{1,95}(\s|$)/g) || [lp];
            for (const ll of lLines) {
              if (cursorY < marginY + 50) break;
              drawText(ll.trim(), { x: marginX, y: cursorY, size: 9, font, color: slateDark });
              cursorY -= 13;
            }
            cursorY -= 6;
          }

          cursorY -= 15;
          drawText(data.signatoryName || 'Alexandre de Montmirail', { x: pageWidth - marginX - 180, y: cursorY, size: 8.5, font: fontBold, color: slateDark });
          drawText(data.signatoryTitle || 'Directeur Associé', { x: pageWidth - marginX - 180, y: cursorY - 13, size: 8, font, color: slateGray });
        }

        // FOOTER & PAGINATION (Always on all pages)
        const footY = marginY;
        page.drawLine({
          start: { x: marginX, y: footY + 12 },
          end: { x: pageWidth - marginX, y: footY + 12 },
          thickness: 0.5,
          color: rgb(0.88, 0.9, 0.92),
        });

        if (data.footerNote) {
          drawText(data.footerNote.slice(0, 100), {
            x: marginX,
            y: footY,
            size: 7,
            font,
            color: slateGray,
          });
        }

        // Page Numbering
        if (data.showPageNumbers) {
          let numStr = `Page ${pIdx} sur ${totalPagesToGenerate}`;
          if (data.pageNumberFormat === 'x_slash_y') numStr = `${pIdx} / ${totalPagesToGenerate}`;
          if (data.pageNumberFormat === 'dash_x_dash') numStr = `- ${pIdx} -`;
          if (data.pageNumberFormat === 'page_x') numStr = `Page ${pIdx}`;

          const numW = textWidth(font, numStr, 7.5);
          const numX =
            data.pageNumberPosition === 'bottom_center'
              ? pageWidth / 2 - numW / 2
              : pageWidth - marginX - numW;

          drawText(numStr, {
            x: numX,
            y: footY,
            size: 7.5,
            font,
            color: slateGray,
          });
        }
      }

      // Save PDF bytes
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);

      if (shouldPrint) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          iframe.contentWindow?.print();
        };
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.docReference.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_document.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        addRecentFile({
          name: `${data.docReference}.pdf`,
          toolName: 'Créateur de PDF Professionnel',
          toolId: 'pdf-creator',
          size: blob.size,
          pageCount: totalPagesToGenerate,
        });
      }
    } catch (err) {
      console.error('Erreur génération PDF:', err);
      alert('Une erreur est survenue lors de la création du PDF vectoriel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hidden input for block images */}
      <input ref={blockImageInputRef} type="file" accept="image/*" onChange={handleUploadBlockImage} className="hidden" />

      {/* Main Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Créateur de PDF Professionnel
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  Feuille Vierge & Modèles Pro · Multi-Pages
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Partez d’une feuille vierge libre ou d’un modèle certifié avec réglages typographiques et géométriques avancés.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleGeneratePdf(true)}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Imprimer</span>
            </button>
            <button
              type="button"
              onClick={() => handleGeneratePdf(false)}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Génération...' : 'Télécharger le PDF HD'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Template Ribbon with Feuille Vierge */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2.5">
          Sélectionnez un modèle ou une feuille vierge :
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {[
            { id: 'blank', label: 'Feuille Vierge', icon: FilePlus2, badge: 'Canvas libre' },
            { id: 'invoice', label: 'Facture & Devis', icon: FileSpreadsheet, badge: 'Calcul auto' },
            { id: 'report', label: 'Rapport d’Activité', icon: FileText, badge: 'KPIs & Bilan' },
            { id: 'contract', label: 'Contrat & Accord', icon: ScrollText, badge: 'Clauses pro' },
            { id: 'certificate', label: 'Certificat / Diplôme', icon: Award, badge: 'Ornemental' },
            { id: 'letter', label: 'Lettre Officielle', icon: Mail, badge: 'Courrier' },
          ].map((t) => {
            const Icon = t.icon;
            const isSelected = data.template === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTemplate(t.id as TemplateType)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-blue-500/20 text-blue-900 dark:text-blue-100 font-bold'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span className="text-xs">{t.label}</span>
                <span className="text-[10px] text-slate-500 font-normal">{t.badge}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls & Settings */}
        <div className="lg:col-span-5 space-y-4">
          {/* Sub Navigation */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'content'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {data.template === 'blank' ? '1. Structure' : '1. Contenu'}
            </button>
            {data.template === 'blank' && (
              <button
                type="button"
                onClick={() => setActiveTab('blocks')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'blocks'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                2. Blocs ({data.blankBlocks.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('issuer')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'issuer'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {data.template === 'blank' ? '3. En-tête' : '2. Coordonnées'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advanced')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'advanced'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              ⚙️ Avancé
            </button>
          </div>

          {/* TAB: CONTENT & BASE */}
          {activeTab === 'content' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Titre Principal du Document
                  </label>
                  <input
                    type="text"
                    value={data.docTitle}
                    onChange={(e) => setData({ ...data, docTitle: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Référence / Code
                  </label>
                  <input
                    type="text"
                    value={data.docReference}
                    onChange={(e) => setData({ ...data, docReference: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Template specific fields */}
              {data.template === 'blank' && (
                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 space-y-2">
                  <div className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <FilePlus2 className="w-4 h-4 text-blue-600" />
                    <span>Mode Feuille Vierge Activé</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Vous travaillez sur une page blanche sans contrainte. Ajoutez des titres, paragraphes, images, QR codes ou tableaux depuis l’onglet « 2. Blocs ».
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('blocks')}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                    >
                      Gérer les blocs modulaires &rarr;
                    </button>
                  </div>
                </div>
              )}

              {data.template === 'invoice' && (
                /* Invoice table */
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Lignes de facturation ({data.items.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newItem: InvoiceItem = {
                          id: Date.now().toString(),
                          description: 'Nouvelle prestation',
                          quantity: 1,
                          unitPrice: 150,
                          taxRate: 20,
                        };
                        setData((p) => ({ ...p, items: [...p.items, newItem] }));
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ajouter ligne</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {data.items.map((item, idx) => (
                      <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const desc = e.target.value;
                              setData((p) => ({ ...p, items: p.items.map((it) => (it.id === item.id ? { ...it, description: desc } : it)) }));
                            }}
                            className="flex-1 text-xs p-1.5 bg-white dark:bg-slate-900 border rounded-lg font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setData((p) => ({ ...p, items: p.items.filter((it) => it.id !== item.id) }))}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Qté</span>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const q = Number(e.target.value);
                                setData((p) => ({ ...p, items: p.items.map((it) => (it.id === item.id ? { ...it, quantity: q } : it)) }));
                              }}
                              className="w-full text-xs p-1 bg-white dark:bg-slate-900 border rounded"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">P.U. HT (€)</span>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const u = Number(e.target.value);
                                setData((p) => ({ ...p, items: p.items.map((it) => (it.id === item.id ? { ...it, unitPrice: u } : it)) }));
                              }}
                              className="w-full text-xs p-1 bg-white dark:bg-slate-900 border rounded font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">TVA (%)</span>
                            <input
                              type="number"
                              value={item.taxRate}
                              onChange={(e) => {
                                const t = Number(e.target.value);
                                setData((p) => ({ ...p, items: p.items.map((it) => (it.id === item.id ? { ...it, taxRate: t } : it)) }));
                              }}
                              className="w-full text-xs p-1 bg-white dark:bg-slate-900 border rounded"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: BLANK BLOCKS (Only for Blank Sheet Mode) */}
          {activeTab === 'blocks' && data.template === 'blank' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Ajouter des blocs sur la feuille vierge :
              </span>

              {/* Quick Add Palette */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { type: 'heading', label: '+ Titre', icon: AlignLeft },
                  { type: 'paragraph', label: '+ Texte', icon: FileText },
                  { type: 'callout', label: '+ Note Info', icon: Info },
                  { type: 'bullet-list', label: '+ Puces', icon: List },
                  { type: 'table', label: '+ Tableau', icon: FileSpreadsheet },
                  { type: 'qrcode', label: '+ QR Code', icon: QrCode },
                  { type: 'stamp', label: '+ Cachet', icon: Stamp },
                  { type: 'separator', label: '+ Ligne', icon: Minus },
                ].map((b) => {
                  const Icon = b.icon;
                  return (
                    <button
                      key={b.type}
                      type="button"
                      onClick={() => handleAddBlock(b.type as BlockType)}
                      className="px-2.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 justify-center cursor-pointer transition-all"
                    >
                      <Icon className="w-3.5 h-3.5 text-blue-600" />
                      <span>{b.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Blocks List */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 max-h-96 overflow-y-auto pr-1">
                {data.blankBlocks.map((blk, idx) => (
                  <div
                    key={blk.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide text-[10px]">
                        Bloc #{idx + 1} · {blk.type}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveBlock(idx, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Monter"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === data.blankBlocks.length - 1}
                          onClick={() => handleMoveBlock(idx, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Descendre"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBlock(blk.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Block-specific field editors */}
                    {blk.type === 'heading' && (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={blk.title || ''}
                          onChange={(e) => handleUpdateBlock(blk.id, { title: e.target.value })}
                          placeholder="Titre de la section..."
                          className="w-full text-xs p-1.5 bg-white dark:bg-slate-900 border rounded-lg font-bold"
                        />
                        <input
                          type="text"
                          value={blk.content || ''}
                          onChange={(e) => handleUpdateBlock(blk.id, { content: e.target.value })}
                          placeholder="Sous-titre..."
                          className="w-full text-xs p-1.5 bg-white dark:bg-slate-900 border rounded-lg"
                        />
                      </div>
                    )}

                    {blk.type === 'paragraph' && (
                      <textarea
                        rows={3}
                        value={blk.content || ''}
                        onChange={(e) => handleUpdateBlock(blk.id, { content: e.target.value })}
                        placeholder="Texte du paragraphe..."
                        className="w-full text-xs p-2 bg-white dark:bg-slate-900 border rounded-lg"
                      />
                    )}

                    {blk.type === 'callout' && (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={blk.calloutTitle || ''}
                          onChange={(e) => handleUpdateBlock(blk.id, { calloutTitle: e.target.value })}
                          placeholder="Titre de l’encadré..."
                          className="w-full text-xs p-1.5 bg-white dark:bg-slate-900 border rounded-lg font-bold"
                        />
                        <textarea
                          rows={2}
                          value={blk.content || ''}
                          onChange={(e) => handleUpdateBlock(blk.id, { content: e.target.value })}
                          placeholder="Message important..."
                          className="w-full text-xs p-2 bg-white dark:bg-slate-900 border rounded-lg"
                        />
                      </div>
                    )}

                    {blk.type === 'bullet-list' && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500">Éléments de liste (un par ligne) :</span>
                        <textarea
                          rows={3}
                          value={(blk.listItems || []).join('\n')}
                          onChange={(e) => handleUpdateBlock(blk.id, { listItems: e.target.value.split('\n') })}
                          className="w-full text-xs p-2 bg-white dark:bg-slate-900 border rounded-lg"
                        />
                      </div>
                    )}

                    {blk.type === 'stamp' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={blk.stampText || ''}
                          onChange={(e) => handleUpdateBlock(blk.id, { stampText: e.target.value })}
                          placeholder="Texte du tampon..."
                          className="text-xs p-1.5 bg-white dark:bg-slate-900 border rounded-lg font-bold"
                        />
                        <input
                          type="text"
                          value={blk.stampSubtext || ''}
                          onChange={(e) => handleUpdateBlock(blk.id, { stampSubtext: e.target.value })}
                          placeholder="Date ou mention..."
                          className="text-xs p-1.5 bg-white dark:bg-slate-900 border rounded-lg"
                        />
                      </div>
                    )}

                    {blk.type === 'qrcode' && (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={blk.qrText || ''}
                          onChange={(e) => handleUpdateBlock(blk.id, { qrText: e.target.value })}
                          placeholder="https://..."
                          className="w-full text-xs p-1.5 bg-white dark:bg-slate-900 border rounded-lg font-mono"
                        />
                        <input
                          type="text"
                          value={blk.qrCaption || ''}
                          onChange={(e) => handleUpdateBlock(blk.id, { qrCaption: e.target.value })}
                          placeholder="Légende du QR code..."
                          className="w-full text-xs p-1.5 bg-white dark:bg-slate-900 border rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ISSUER & LOGO */}
          {activeTab === 'issuer' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>En-tête & Informations Émetteur</span>
              </span>

              {/* Logo */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {data.logoUrl ? (
                    <img src={data.logoUrl} alt="Logo" className="w-14 h-9 object-contain rounded bg-white p-1 border" />
                  ) : (
                    <div className="w-14 h-9 rounded border border-dashed text-slate-400 text-[10px] flex items-center justify-center">
                      Logo
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Logo de l’entreprise</div>
                    <div className="text-[10px] text-slate-500">Format PNG ou JPG</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/60 rounded-lg cursor-pointer"
                >
                  {data.logoUrl ? 'Modifier' : 'Importer'}
                </button>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => setData({ ...data, logoUrl: r.result as string });
                  r.readAsDataURL(f);
                }} className="hidden" />
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nom de l’Entreprise ou du Professionnel
                  </label>
                  <input
                    type="text"
                    value={data.issuerName}
                    onChange={(e) => setData({ ...data, issuerName: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Sous-titre / Activité
                  </label>
                  <input
                    type="text"
                    value={data.issuerSubtitle}
                    onChange={(e) => setData({ ...data, issuerSubtitle: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Adresse postale complète
                  </label>
                  <input
                    type="text"
                    value={data.issuerAddress}
                    onChange={(e) => setData({ ...data, issuerAddress: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: PARAMÈTRES AVANCÉS */}
          {activeTab === 'advanced' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Paramètres Avancés & Mise en Page</span>
              </span>

              {/* Multi-pages count */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Nombre de pages du document :</span>
                  <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {data.pageCount} page(s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={data.pageCount}
                    onChange={(e) => setData({ ...data, pageCount: Number(e.target.value) })}
                    className="flex-1 accent-blue-600"
                  />
                </div>
              </div>

              {/* Format, Orientation, Marges */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Format Papier
                  </label>
                  <select
                    value={data.pageSize}
                    onChange={(e) => setData({ ...data, pageSize: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="A4">A4 (210 x 297 mm)</option>
                    <option value="LETTER">US Letter (8.5 x 11 in)</option>
                    <option value="A3">A3 (Grand format 297 x 420 mm)</option>
                    <option value="A5">A5 (Carnet / Livret 148 x 210 mm)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Orientation
                  </label>
                  <select
                    value={data.orientation}
                    onChange={(e) => setData({ ...data, orientation: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="portrait">Portrait (Vertical)</option>
                    <option value="landscape">Paysage (Horizontal)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Motif de Fond (Feuille Vierge)
                  </label>
                  <select
                    value={data.paperPattern}
                    onChange={(e) => setData({ ...data, paperPattern: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="plain">Blanche Unie (Clean)</option>
                    <option value="lined">Lignes d’écriture (Cahier)</option>
                    <option value="grid">Grille à Carreaux</option>
                    <option value="dots">Papier Pointé (Bullet)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Marges de Page
                  </label>
                  <select
                    value={data.marginSize}
                    onChange={(e) => setData({ ...data, marginSize: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="compact">Étroites (10 mm)</option>
                    <option value="normal">Standard (20 mm)</option>
                    <option value="wide">Larges (30 mm)</option>
                    <option value="none">Sans marges</option>
                  </select>
                </div>
              </div>

              {/* Watermark Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={data.showWatermark}
                    onChange={(e) => setData({ ...data, showWatermark: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Activer un Filigrane Personnalisé</span>
                </label>
                {data.showWatermark && (
                  <div className="space-y-2 pl-5 pt-1">
                    <input
                      type="text"
                      value={data.watermarkText}
                      onChange={(e) => setData({ ...data, watermarkText: e.target.value })}
                      placeholder="Texte du filigrane..."
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold uppercase"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Opacité ({Math.round(data.watermarkOpacity * 100)}%)</span>
                      <input
                        type="range"
                        min="0.05"
                        max="0.4"
                        step="0.05"
                        value={data.watermarkOpacity}
                        onChange={(e) => setData({ ...data, watermarkOpacity: Number(e.target.value) })}
                        className="w-32 accent-blue-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Official Stamp Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={data.showOfficialStamp}
                    onChange={(e) => setData({ ...data, showOfficialStamp: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Tampon / Cachet d’Authentification Vectoriel</span>
                </label>
                {data.showOfficialStamp && (
                  <div className="grid grid-cols-2 gap-2 pl-5 pt-1">
                    <input
                      type="text"
                      value={data.stampText}
                      onChange={(e) => setData({ ...data, stampText: e.target.value })}
                      placeholder="Mention (ex: VALIDÉ)"
                      className="p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold"
                    />
                    <input
                      type="text"
                      value={data.stampCompany}
                      onChange={(e) => setData({ ...data, stampCompany: e.target.value })}
                      placeholder="Organisme ou société"
                      className="p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Dynamic QR Code Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={data.showDocQrCode}
                    onChange={(e) => setData({ ...data, showDocQrCode: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Intégrer un QR Code Dynamique (Vérification / Lien)</span>
                </label>
                {data.showDocQrCode && (
                  <div className="space-y-1.5 pl-5 pt-1">
                    <input
                      type="text"
                      value={data.docQrText}
                      onChange={(e) => setData({ ...data, docQrText: e.target.value })}
                      placeholder="https://..."
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Interactive Sheet Preview */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Aperçu de la page ({data.pageSize} · {data.orientation})</span>
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono">Page 1 sur {data.pageCount}</span>
            </div>
          </div>

          {/* Paper Sheet Preview Container */}
          <div className="bg-slate-200/90 dark:bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-300 dark:border-slate-800 overflow-x-auto shadow-inner flex justify-center">
            <div
              className="bg-white text-slate-900 shadow-2xl rounded-sm transition-all select-none overflow-hidden relative"
              style={{
                width: data.orientation === 'landscape' ? '820px' : '595px',
                minHeight: data.orientation === 'landscape' ? '580px' : '842px',
                fontFamily:
                  data.fontFamily === 'times'
                    ? 'Times New Roman, serif'
                    : data.fontFamily === 'courier'
                    ? 'Courier, monospace'
                    : 'Helvetica, Arial, sans-serif',
              }}
            >
              {/* Paper Pattern Overlay */}
              {data.paperPattern === 'lined' && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-40"
                  style={{
                    backgroundImage: 'linear-gradient(to bottom, transparent 21px, #e2e8f0 22px)',
                    backgroundSize: '100% 22px',
                  }}
                />
              )}
              {data.paperPattern === 'grid' && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-40"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                  }}
                />
              )}
              {data.paperPattern === 'dots' && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-50"
                  style={{
                    backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                  }}
                />
              )}

              {/* Top Accent bar */}
              {data.headerAccentBar && <div className="h-2 w-full" style={{ backgroundColor: data.primaryColor }} />}

              {/* Watermark */}
              {data.showWatermark && data.watermarkText && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                  style={{ opacity: data.watermarkOpacity || 0.15 }}
                >
                  <span
                    className="text-5xl font-black uppercase tracking-widest text-slate-900"
                    style={{ transform: `rotate(${data.watermarkAngle || 35}deg)` }}
                  >
                    {data.watermarkText}
                  </span>
                </div>
              )}

              {/* Official Stamp Badge */}
              {data.showOfficialStamp && (
                <div className="absolute top-14 right-10 pointer-events-none border-2 border-red-600 rounded-lg p-2 text-center text-red-600 -rotate-6 bg-white/80 backdrop-blur-2xs shadow-xs">
                  <div className="text-[10px] font-black uppercase tracking-wider">{data.stampText}</div>
                  <div className="text-[8px] font-bold">{data.stampCompany}</div>
                  <div className="text-[8px] font-mono">{data.stampDate}</div>
                </div>
              )}

              {/* Inner Page Padding */}
              <div className="p-8 space-y-6 relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1 max-w-[60%]">
                    {data.logoUrl && <img src={data.logoUrl} alt="Logo" className="h-9 max-w-[130px] object-contain mb-1" />}
                    <h2 className="text-sm font-black tracking-tight" style={{ color: data.primaryColor }}>
                      {data.issuerName || 'ENTREPRISE'}
                    </h2>
                    {data.issuerSubtitle && <p className="text-[10px] text-slate-500 font-medium">{data.issuerSubtitle}</p>}
                    <p className="text-[9px] text-slate-400">
                      {[data.issuerAddress, data.issuerEmail, data.issuerPhone].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <h3 className="text-xs font-black tracking-wider uppercase text-slate-900">{data.docTitle}</h3>
                    <p className="text-[10px] font-mono font-bold text-slate-600">Réf : {data.docReference}</p>
                    <p className="text-[9px] text-slate-500">Date : {data.docDate}</p>

                    {data.statusBadge && (
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase mt-1"
                        style={{ backgroundColor: `${data.primaryColor}18`, color: data.primaryColor }}
                      >
                        {data.statusBadge}
                      </span>
                    )}
                  </div>
                </div>

                {/* MODULAR BLANK CANVAS BLOCKS */}
                {data.template === 'blank' && (
                  <div className="space-y-4 pt-2">
                    {data.blankBlocks.map((blk) => (
                      <div key={blk.id} className="relative group/block">
                        {blk.type === 'heading' && (
                          <div className="space-y-0.5">
                            <h3 className="text-base font-black tracking-tight" style={{ color: data.primaryColor }}>
                              {blk.title}
                            </h3>
                            {blk.content && <p className="text-xs text-slate-500 font-medium">{blk.content}</p>}
                          </div>
                        )}

                        {blk.type === 'paragraph' && (
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{blk.content}</p>
                        )}

                        {blk.type === 'callout' && (
                          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 text-xs space-y-1">
                            <div className="font-bold text-blue-900 flex items-center gap-1.5">{blk.calloutTitle}</div>
                            <p className="text-slate-700 leading-relaxed">{blk.content}</p>
                          </div>
                        )}

                        {blk.type === 'bullet-list' && (
                          <ul className="space-y-1 text-xs text-slate-700">
                            {(blk.listItems || []).map((li, lIdx) => (
                              <li key={lIdx} className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: data.primaryColor }} />
                                <span>{li}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {blk.type === 'separator' && (
                          <div className="border-b border-slate-200 my-2" />
                        )}

                        {blk.type === 'qrcode' && (
                          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200 w-fit">
                            {qrCodeDataUrl ? (
                              <img src={qrCodeDataUrl} alt="QR" className="w-16 h-16 object-contain" />
                            ) : (
                              <QrCode className="w-12 h-12 text-slate-400" />
                            )}
                            <div>
                              <div className="text-xs font-bold text-slate-800">{blk.qrCaption}</div>
                              <div className="text-[10px] font-mono text-slate-500">{blk.qrText}</div>
                            </div>
                          </div>
                        )}

                        {blk.type === 'stamp' && (
                          <div className="border-2 border-red-600 rounded-lg p-2 text-center text-red-600 w-fit">
                            <div className="text-xs font-black uppercase">{blk.stampText}</div>
                            <div className="text-[9px] font-mono">{blk.stampSubtext}</div>
                          </div>
                        )}

                        {blk.type === 'table' && (
                          <div className="overflow-hidden rounded-lg border border-slate-200">
                            <table className="w-full text-xs">
                              <thead className="text-white font-bold" style={{ backgroundColor: data.primaryColor }}>
                                <tr>
                                  {(blk.tableHeaders || []).map((th, thIdx) => (
                                    <th key={thIdx} className="py-1.5 px-2.5 text-left">{th}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {(blk.tableRows || []).map((tr, trIdx) => (
                                  <tr key={trIdx} className={trIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    {tr.map((cell, cIdx) => (
                                      <td key={cIdx} className="py-1.5 px-2.5">{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* INVOICE TEMPLATE PREVIEW */}
                {data.template === 'invoice' && (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-white font-bold" style={{ backgroundColor: data.primaryColor }}>
                            <th className="py-2 px-3">Désignation</th>
                            <th className="py-2 px-3 text-center">Qté</th>
                            <th className="py-2 px-3 text-right">P.U. HT</th>
                            <th className="py-2 px-3 text-right">Total HT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {data.items.map((it, idx) => (
                            <tr key={it.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="py-2 px-3 font-medium">{it.description}</td>
                              <td className="py-2 px-3 text-center font-mono">{it.quantity}</td>
                              <td className="py-2 px-3 text-right font-mono">{it.unitPrice.toFixed(2)} €</td>
                              <td className="py-2 px-3 text-right font-bold font-mono">{(it.quantity * it.unitPrice).toFixed(2)} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end pt-2">
                      <div className="w-52 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>Sous-total HT :</span>
                          <span className="font-bold">{subtotalHT.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>TVA estimée :</span>
                          <span>{taxAmount.toFixed(2)} €</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm" style={{ color: data.primaryColor }}>
                          <span>NET À PAYER :</span>
                          <span>{totalTTC.toFixed(2)} €</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* REPORT TEMPLATE PREVIEW */}
                {data.template === 'report' && (
                  <div className="space-y-4">
                    {data.executiveSummary && (
                      <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 text-xs space-y-1">
                        <div className="font-bold tracking-tight text-blue-900 uppercase text-[10px]">Synthèse Exécutive</div>
                        <p className="text-slate-700 leading-relaxed">{data.executiveSummary}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      {data.kpis.map((kpi) => (
                        <div key={kpi.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                          <span className="text-[10px] text-slate-500 font-medium block">{kpi.label}</span>
                          <div className="text-base font-black tracking-tight" style={{ color: data.primaryColor }}>{kpi.value}</div>
                          {kpi.trend && <span className="text-[10px] text-emerald-600 font-bold block">{kpi.trend}</span>}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3 pt-2">
                      {data.sections.map((sec) => (
                        <div key={sec.id} className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-800">{sec.title}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{sec.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CONTRACT TEMPLATE PREVIEW */}
                {data.template === 'contract' && (
                  <div className="space-y-3 text-xs text-slate-700">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-900 block mb-1">ENTRE LES SOUSSIGNÉS :</span>
                      <p className="text-slate-600 text-[11px]">
                        <strong>{data.issuerName || 'Le Prestataire'}</strong> et <strong>{data.recipientName || 'Le Client'}</strong>.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-800 block text-[11px]">ARTICLE 1 - OBJET ET ÉTENDUE</span>
                        <p className="text-slate-600 text-[10px] mt-0.5">Le prestataire s’engage à réaliser l’ensemble des prestations convenues selon les règles de l’art.</p>
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-800 block text-[11px]">ARTICLE 2 - CONFIDENTIALITÉ</span>
                        <p className="text-slate-600 text-[10px] mt-0.5">Chacune des parties s’engage à conserver confidentielles toutes les informations échangées.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-3">
                      <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-[10px] space-y-1">
                        <span className="font-bold text-slate-800 block">Pour le Prestataire</span>
                        <span className="text-slate-500 block">{data.signatoryName}</span>
                        <div className="h-8 border-b border-dashed border-slate-300 mt-2" />
                      </div>
                      <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-[10px] space-y-1">
                        <span className="font-bold text-slate-800 block">Pour le Client</span>
                        <span className="text-slate-500 block">{data.recipientName}</span>
                        <div className="h-8 border-b border-dashed border-slate-300 mt-2" />
                      </div>
                    </div>
                  </div>
                )}

                {/* CERTIFICATE TEMPLATE PREVIEW */}
                {data.template === 'certificate' && (
                  <div className="p-6 text-center space-y-3 rounded-2xl border-2 border-amber-600/60 bg-amber-50/20">
                    <span className="text-xs uppercase tracking-widest font-black text-amber-700 block">ATTESTATION DE RÉUSSITE</span>
                    <span className="text-[11px] text-slate-500 italic block">{data.recipientTitle}</span>
                    <h3 className="text-lg font-black tracking-tight text-slate-900">{data.recipientName}</h3>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">{data.certificateReason}</p>
                    <div className="pt-3 flex items-center justify-between text-[10px] text-slate-500 border-t border-amber-200">
                      <span>{data.certificateAuthority}</span>
                      <span>Délivré le {data.docDate}</span>
                    </div>
                  </div>
                )}

                {/* LETTER TEMPLATE PREVIEW */}
                {data.template === 'letter' && (
                  <div className="space-y-4 text-xs">
                    <div className="flex justify-end text-right">
                      <div>
                        <div className="font-bold text-slate-900">{data.recipientName}</div>
                        <div className="text-slate-500 text-[11px]">{data.recipientCompany}</div>
                        <div className="text-slate-400 text-[10px]">{data.recipientAddress}</div>
                      </div>
                    </div>
                    <div className="text-slate-500 text-[11px]">Le {data.docDate}</div>
                    <div className="font-bold text-slate-900" style={{ color: data.primaryColor }}>
                      Objet : {data.docTitle}
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {data.executiveSummary || 'Madame, Monsieur,\n\nNous avons l’honneur de vous soumettre le présent document dans le cadre de notre collaboration continue.\n\nVeuillez agréer nos salutations distinguées.'}
                    </p>
                    <div className="pt-4 text-right">
                      <div className="font-bold text-slate-800">{data.signatoryName}</div>
                      <div className="text-slate-500 text-[10px]">{data.signatoryTitle}</div>
                    </div>
                  </div>
                )}

                {/* Footer and Pagination */}
                <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400">
                  <span>{data.footerNote}</span>
                  <span>Page 1 sur {data.pageCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
