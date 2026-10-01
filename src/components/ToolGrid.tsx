import React, { useState } from 'react';
import {
  Layers,
  Scissors,
  RotateCw,
  Crop,
  Image as ImageIcon,
  Stamp,
  PenTool,
  SlidersHorizontal,
  Eye,
  Sparkles,
  Zap,
  Lock,
  Search,
  FileText,
  FileImage,
  Hash,
  Music,
  Camera,
  Palette,
  Film,
  QrCode,
  Youtube,
  Repeat,
  FileEdit,
  FolderArchive,
  Share2,
  History,
  GitCompare,
  FileSpreadsheet,
  EyeOff,
  Wrench,
  BookOpen,
  Radio,
  FastForward,
  FlipHorizontal,
  VolumeX,
  Wand2,
  FileCheck,
} from 'lucide-react';
import { Card3D } from './Card3D';
import { CategoryTab3D } from './CategoryTab3D';
import type { ToolId, ToolCategoryKey } from '../types';

interface ToolGridProps {
  onSelectTool: (tool: ToolId) => void;
  onGenerateSample: () => void;
  isGeneratingSample: boolean;
}

export const ToolGrid: React.FC<ToolGridProps> = ({
  onSelectTool,
  onGenerateSample,
  isGeneratingSample,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategoryKey>('pdf');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const tools = [
    // --- 1. OUTILS PDF ---
    {
      id: 'pdf-creator' as ToolId,
      name: 'Créateur de PDF Professionnel',
      description: 'Créez de A à Z des factures, devis, rapports, contrats et attestations certifiés avec votre logo et signature.',
      category: 'Création',
      categoryKey: 'pdf',
      icon: FileCheck,
      colorTheme: {
        text: 'text-blue-600',
        bg: 'bg-blue-50/80',
        border: 'border-blue-200',
        glow: 'rgba(37, 99, 235, 0.4)',
      },
    },
    {
      id: 'merge' as ToolId,
      name: 'Fusionner des PDF',
      description: 'Combinez plusieurs fichiers PDF en un seul document dans l’ordre exact que vous choisissez.',
      category: 'Assemblage',
      categoryKey: 'pdf',
      icon: Layers,
      colorTheme: {
        text: 'text-indigo-600',
        bg: 'bg-indigo-50/80',
        border: 'border-indigo-200',
        glow: 'rgba(99, 102, 241, 0.4)',
      },
    },
    {
      id: 'split' as ToolId,
      name: 'Diviser / Extraire des pages',
      description: 'Extrayez des pages spécifiques ou découpez votre document en plusieurs fichiers individuels (ZIP).',
      category: 'Découpe',
      categoryKey: 'pdf',
      icon: Scissors,
      colorTheme: {
        text: 'text-rose-600',
        bg: 'bg-rose-50/80',
        border: 'border-rose-200',
        glow: 'rgba(244, 63, 94, 0.4)',
      },
    },
    {
      id: 'compress' as ToolId,
      name: 'Compresser un PDF',
      description: 'Réduisez le poids de votre PDF pour faciliter son envoi par e-mail sans altérer sa lisibilité.',
      category: 'Optimisation',
      categoryKey: 'pdf',
      icon: Zap,
      colorTheme: {
        text: 'text-amber-600',
        bg: 'bg-amber-50/80',
        border: 'border-amber-200',
        glow: 'rgba(217, 119, 6, 0.4)',
      },
    },
    {
      id: 'images-to-pdf' as ToolId,
      name: 'Convertir en PDF (Images / Docs)',
      description: 'Convertissez instantanément vos photos (JPG, PNG, WEBP) ou documents en un fichier PDF haute fidélité.',
      category: 'Conversion',
      categoryKey: 'pdf',
      icon: ImageIcon,
      colorTheme: {
        text: 'text-emerald-600',
        bg: 'bg-emerald-50/80',
        border: 'border-emerald-200',
        glow: 'rgba(16, 185, 129, 0.4)',
      },
    },
    {
      id: 'pdf-to-images' as ToolId,
      name: 'Convertir PDF en Images / Texte',
      description: 'Extrayez chaque page de votre document PDF en image JPG/PNG ou exportez le texte brut.',
      category: 'Extraction',
      categoryKey: 'pdf',
      icon: FileImage,
      colorTheme: {
        text: 'text-emerald-600',
        bg: 'bg-emerald-50/80',
        border: 'border-emerald-200',
        glow: 'rgba(16, 185, 129, 0.4)',
      },
    },
    {
      id: 'organize' as ToolId,
      name: 'Pivoter / Réorganiser / Supprimer',
      description: 'Visualisez toutes vos pages en mosaïque, réordonnez par glisser-déposer, pivotez ou supprimez.',
      category: 'Pages',
      categoryKey: 'pdf',
      icon: RotateCw,
      colorTheme: {
        text: 'text-amber-600',
        bg: 'bg-amber-50/80',
        border: 'border-amber-200',
        glow: 'rgba(217, 119, 6, 0.4)',
      },
    },
    {
      id: 'watermark' as ToolId,
      name: 'Ajouter un Filigrane',
      description: 'Incrustez des filigranes textuels personnalisés avec réglage de l’opacité (0–100%) et orientation.',
      category: 'Protection',
      categoryKey: 'pdf',
      icon: Stamp,
      colorTheme: {
        text: 'text-sky-600',
        bg: 'bg-sky-50/80',
        border: 'border-sky-200',
        glow: 'rgba(14, 165, 233, 0.4)',
      },
    },
    {
      id: 'page-numbers' as ToolId,
      name: 'Numéroter les Pages',
      description: 'Insérez des numéros de page ("Page X sur Y") personnalisés avec position, marge et police au choix.',
      category: 'Mise en page',
      categoryKey: 'pdf',
      icon: Hash,
      colorTheme: {
        text: 'text-sky-600',
        bg: 'bg-sky-50/80',
        border: 'border-sky-200',
        glow: 'rgba(14, 165, 233, 0.4)',
      },
    },
    {
      id: 'crop' as ToolId,
      name: 'Recadrer les Marges',
      description: 'Éliminez les bandes blanches latérales des captures smartphone ou taillez les bordures indésirables.',
      category: 'Cadrage',
      categoryKey: 'pdf',
      icon: Crop,
      colorTheme: {
        text: 'text-rose-600',
        bg: 'bg-rose-50/80',
        border: 'border-rose-200',
        glow: 'rgba(244, 63, 94, 0.4)',
      },
    },
    {
      id: 'protect' as ToolId,
      name: 'Protéger / Déverrouiller Mot de passe',
      description: 'Chiffrez votre document localement avec un mot de passe (AES-256) ou déverrouillez-le.',
      category: 'Chiffrement',
      categoryKey: 'pdf',
      icon: Lock,
      colorTheme: {
        text: 'text-rose-600',
        bg: 'bg-rose-50/80',
        border: 'border-rose-200',
        glow: 'rgba(225, 29, 72, 0.4)',
      },
    },
    {
      id: 'metadata' as ToolId,
      name: 'Métadonnées & PDF/A',
      description: 'Consultez, modifiez ou anonymisez les métadonnées et convertissez au standard ISO PDF/A d’archivage.',
      category: 'Archivage',
      categoryKey: 'pdf',
      icon: SlidersHorizontal,
      colorTheme: {
        text: 'text-teal-600',
        bg: 'bg-teal-50/80',
        border: 'border-teal-200',
        glow: 'rgba(20, 184, 166, 0.4)',
      },
    },
    {
      id: 'sign' as ToolId,
      name: 'Remplir et Signer des Formulaires',
      description: 'Dessinez ou tapez votre signature numérique avec horodatage certifié sur la page de votre choix.',
      category: 'Signature',
      categoryKey: 'pdf',
      icon: PenTool,
      colorTheme: {
        text: 'text-purple-600',
        bg: 'bg-purple-50/80',
        border: 'border-purple-200',
        glow: 'rgba(168, 85, 247, 0.4)',
      },
    },
    {
      id: 'viewer' as ToolId,
      name: 'Visionneuse & OCR (Recherche)',
      description: 'Consultez vos PDF avec zoom haute fidélité et rendez le texte scanné consultable via OCR local.',
      category: 'Lecture',
      categoryKey: 'pdf',
      icon: Eye,
      colorTheme: {
        text: 'text-blue-600',
        bg: 'bg-blue-50/80',
        border: 'border-blue-200',
        glow: 'rgba(37, 99, 235, 0.4)',
      },
    },
    {
      id: 'ai' as ToolId,
      name: 'Résumer un PDF avec l’IA',
      description: 'Analysez en profondeur le contenu de votre PDF, posez des questions et générez des synthèses ciblées.',
      category: 'Intelligence',
      categoryKey: 'pdf',
      icon: Sparkles,
      colorTheme: {
        text: 'text-violet-600',
        bg: 'bg-violet-50/80',
        border: 'border-violet-200',
        glow: 'rgba(139, 92, 246, 0.4)',
      },
    },
    {
      id: 'pdf-compare' as ToolId,
      name: 'Comparer Deux PDF',
      description: 'Placez deux versions d’un document côte à côte pour détecter instantanément les différences.',
      category: 'Comparaison',
      categoryKey: 'pdf',
      icon: GitCompare,
      colorTheme: {
        text: 'text-blue-600',
        bg: 'bg-blue-50/80',
        border: 'border-blue-200',
        glow: 'rgba(37, 99, 235, 0.4)',
      },
    },
    {
      id: 'pdf-flatten' as ToolId,
      name: 'Aplatir un PDF',
      description: 'Fusionnez calques, annotations et formulaires interactifs pour figer le document de façon permanente.',
      category: 'Sécurité',
      categoryKey: 'pdf',
      icon: Layers,
      colorTheme: {
        text: 'text-slate-600',
        bg: 'bg-slate-50/80',
        border: 'border-slate-200',
        glow: 'rgba(100, 116, 139, 0.4)',
      },
    },
    {
      id: 'pdf-extract-images' as ToolId,
      name: 'Extraire les Images du PDF',
      description: 'Extrayez chaque illustration ou page en images haute définition JPG dans une archive ZIP.',
      category: 'Extraction',
      categoryKey: 'pdf',
      icon: FileImage,
      colorTheme: {
        text: 'text-emerald-600',
        bg: 'bg-emerald-50/80',
        border: 'border-emerald-200',
        glow: 'rgba(16, 185, 129, 0.4)',
      },
    },
    {
      id: 'pdf-extract-tables' as ToolId,
      name: 'Extraire les Tableaux (Excel / CSV)',
      description: 'Convertissez les tableaux et données tabulaires de vos documents PDF vers un format tableur CSV.',
      category: 'Données',
      categoryKey: 'pdf',
      icon: FileSpreadsheet,
      colorTheme: {
        text: 'text-emerald-600',
        bg: 'bg-emerald-50/80',
        border: 'border-emerald-200',
        glow: 'rgba(16, 185, 129, 0.4)',
      },
    },
    {
      id: 'pdf-redact' as ToolId,
      name: 'Caviarder (Masquer Texte Sensible)',
      description: 'Appliquez des rectangles noirs de masquage inaltérables pour protéger les données confidentielles.',
      category: 'Confidentialité',
      categoryKey: 'pdf',
      icon: EyeOff,
      colorTheme: {
        text: 'text-rose-600',
        bg: 'bg-rose-50/80',
        border: 'border-rose-200',
        glow: 'rgba(225, 29, 72, 0.4)',
      },
    },
    {
      id: 'pdf-header-footer' as ToolId,
      name: 'Ajouter En-têtes & Pieds de page',
      description: 'Insérez des mentions légales, références de projet ou dates en haut et en bas de vos pages.',
      category: 'Mise en page',
      categoryKey: 'pdf',
      icon: FileText,
      colorTheme: {
        text: 'text-indigo-600',
        bg: 'bg-indigo-50/80',
        border: 'border-indigo-200',
        glow: 'rgba(99, 102, 241, 0.4)',
      },
    },
    {
      id: 'pdf-repair' as ToolId,
      name: 'Réparer un PDF Corrompu',
      description: 'Reconstruisez la structure interne et les tables d’index XREF des fichiers PDF endommagés.',
      category: 'Réparation',
      categoryKey: 'pdf',
      icon: Wrench,
      colorTheme: {
        text: 'text-amber-600',
        bg: 'bg-amber-50/80',
        border: 'border-amber-200',
        glow: 'rgba(217, 119, 6, 0.4)',
      },
    },
    {
      id: 'pdf-resize-booklet' as ToolId,
      name: 'Redimensionner Pages & Livret',
      description: 'Adaptez le format de page (A4, US Letter, A3) et préparez vos documents pour l’impression livret.',
      category: 'Format',
      categoryKey: 'pdf',
      icon: BookOpen,
      colorTheme: {
        text: 'text-purple-600',
        bg: 'bg-purple-50/80',
        border: 'border-purple-200',
        glow: 'rgba(168, 85, 247, 0.4)',
      },
    },

    // --- 2. OUTILS IMAGES ---
    {
      id: 'image-convert' as ToolId,
      name: 'Convertisseur & Compresseur Image',
      description: 'Convertissez et compressez vos images (JPG, PNG, WEBP) avec redimensionnement et réglage qualité.',
      category: 'Format',
      categoryKey: 'image',
      icon: SlidersHorizontal,
      colorTheme: {
        text: 'text-teal-600',
        bg: 'bg-teal-50/80',
        border: 'border-teal-200',
        glow: 'rgba(20, 184, 166, 0.4)',
      },
    },
    {
      id: 'image-crop' as ToolId,
      name: 'Redimensionner / Recadrer / Pivoter',
      description: 'Recadrez avec précision, pivotez ou redimensionnez vos images en conservant les proportions.',
      category: 'Cadrage',
      categoryKey: 'image',
      icon: Crop,
      colorTheme: {
        text: 'text-emerald-600',
        bg: 'bg-emerald-50/80',
        border: 'border-emerald-200',
        glow: 'rgba(16, 185, 129, 0.4)',
      },
    },
    {
      id: 'image-filter' as ToolId,
      name: 'Filtres et Retouches',
      description: 'Ajustez la luminosité, le contraste, la saturation, le flou artistique ou appliquez des filtres photo.',
      category: 'Retouche',
      categoryKey: 'image',
      icon: Palette,
      colorTheme: {
        text: 'text-purple-600',
        bg: 'bg-purple-50/80',
        border: 'border-purple-200',
        glow: 'rgba(168, 85, 247, 0.4)',
      },
    },
    {
      id: 'qr' as ToolId,
      name: 'Studio QR Code & Codes-barres',
      description: 'Générez des QR codes personnalisés haute résolution (URL, Wi-Fi, vCard) et lisez des QR codes existants.',
      category: 'Générateur',
      categoryKey: 'image',
      icon: QrCode,
      colorTheme: {
        text: 'text-indigo-600',
        bg: 'bg-indigo-50/80',
        border: 'border-indigo-200',
        glow: 'rgba(99, 102, 241, 0.4)',
      },
    },
    {
      id: 'image-meme' as ToolId,
      name: 'Générateur de Mèmes',
      description: 'Ajoutez des textes percutants en haut et en bas de vos photos avec contours contrastés.',
      category: 'Création',
      categoryKey: 'image',
      icon: Sparkles,
      colorTheme: {
        text: 'text-pink-600',
        bg: 'bg-pink-50/80',
        border: 'border-pink-200',
        glow: 'rgba(236, 72, 153, 0.4)',
      },
    },
    {
      id: 'image-palette' as ToolId,
      name: 'Extraction de Couleurs (Palette)',
      description: 'Extrayez les couleurs dominantes d’une photo avec codes HEX, RGB et valeurs CSS en un clic.',
      category: 'Couleurs',
      categoryKey: 'image',
      icon: Palette,
      colorTheme: {
        text: 'text-teal-600',
        bg: 'bg-teal-50/80',
        border: 'border-teal-200',
        glow: 'rgba(20, 184, 166, 0.4)',
      },
    },
    {
      id: 'image-social-crop' as ToolId,
      name: 'Images pour Réseaux Sociaux',
      description: 'Recadrez aux dimensions idéales : Post Instagram, Story 9:16, bannière YouTube, Twitter/X.',
      category: 'Social',
      categoryKey: 'image',
      icon: Crop,
      colorTheme: {
        text: 'text-purple-600',
        bg: 'bg-purple-50/80',
        border: 'border-purple-200',
        glow: 'rgba(168, 85, 247, 0.4)',
      },
    },
    {
      id: 'image-collage' as ToolId,
      name: 'Créateur de Collages',
      description: 'Assemblez plusieurs photos en mosaïque esthétique avec disposition en grille et bordures.',
      category: 'Assemblage',
      categoryKey: 'image',
      icon: Layers,
      colorTheme: {
        text: 'text-indigo-600',
        bg: 'bg-indigo-50/80',
        border: 'border-indigo-200',
        glow: 'rgba(99, 102, 241, 0.4)',
      },
    },
    {
      id: 'image-exif-cleaner' as ToolId,
      name: 'Suppression Métadonnées EXIF',
      description: 'Nettoyez les coordonnées GPS, la date et le modèle d’appareil de vos photos avant publication.',
      category: 'Confidentialité',
      categoryKey: 'image',
      icon: EyeOff,
      colorTheme: {
        text: 'text-rose-600',
        bg: 'bg-rose-50/80',
        border: 'border-rose-200',
        glow: 'rgba(225, 29, 72, 0.4)',
      },
    },
    {
      id: 'image-gradients' as ToolId,
      name: 'Générateur de Dégradés',
      description: 'Créez des fonds d’écran et arrière-plans dégradés haute résolution personnalisés.',
      category: 'Design',
      categoryKey: 'image',
      icon: Sparkles,
      colorTheme: {
        text: 'text-amber-600',
        bg: 'bg-amber-50/80',
        border: 'border-amber-200',
        glow: 'rgba(217, 119, 6, 0.4)',
      },
    },
    {
      id: 'image-favicon' as ToolId,
      name: 'Générateur de Favicon & Icônes',
      description: 'Générez automatiquement le pack complet d’icônes web et mobiles (16x16, 32x32, 180x180, 512x512).',
      category: 'Web',
      categoryKey: 'image',
      icon: FolderArchive,
      colorTheme: {
        text: 'text-emerald-600',
        bg: 'bg-emerald-50/80',
        border: 'border-emerald-200',
        glow: 'rgba(16, 185, 129, 0.4)',
      },
    },
    {
      id: 'image-watermark' as ToolId,
      name: 'Ajouter Texte, Filigrane ou Logo',
      description: 'Incrustez vos filigranes ou logos sur vos images avec transparence et orientation modulables.',
      category: 'Protection',
      categoryKey: 'image',
      icon: Stamp,
      colorTheme: {
        text: 'text-sky-600',
        bg: 'bg-sky-50/80',
        border: 'border-sky-200',
        glow: 'rgba(14, 165, 233, 0.4)',
      },
    },
    {
      id: 'image-remove-bg' as ToolId,
      name: 'Supprimer l’Arrière-plan',
      description: 'Détourez le sujet principal de votre image pour créer un fond PNG transparent net.',
      category: 'Détourage',
      categoryKey: 'image',
      icon: Scissors,
      colorTheme: {
        text: 'text-pink-600',
        bg: 'bg-pink-50/80',
        border: 'border-pink-200',
        glow: 'rgba(236, 72, 153, 0.4)',
      },
    },
    {
      id: 'image-pixel-art' as ToolId,
      name: 'Pixelisation / Censure',
      description: 'Appliquez un effet pixel rétro ou masquez les visages et plaques d’immatriculation.',
      category: 'Effets',
      categoryKey: 'image',
      icon: SlidersHorizontal,
      colorTheme: {
        text: 'text-purple-600',
        bg: 'bg-purple-50/80',
        border: 'border-purple-200',
        glow: 'rgba(168, 85, 247, 0.4)',
      },
    },
    {
      id: 'image-flip' as ToolId,
      name: 'Symétrie & Effet Miroir',
      description: 'Inversez horizontalement ou verticalement votre image en conservant la pleine définition.',
      category: 'Géométrie',
      categoryKey: 'image',
      icon: FlipHorizontal,
      colorTheme: {
        text: 'text-blue-600',
        bg: 'bg-blue-50/80',
        border: 'border-blue-200',
        glow: 'rgba(37, 99, 235, 0.4)',
      },
    },
    {
      id: 'image-prompt-extractor' as ToolId,
      name: 'Extraire Prompt sur l’Image (IA)',
      description: 'Analysez une photo pour générer automatiquement les prompts Midjourney, FLUX et DALL-E 3.',
      category: 'Génération IA',
      categoryKey: 'image',
      icon: Wand2,
      colorTheme: {
        text: 'text-amber-600',
        bg: 'bg-amber-50/80',
        border: 'border-amber-200',
        glow: 'rgba(217, 119, 6, 0.4)',
      },
    },

    // --- 3. OUTILS VIDÉOS ---
    {
      id: 'video-trim' as ToolId,
      name: 'Couper / Rogner une Vidéo',
      description: 'Définissez les repères de début et de fin sur la timeline et découpez votre extrait vidéo en local.',
      category: 'Montage',
      categoryKey: 'video',
      icon: Scissors,
      colorTheme: {
        text: 'text-rose-600',
        bg: 'bg-rose-50/80',
        border: 'border-rose-200',
        glow: 'rgba(244, 63, 94, 0.4)',
      },
    },
    {
      id: 'video-to-audio' as ToolId,
      name: 'Extraire l’Audio (WAV / MP3)',
      description: 'Extrayez et décodez la bande sonore de n’importe quelle vidéo pour créer un fichier audio WAV pur.',
      category: 'Audio',
      categoryKey: 'video',
      icon: Music,
      colorTheme: {
        text: 'text-indigo-600',
        bg: 'bg-indigo-50/80',
        border: 'border-indigo-200',
        glow: 'rgba(99, 102, 241, 0.4)',
      },
    },
    {
      id: 'video-snapshot' as ToolId,
      name: 'Extraire des Images (Captures)',
      description: 'Prenez des photos nettes en pleine résolution d’un instant précis de votre vidéo en un seul clic.',
      category: 'Capture',
      categoryKey: 'video',
      icon: Camera,
      colorTheme: {
        text: 'text-pink-600',
        bg: 'bg-pink-50/80',
        border: 'border-pink-200',
        glow: 'rgba(236, 72, 153, 0.4)',
      },
    },
    {
      id: 'video-screen-recorder' as ToolId,
      name: 'Enregistreur d’Écran & Webcam',
      description: 'Enregistrez votre écran d’ordinateur, onglet ou fenêtre avec le micro sans logiciel externe.',
      category: 'Capture',
      categoryKey: 'video',
      icon: Radio,
      colorTheme: {
        text: 'text-rose-600',
        bg: 'bg-rose-50/80',
        border: 'border-rose-200',
        glow: 'rgba(244, 63, 94, 0.4)',
      },
    },
    {
      id: 'video-speed' as ToolId,
      name: 'Modifier la Vitesse (Accéléré / Ralenti)',
      description: 'Accélérez pour un effet timelapse dynamique ou ralentissez pour apprécier chaque détail.',
      category: 'Vitesse',
      categoryKey: 'video',
      icon: FastForward,
      colorTheme: {
        text: 'text-amber-600',
        bg: 'bg-amber-50/80',
        border: 'border-amber-200',
        glow: 'rgba(217, 119, 6, 0.4)',
      },
    },
    {
      id: 'video-gif' as ToolId,
      name: 'Vidéo en GIF Animé',
      description: 'Transformez vos clips vidéo en boucles GIF animées légères à partager sur les réseaux.',
      category: 'Animation',
      categoryKey: 'video',
      icon: Sparkles,
      colorTheme: {
        text: 'text-purple-600',
        bg: 'bg-purple-50/80',
        border: 'border-purple-200',
        glow: 'rgba(168, 85, 247, 0.4)',
      },
    },
    {
      id: 'video-watermark' as ToolId,
      name: 'Ajouter du Texte ou Filigrane sur Vidéo',
      description: 'Incrustez le logo de votre chaîne ou un texte de copyright directement sur votre clip vidéo.',
      category: 'Protection',
      categoryKey: 'video',
      icon: Stamp,
      colorTheme: {
        text: 'text-sky-600',
        bg: 'bg-sky-50/80',
        border: 'border-sky-200',
        glow: 'rgba(14, 165, 233, 0.4)',
      },
    },
    {
      id: 'video-resize' as ToolId,
      name: 'Redimensionner Format (16:9, 9:16, 1:1)',
      description: 'Adaptez votre vidéo aux ratios modernes pour YouTube, Shorts, TikTok et Reels.',
      category: 'Format',
      categoryKey: 'video',
      icon: Crop,
      colorTheme: {
        text: 'text-pink-600',
        bg: 'bg-pink-50/80',
        border: 'border-pink-200',
        glow: 'rgba(236, 72, 153, 0.4)',
      },
    },
    {
      id: 'video-mute' as ToolId,
      name: 'Supprimer ou Remplacer l’Audio',
      description: 'Supprimez la piste audio indésirable pour obtenir une vidéo parfaitement silencieuse.',
      category: 'Audio',
      categoryKey: 'video',
      icon: VolumeX,
      colorTheme: {
        text: 'text-slate-600',
        bg: 'bg-slate-50/80',
        border: 'border-slate-200',
        glow: 'rgba(100, 116, 139, 0.4)',
      },
    },
    {
      id: 'video-compress' as ToolId,
      name: 'Compresser une Vidéo',
      description: 'Réduisez le poids de vos fichiers vidéo pour les transférer plus vite sans perte visible.',
      category: 'Optimisation',
      categoryKey: 'video',
      icon: Zap,
      colorTheme: {
        text: 'text-amber-600',
        bg: 'bg-amber-50/80',
        border: 'border-amber-200',
        glow: 'rgba(217, 119, 6, 0.4)',
      },
    },
    {
      id: 'video-summarizer' as ToolId,
      name: 'Vidéo Summarizer (IA)',
      description: 'Résumez une vidéo, dégagez les points clés, un chapitrage temporel et un plan d’action en un clin d’œil.',
      category: 'Intelligence IA',
      categoryKey: 'video',
      icon: Sparkles,
      colorTheme: {
        text: 'text-purple-600',
        bg: 'bg-purple-50/80',
        border: 'border-purple-200',
        glow: 'rgba(168, 85, 247, 0.4)',
      },
    },
    {
      id: 'audio-summarizer' as ToolId,
      name: 'Audio Summarizer (IA)',
      description: 'Synthétisez vos podcasts, réunions enregistrées, dictaphones et interviews avec l’IA.',
      category: 'Intelligence IA',
      categoryKey: 'video',
      icon: Music,
      colorTheme: {
        text: 'text-indigo-600',
        bg: 'bg-indigo-50/80',
        border: 'border-indigo-200',
        glow: 'rgba(99, 102, 241, 0.4)',
      },
    },
    {
      id: 'video-prompt-extractor' as ToolId,
      name: 'Extraire Prompt sur Vidéo (IA)',
      description: 'Générez les prompts cinématographiques pour recréer une vidéo sur Sora, Runway Gen-3, Kling ou Veo.',
      category: 'Génération IA',
      categoryKey: 'video',
      icon: Wand2,
      colorTheme: {
        text: 'text-rose-600',
        bg: 'bg-rose-50/80',
        border: 'border-rose-200',
        glow: 'rgba(244, 63, 94, 0.4)',
      },
    },

    // --- 4. MINIATURES YOUTUBE ---
    {
      id: 'yt-thumbnail-extractor' as ToolId,
      name: 'Extracteur de Miniatures en 1 Clic',
      description: 'Collez le lien d’une vidéo pour extraire la miniature originale en HD Maxi (1280x720) ou en masse (ZIP).',
      category: 'Extraction',
      categoryKey: 'youtube',
      icon: Youtube,
      colorTheme: {
        text: 'text-red-600',
        bg: 'bg-red-50/80',
        border: 'border-red-200',
        glow: 'rgba(239, 68, 68, 0.4)',
      },
    },
    {
      id: 'yt-thumbnail-editor' as ToolId,
      name: 'Éditeur Studio de Miniatures',
      description: 'Créez des miniatures YouTube percutantes avec titres en gros impact, flèches rouges, stickers et safe area.',
      category: 'Studio',
      categoryKey: 'youtube',
      icon: Sparkles,
      colorTheme: {
        text: 'text-red-600',
        bg: 'bg-red-50/80',
        border: 'border-red-200',
        glow: 'rgba(239, 68, 68, 0.4)',
      },
    },

    // --- 5. OUTILS TRANSVERSAUX ---
    {
      id: 'universal-converter' as ToolId,
      name: 'Convertisseur Universel de Fichiers',
      description: 'Convertissez n’importe quel fichier entre formats : PDF, Images, Audio, Vidéo, CSV et JSON.',
      category: 'Conversion',
      categoryKey: 'transversal',
      icon: Repeat,
      colorTheme: {
        text: 'text-indigo-600',
        bg: 'bg-indigo-50/80',
        border: 'border-indigo-200',
        glow: 'rgba(99, 102, 241, 0.4)',
      },
    },
    {
      id: 'batch-compressor' as ToolId,
      name: 'Compresseur de Fichiers par Lots',
      description: 'Optimisez et allégez simultanément plusieurs documents PDF et images avec contrôle de qualité.',
      category: 'Lots',
      categoryKey: 'transversal',
      icon: Zap,
      colorTheme: {
        text: 'text-amber-600',
        bg: 'bg-amber-50/80',
        border: 'border-amber-200',
        glow: 'rgba(217, 119, 6, 0.4)',
      },
    },
    {
      id: 'batch-renamer' as ToolId,
      name: 'Renommeur de Fichiers en Masse',
      description: 'Modifiez les noms de centaines de fichiers avec préfixes, suffixes, numérotation et remplacement.',
      category: 'Organisation',
      categoryKey: 'transversal',
      icon: FileEdit,
      colorTheme: {
        text: 'text-purple-600',
        bg: 'bg-purple-50/80',
        border: 'border-purple-200',
        glow: 'rgba(168, 85, 247, 0.4)',
      },
    },
    {
      id: 'temp-file-share' as ToolId,
      name: 'Partage de Fichiers par Lien & QR',
      description: 'Transférez rapidement vos fichiers vers votre smartphone ou vos collègues via QR code sans cloud.',
      category: 'Partage',
      categoryKey: 'transversal',
      icon: Share2,
      colorTheme: {
        text: 'text-teal-600',
        bg: 'bg-teal-50/80',
        border: 'border-teal-200',
        glow: 'rgba(20, 184, 166, 0.4)',
      },
    },
    {
      id: 'files-history' as ToolId,
      name: 'Historique & Coffre-fort des Fichiers',
      description: 'Consultez la mémoire des fichiers traités durant votre session, leurs métriques et téléchargez-les.',
      category: 'Historique',
      categoryKey: 'transversal',
      icon: History,
      colorTheme: {
        text: 'text-slate-600',
        bg: 'bg-slate-50/80',
        border: 'border-slate-200',
        glow: 'rgba(100, 116, 139, 0.4)',
      },
    },
  ];

  const categories = [
    {
      key: 'pdf' as ToolCategoryKey,
      label: 'PDF',
      count: tools.filter((t) => t.categoryKey === 'pdf').length,
      icon: FileText,
      accent: {
        gradient: 'linear-gradient(180deg, #f43f5e 0%, #e11d48 55%, #be123c 100%)',
        activeShadow: 'rgba(225, 29, 72, 0.45)',
        bottomLedge: '#881337',
        iconActiveColor: 'text-white',
        iconInactiveColor: 'text-rose-600',
        glowColor: 'rgba(244, 63, 94, 0.45)',
        badgeActive: 'bg-black/25 text-white border border-white/20',
      },
    },
    {
      key: 'image' as ToolCategoryKey,
      label: 'Images',
      count: tools.filter((t) => t.categoryKey === 'image').length,
      icon: ImageIcon,
      accent: {
        gradient: 'linear-gradient(180deg, #10b981 0%, #059669 55%, #047857 100%)',
        activeShadow: 'rgba(16, 185, 129, 0.45)',
        bottomLedge: '#064e3b',
        iconActiveColor: 'text-white',
        iconInactiveColor: 'text-emerald-600',
        glowColor: 'rgba(16, 185, 129, 0.45)',
        badgeActive: 'bg-black/25 text-white border border-white/20',
      },
    },
    {
      key: 'video' as ToolCategoryKey,
      label: 'Vidéos',
      count: tools.filter((t) => t.categoryKey === 'video').length,
      icon: Film,
      accent: {
        gradient: 'linear-gradient(180deg, #6366f1 0%, #4f46e5 55%, #4338ca 100%)',
        activeShadow: 'rgba(99, 102, 241, 0.45)',
        bottomLedge: '#312e81',
        iconActiveColor: 'text-white',
        iconInactiveColor: 'text-indigo-600',
        glowColor: 'rgba(99, 102, 241, 0.45)',
        badgeActive: 'bg-black/25 text-white border border-white/20',
      },
    },
    {
      key: 'youtube' as ToolCategoryKey,
      label: 'YouTube',
      count: tools.filter((t) => t.categoryKey === 'youtube').length,
      icon: Youtube,
      accent: {
        gradient: 'linear-gradient(180deg, #ef4444 0%, #dc2626 55%, #b91c1c 100%)',
        activeShadow: 'rgba(239, 68, 68, 0.45)',
        bottomLedge: '#7f1d1d',
        iconActiveColor: 'text-white',
        iconInactiveColor: 'text-red-600',
        glowColor: 'rgba(239, 68, 68, 0.45)',
        badgeActive: 'bg-black/25 text-white border border-white/20',
      },
    },
    {
      key: 'transversal' as ToolCategoryKey,
      label: 'Lots & Convert.',
      count: tools.filter((t) => t.categoryKey === 'transversal').length,
      icon: Repeat,
      accent: {
        gradient: 'linear-gradient(180deg, #8b5cf6 0%, #7c3aed 55%, #6d28d9 100%)',
        activeShadow: 'rgba(139, 92, 246, 0.45)',
        bottomLedge: '#4c1d95',
        iconActiveColor: 'text-white',
        iconInactiveColor: 'text-purple-600',
        glowColor: 'rgba(139, 92, 246, 0.45)',
        badgeActive: 'bg-black/25 text-white border border-white/20',
      },
    },
  ];

  const filteredTools = tools.filter((tool) => {
    const matchesCategory = tool.categoryKey === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-5 sm:space-y-6 pt-1 pb-6">
      {/* 3D Category Switcher & Search Bar */}
      <section className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 max-w-6xl mx-auto px-1">
        {/* Real 3D Animated Category Buttons */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-2.5 flex-1">
          {categories.map((cat) => (
            <CategoryTab3D
              key={cat.key}
              id={cat.key}
              label={cat.label}
              count={cat.count}
              icon={cat.icon}
              isActive={selectedCategory === cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              accent={cat.accent}
            />
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher parmi les outils..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
            >
              ×
            </button>
          )}
        </div>
      </section>

      {/* Grid of Tools with 3D Interaction */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-6xl mx-auto px-1">
        {filteredTools.map((tool, idx) => (
          <Card3D
            key={tool.id}
            id={tool.id}
            name={tool.name}
            description={tool.description}
            category={tool.category}
            icon={tool.icon}
            colorTheme={tool.colorTheme}
            index={idx}
            onSelect={onSelectTool}
          />
        ))}

        {filteredTools.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aucun outil ne correspond à « {searchQuery} » dans cette catégorie.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs font-semibold text-rose-600 hover:underline"
            >
              Effacer la recherche
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
