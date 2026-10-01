import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode as QrCodeIcon,
  Download,
  Copy,
  Check,
  Sparkles,
  Link as LinkIcon,
  Type,
  Wifi,
  Mail,
  Phone,
  User,
  Sliders,
  FileCode,
  Upload,
  CheckCircle2,
  Scan,
  RefreshCw,
  Printer,
  FileText,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { DropZone } from '../DropZone';
import { exportPresetToFile, importPresetFromFile } from '../../utils/presetManager';
import { addRecentFile } from '../../utils/recentFiles';

type QrContentType = 'url' | 'text' | 'wifi' | 'email' | 'phone' | 'sms' | 'vcard';

interface QrSettings {
  contentType: QrContentType;
  content: string;
  fgColor: string;
  bgColor: string;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  margin: number;
  width: number;
  wifiSsid?: string;
  wifiPassword?: string;
  wifiEncryption?: 'WPA' | 'WEP' | 'nopass';
  emailAddress?: string;
  emailSubject?: string;
  emailBody?: string;
  phoneNumber?: string;
  vcardName?: string;
  vcardCompany?: string;
  vcardPhone?: string;
  vcardEmail?: string;
}

export const QrTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'scan'>('generate');

  // Generator Settings
  const [contentType, setContentType] = useState<QrContentType>('url');
  const [url, setUrl] = useState<string>('https://google.com');
  const [text, setText] = useState<string>('');
  
  // Wi-Fi fields
  const [wifiSsid, setWifiSsid] = useState<string>('');
  const [wifiPassword, setWifiPassword] = useState<string>('');
  const [wifiEncryption, setWifiEncryption] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');

  // Email fields
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');

  // Phone
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [smsBody, setSmsBody] = useState<string>('');

  // vCard
  const [vcardName, setVcardName] = useState<string>('');
  const [vcardCompany, setVcardCompany] = useState<string>('');
  const [vcardPhone, setVcardPhone] = useState<string>('');
  const [vcardEmail, setVcardEmail] = useState<string>('');

  // Appearance
  const [fgColor, setFgColor] = useState<string>('#0F172A');
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [margin, setMargin] = useState<number>(2);
  const [qrSize, setQrSize] = useState<number>(512);

  // Output
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvgString, setQrSvgString] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [presetNotice, setPresetNotice] = useState<string | null>(null);

  // Scanner state
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const presetInputRef = useRef<HTMLInputElement>(null);

  // Compute actual payload string based on content type
  const getPayloadString = (): string => {
    switch (contentType) {
      case 'url':
        return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      case 'text':
        return text || 'Exemple de texte pour QR Code';
      case 'wifi':
        return `WIFI:T:${wifiEncryption};S:${wifiSsid};P:${wifiPassword};;`;
      case 'email':
        return `mailto:${emailAddress}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      case 'phone':
        return `tel:${phoneNumber}`;
      case 'sms':
        return `smsto:${phoneNumber}:${smsBody}`;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nN:${vcardName}\nORG:${vcardCompany}\nTEL:${vcardPhone}\nEMAIL:${vcardEmail}\nEND:VCARD`;
      default:
        return url;
    }
  };

  // Generate QR Code on any change
  useEffect(() => {
    const payload = getPayloadString();
    if (!payload.trim()) return;

    // Generate PNG Data URL
    QRCode.toDataURL(payload, {
      width: qrSize,
      margin,
      color: {
        dark: fgColor,
        light: bgColor,
      },
      errorCorrectionLevel,
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR generation error:', err);
      });

    // Generate SVG string
    QRCode.toString(payload, {
      type: 'svg',
      width: qrSize,
      margin,
      color: {
        dark: fgColor,
        light: bgColor,
      },
      errorCorrectionLevel,
    })
      .then((svg) => {
        setQrSvgString(svg);
      })
      .catch((err) => {
        console.error('QR SVG generation error:', err);
      });
  }, [
    contentType,
    url,
    text,
    wifiSsid,
    wifiPassword,
    wifiEncryption,
    emailAddress,
    emailSubject,
    emailBody,
    phoneNumber,
    smsBody,
    vcardName,
    vcardCompany,
    vcardPhone,
    vcardEmail,
    fgColor,
    bgColor,
    errorCorrectionLevel,
    margin,
    qrSize,
  ]);

  // Download printable A4 PDF
  const handleDownloadPdf = async () => {
    if (!qrDataUrl) return;
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Fond blanc
      page.drawRectangle({
        x: 0,
        y: 0,
        width: 595.28,
        height: 841.89,
        color: rgb(1, 1, 1),
      });

      // Cadre bordure
      page.drawRectangle({
        x: 36,
        y: 36,
        width: 595.28 - 72,
        height: 841.89 - 72,
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 1.5,
      });

      // Titre
      page.drawText('SCANNEZ POUR ACCÉDER', {
        x: 60,
        y: 755,
        size: 24,
        font: fontBold,
        color: rgb(0.08, 0.12, 0.2),
      });

      // Sous-titre
      let subtitle = '';
      if (contentType === 'wifi') {
        subtitle = `Réseau Wi-Fi : ${wifiSsid || 'Sans nom'}`;
      } else if (contentType === 'url') {
        subtitle = url;
      } else if (contentType === 'email') {
        subtitle = `Email : ${emailAddress || ''}`;
      } else if (contentType === 'phone') {
        subtitle = `Téléphone : ${phoneNumber || ''}`;
      } else if (contentType === 'sms') {
        subtitle = `SMS : ${phoneNumber || ''}`;
      } else {
        subtitle = 'Document avec QR Code interactif';
      }

      const truncatedSubtitle = subtitle.length > 65 ? subtitle.slice(0, 62) + '...' : subtitle;
      page.drawText(truncatedSubtitle, {
        x: 60,
        y: 730,
        size: 13,
        font: fontRegular,
        color: rgb(0.38, 0.45, 0.55),
      });

      // QR Code centré
      const qrImage = await pdfDoc.embedPng(qrDataUrl);
      const qrDim = 380;
      const qrX = (595.28 - qrDim) / 2;
      const qrY = 280;

      page.drawRectangle({
        x: qrX - 16,
        y: qrY - 16,
        width: qrDim + 32,
        height: qrDim + 32,
        color: rgb(0.98, 0.99, 1),
        borderColor: rgb(0.88, 0.91, 0.95),
        borderWidth: 1,
      });

      page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrDim,
        height: qrDim,
      });

      // Détails Wi-Fi
      if (contentType === 'wifi' && wifiPassword) {
        page.drawText(`Mot de passe : ${wifiPassword}`, {
          x: 60,
          y: 220,
          size: 14,
          font: fontBold,
          color: rgb(0.08, 0.12, 0.2),
        });
      }

      page.drawText('Scannez ce QR Code avec l’appareil photo de votre smartphone ou tablette.', {
        x: 60,
        y: 170,
        size: 11,
        font: fontRegular,
        color: rgb(0.45, 0.5, 0.6),
      });

      page.drawText('Généré avec PDF & Media Studio · 100% sécurisé et local', {
        x: 60,
        y: 60,
        size: 9,
        font: fontRegular,
        color: rgb(0.6, 0.65, 0.7),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `qrcode_${contentType}_fiche.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);

      addRecentFile({
        name: `qrcode_${contentType}_fiche.pdf`,
        toolName: 'Fiche QR Code PDF',
        toolId: 'qr',
        size: pdfBytes.byteLength,
        pageCount: 1,
      });
    } catch (err) {
      console.error('Erreur génération PDF QR code :', err);
      alert('Impossible de générer la fiche PDF.');
    }
  };

  // Download PNG
  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrcode_${contentType}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addRecentFile({
      name: `qrcode_${contentType}.png`,
      toolName: 'Générateur QR Code',
      toolId: 'qr',
      size: Math.round(qrDataUrl.length * 0.75),
      pageCount: 1,
    });
  };

  // Download SVG
  const handleDownloadSvg = () => {
    if (!qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qrcode_${contentType}_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  // Copy PNG image to clipboard
  const handleCopyImage = async () => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: copy payload text
      await navigator.clipboard.writeText(getPayloadString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Presets Export / Import
  const handleExportQrPreset = () => {
    const settings: QrSettings = {
      contentType,
      content: getPayloadString(),
      fgColor,
      bgColor,
      errorCorrectionLevel,
      margin,
      width: qrSize,
      wifiSsid,
      wifiPassword,
      wifiEncryption,
      emailAddress,
      emailSubject,
      emailBody,
      phoneNumber,
      vcardName,
      vcardCompany,
      vcardPhone,
      vcardEmail,
    };
    exportPresetToFile('qr', settings, 'mon_modele_qrcode');
    setPresetNotice('Modèle de QR Code exporté avec succès en JSON !');
    setTimeout(() => setPresetNotice(null), 4000);
  };

  const handleImportQrPreset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const preset = await importPresetFromFile<QrSettings>(file);
      const s = preset.settings;
      if (s) {
        if (s.contentType) setContentType(s.contentType);
        if (s.fgColor) setFgColor(s.fgColor);
        if (s.bgColor) setBgColor(s.bgColor);
        if (s.errorCorrectionLevel) setErrorCorrectionLevel(s.errorCorrectionLevel);
        if (typeof s.margin === 'number') setMargin(s.margin);
        if (typeof s.width === 'number') setQrSize(s.width);
        if (s.wifiSsid) setWifiSsid(s.wifiSsid);
        if (s.wifiPassword) setWifiPassword(s.wifiPassword);
        if (s.wifiEncryption) setWifiEncryption(s.wifiEncryption);
        if (s.emailAddress) setEmailAddress(s.emailAddress);
        if (s.emailSubject) setEmailSubject(s.emailSubject);
        if (s.emailBody) setEmailBody(s.emailBody);
        if (s.phoneNumber) setPhoneNumber(s.phoneNumber);
        if (s.vcardName) setVcardName(s.vcardName);
        if (s.vcardCompany) setVcardCompany(s.vcardCompany);
        if (s.vcardPhone) setVcardPhone(s.vcardPhone);
        if (s.vcardEmail) setVcardEmail(s.vcardEmail);
        setPresetNotice('Modèle de QR Code importé et appliqué avec succès !');
      }
    } catch (err: any) {
      alert(`Erreur d'importation : ${err.message}`);
    } finally {
      if (presetInputRef.current) presetInputRef.current.value = '';
      setTimeout(() => setPresetNotice(null), 4000);
    }
  };

  // QR Code Scanner / Reader
  const handleScanFile = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setIsScanning(true);
    setScanError(null);
    setScannedResult(null);

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(f);
      img.src = objectUrl;

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setScanError('Impossible d’initialiser le moteur de lecture graphique.');
          setIsScanning(false);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Try direct scan with jsQR
        let code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        // If not found and image is very large, try downscaling to improve detection
        if (!code && (canvas.width > 1200 || canvas.height > 1200)) {
          const scale = Math.min(1000 / canvas.width, 1000 / canvas.height);
          const scaledW = Math.round(canvas.width * scale);
          const scaledH = Math.round(canvas.height * scale);
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = scaledW;
          smallCanvas.height = scaledH;
          const smallCtx = smallCanvas.getContext('2d');
          if (smallCtx) {
            smallCtx.drawImage(img, 0, 0, scaledW, scaledH);
            const smallData = smallCtx.getImageData(0, 0, scaledW, scaledH);
            code = jsQR(smallData.data, scaledW, scaledH, {
              inversionAttempts: 'attemptBoth',
            });
          }
        }

        if (code && code.data) {
          setScannedResult(code.data);
          setScanError(null);
        } else {
          setScanError('Aucun QR code valide n’a été détecté dans cette image. Assurez-vous que le QR code est lisible, net et bien contrasté.');
        }
        setIsScanning(false);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setScanError('Impossible de charger cette image.');
        setIsScanning(false);
      };
    } catch (err: any) {
      setScanError(err.message || 'Erreur de lecture');
      setIsScanning(false);
    }
  };

  const presetColors = [
    { label: 'Noir Classique', fg: '#0F172A', bg: '#FFFFFF' },
    { label: 'Bleu Royal', fg: '#1D4ED8', bg: '#EFF6FF' },
    { label: 'Émeraude Pro', fg: '#047857', bg: '#ECFDF5' },
    { label: 'Rose Rubis', fg: '#BE123C', bg: '#FFF1F2' },
    { label: 'Violet Indigo', fg: '#4338CA', bg: '#EEF2FF' },
    { label: 'Ambre Doré', fg: '#B45309', bg: '#FEF3C7' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-2xs">
              <QrCodeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Studio QR Code</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-full">
                  PNG & Vectoriel SVG
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Générez des QR codes personnalisés haute résolution (URL, Wi-Fi, Texte, vCard) et lisez des QR codes existants.
              </p>
            </div>
          </div>

          {/* JSON Presets Controls */}
          <div className="flex items-center gap-2">
            <input
              ref={presetInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportQrPreset}
            />
            <button
              type="button"
              onClick={handleExportQrPreset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              title="Exporter les réglages dans un fichier JSON"
            >
              <FileCode className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Sauvegarder modèle (JSON)</span>
            </button>
            <button
              type="button"
              onClick={() => presetInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              title="Charger un modèle JSON"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Charger (JSON)</span>
            </button>
          </div>
        </div>

        {presetNotice && (
          <div className="mt-3 p-2.5 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-purple-800 dark:text-purple-300 font-medium flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>{presetNotice}</span>
          </div>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('generate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'generate'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <QrCodeIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Générateur de QR Code</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'scan'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Scan className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Scanner & Décoder</span>
        </button>
      </div>

      {activeTab === 'generate' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form & Configuration (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Content Types */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Type de contenu à encoder
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { id: 'url', label: 'Lien Web', icon: LinkIcon },
                  { id: 'text', label: 'Texte', icon: Type },
                  { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
                  { id: 'email', label: 'E-mail', icon: Mail },
                  { id: 'phone', label: 'Téléphone', icon: Phone },
                  { id: 'sms', label: 'SMS', icon: MessageSquare },
                  { id: 'vcard', label: 'Contact', icon: User },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = contentType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setContentType(item.id as QrContentType)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-400 text-purple-700 dark:text-purple-300 ring-2 ring-purple-400/20'
                          : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Form inputs based on content type */}
              <div className="pt-2">
                {contentType === 'url' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Adresse URL du site web
                    </label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:text-slate-100 font-mono"
                    />
                  </div>
                )}

                {contentType === 'text' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Texte ou message libre
                    </label>
                    <textarea
                      rows={3}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Saisissez le texte que le QR code doit afficher..."
                      className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:text-slate-100"
                    />
                  </div>
                )}

                {contentType === 'wifi' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nom du réseau (SSID)</label>
                      <input
                        type="text"
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                        placeholder="MonRéseauWiFi"
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:text-slate-100"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mot de passe Wi-Fi</label>
                        <input
                          type="text"
                          value={wifiPassword}
                          onChange={(e) => setWifiPassword(e.target.value)}
                          placeholder="Clé de sécurité"
                          className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:text-slate-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sécurité</label>
                        <select
                          value={wifiEncryption}
                          onChange={(e) => setWifiEncryption(e.target.value as any)}
                          className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none dark:text-slate-100"
                        >
                          <option value="WPA">WPA / WPA2 / WPA3 (Standard)</option>
                          <option value="WEP">WEP (Ancien)</option>
                          <option value="nopass">Réseau Ouvert (Sans mot de passe)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {contentType === 'email' && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Adresse E-mail</label>
                      <input
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        placeholder="contact@exemple.fr"
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Objet du message</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Demande d'informations"
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Corps du message (Optionnel)</label>
                      <textarea
                        rows={2}
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="Message pré-rempli..."
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {contentType === 'phone' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Numéro de téléphone</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                      className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100 font-mono"
                    />
                  </div>
                )}

                {contentType === 'sms' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Numéro de destinataire</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+33 6 12 34 56 78"
                        className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Texte du SMS (Optionnel)</label>
                      <textarea
                        rows={2}
                        value={smsBody}
                        onChange={(e) => setSmsBody(e.target.value)}
                        placeholder="Message pré-rempli à envoyer..."
                        className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {contentType === 'vcard' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nom complet</label>
                      <input
                        type="text"
                        value={vcardName}
                        onChange={(e) => setVcardName(e.target.value)}
                        placeholder="Jean Dupont"
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Entreprise</label>
                      <input
                        type="text"
                        value={vcardCompany}
                        onChange={(e) => setVcardCompany(e.target.value)}
                        placeholder="Société SAS"
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Téléphone direct</label>
                      <input
                        type="tel"
                        value={vcardPhone}
                        onChange={(e) => setVcardPhone(e.target.value)}
                        placeholder="+33 6 00 00 00 00"
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">E-mail</label>
                      <input
                        type="email"
                        value={vcardEmail}
                        onChange={(e) => setVcardEmail(e.target.value)}
                        placeholder="jean.dupont@entreprise.fr"
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Design & Appearance Controls */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Personnalisation Graphique
                </span>
                <span className="text-[11px] text-slate-400">Palette & Correction</span>
              </div>

              {/* Color Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Thèmes de couleurs rapides
                </label>
                <div className="flex flex-wrap gap-2">
                  {presetColors.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => {
                        setFgColor(c.fg);
                        setBgColor(c.bg);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold hover:scale-105 transition-transform cursor-pointer"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.fg }} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Hex Pickers */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Couleur du code
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="text-xs p-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-24 text-center dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Couleur de fond
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="text-xs p-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-24 text-center dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Correction Level & Resolution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tolérance aux dégradations (Correction)
                  </label>
                  <select
                    value={errorCorrectionLevel}
                    onChange={(e) => setErrorCorrectionLevel(e.target.value as any)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100"
                  >
                    <option value="L">Niveau L (7% récupérable - Très fin)</option>
                    <option value="M">Niveau M (15% récupérable - Recommandé)</option>
                    <option value="Q">Niveau Q (25% récupérable - Haute fiabilité)</option>
                    <option value="H">Niveau H (30% récupérable - Robuste / Logo)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Résolution du fichier
                  </label>
                  <select
                    value={qrSize}
                    onChange={(e) => setQrSize(parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100 font-mono"
                  >
                    <option value="256">256 x 256 px (Standard Web)</option>
                    <option value="512">512 x 512 px (Haute Définition)</option>
                    <option value="1024">1024 x 1024 px (Très Haute Résolution)</option>
                    <option value="2048">2048 x 2048 px (Impression Grand Format)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live 3D Preview & Export Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col items-center text-center space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Aperçu en temps réel
              </span>

              {/* QR Code Container with 3D Pop */}
              <div
                className="p-4 rounded-2xl shadow-md border border-slate-200/80 dark:border-slate-750 transition-all hover:scale-105 duration-200 flex items-center justify-center max-w-[260px] aspect-square overflow-hidden"
                style={{ background: bgColor }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-300">
                    <QrCodeIcon className="w-16 h-16 animate-pulse" />
                  </div>
                )}
              </div>

              {/* Dimensions & Quality badge */}
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {qrSize} x {qrSize} px · Correction {errorCorrectionLevel} (
                {errorCorrectionLevel === 'H' ? '30%' : errorCorrectionLevel === 'Q' ? '25%' : '15%'})
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger PNG ({qrSize}px HD)</span>
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSvg}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    title="Télécharger en format vectoriel SVG sans perte"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>SVG</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded-xl transition-colors cursor-pointer"
                    title="Générer une fiche PDF A4 prête à imprimer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Fiche PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyImage}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    title="Copier l'image dans le presse-papier"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Scanner / Decoder View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs max-w-2xl mx-auto">
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Déposer une image pour décoder son QR Code
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Glissez une photo, capture d'écran ou fichier image contenant un QR code pour en extraire instantanément le contenu (100% hors-ligne via jsQR).
            </p>
          </div>

          <DropZone
            onFilesSelected={handleScanFile}
            accept="image/*"
            multiple={false}
            title="Déposez l'image contenant le QR Code"
            subtitle="JPG, PNG, WEBP ou capture d'écran"
          />

          {isScanning && (
            <div className="text-center py-4 text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyse et décodage en cours...</span>
            </div>
          )}

          {scanError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {scanError}
            </div>
          )}

          {scannedResult && (
            <div className="p-5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Contenu extrait du QR Code :</span>
              </div>

              {/* Rich parser view for Wi-Fi */}
              {scannedResult.startsWith('WIFI:') && (
                <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Réseau Wi-Fi :</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      {scannedResult.match(/S:([^;]+)/)?.[1] || 'Inconnu'}
                    </span>
                  </div>
                  {scannedResult.match(/P:([^;]+)/)?.[1] && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Mot de passe :</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {scannedResult.match(/P:([^;]+)/)?.[1]}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const pwd = scannedResult.match(/P:([^;]+)/)?.[1] || '';
                            navigator.clipboard.writeText(pwd);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                        >
                          Copier clé
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-mono break-all select-all text-slate-800 dark:text-slate-200">
                {scannedResult}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(scannedResult);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copié !' : 'Copier le texte'}</span>
                </button>

                {(scannedResult.startsWith('http://') || scannedResult.startsWith('https://')) && (
                  <a
                    href={scannedResult}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Visiter l'URL</span>
                  </a>
                )}

                {scannedResult.startsWith('tel:') && (
                  <a
                    href={scannedResult}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Appeler</span>
                  </a>
                )}

                {scannedResult.startsWith('mailto:') && (
                  <a
                    href={scannedResult}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Envoyer un email</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
