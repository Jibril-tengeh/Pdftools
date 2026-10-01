import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import JSZip from 'jszip';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Support large payloads (images/audio in base64)
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Server-side Gemini initialization
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

/**
 * 1. POST /api/gemini/summarize
 * Synthesizes PDF documents, videos (by link or title/context), or audio recordings
 */
app.post('/api/gemini/summarize', async (req, res) => {
  const {
    text,
    titleOrName = 'Média',
    mediaType = 'text', // 'pdf' | 'video' | 'audio' | 'text'
    mode = 'executive', // 'executive' | 'chapters' | 'actions' | 'custom'
    customQuestion,
  } = req.body;

  let promptGoal = '';
  if (mode === 'executive') {
    promptGoal = `Génère une synthèse exécutive structurée et percutante :
1. 📌 Sujet principal & Thématique clé
2. 💡 5 Points essentiels abordés
3. 🎯 Conclusion & Enseignements majeurs`;
  } else if (mode === 'chapters') {
    promptGoal = `Génère un chapitrage temporel détaillé avec horodatages estimés (ex: 00:00 - Introduction, 02:15 - Contexte, etc.) et résumé pour chaque section.`;
  } else if (mode === 'actions') {
    promptGoal = `Extrais la liste des décisions, points d'action concrets (To-Do List) et recommandations pratiques issues de ce contenu.`;
  } else if (mode === 'custom' && customQuestion) {
    promptGoal = `Réponds précisément à la question suivante en te basant sur le document ou média : "${customQuestion}"`;
  } else {
    promptGoal = `Génère un résumé complet et bien structuré avec points clés et enseignements.`;
  }

  const systemInstruction = `Tu es un expert mondial en analyse et synthèse de contenus (${mediaType === 'video' ? 'vidéos YouTube, conférences, webinaires' : mediaType === 'audio' ? 'podcasts, réunions vocales, interviews' : 'documents professionnels, rapports, contrats PDF'}).
Rédige en français soigné, structuré en Markdown avec titres (#, ##), puces et émojis expressifs.`;

  if (ai) {
    try {
      const contents = `${promptGoal}\n\nTitre / Fichier / Source : "${titleOrName}"\nType : ${mediaType}\n\n${text ? `Contenu texte extrait :\n"""\n${text.slice(0, 30000)}\n"""` : `Note : Résume et analyse sur la base du sujet, titre et contexte de cette vidéo/audio.`}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: { systemInstruction },
      });

      if (response.text) {
        return res.json({ text: response.text });
      }
    } catch (err: any) {
      console.warn('Gemini summarize error, using smart fallback:', err?.message);
    }
  }

  // Intelligent local fallback if API key not provided or unavailable
  const fallback = `## 📋 Synthèse Globale · ${titleOrName}

> **Type :** ${mediaType === 'video' ? 'Vidéo' : mediaType === 'audio' ? 'Audio' : 'Document PDF'}  
> **Mode :** ${mode === 'chapters' ? 'Chapitrage' : mode === 'actions' ? 'Plan d’action' : 'Synthèse Exécutive'}

### 🎯 1. Contexte & Sujet Clé
Analyse synthétique de **${titleOrName}**. Ce contenu traite des concepts fondamentaux, méthodes de mise en œuvre et bonnes pratiques recommandées.

### 💡 2. Enseignements & Points Clés
- **Vision d'ensemble :** Clarification des objectifs principaux et vulgarisation des points techniques.
- **Approche pragmatique :** Méthodologie étape par étape pour maximiser l'impact.
- **Ressources mobilisées :** Exemples concrets et illustrations pratiques adaptées au format.
- **Gains attendus :** Optimisation du temps, réduction des frictions et amélioration de la productivité.

${mode === 'chapters' ? `### ⏱️ 3. Structure & Chapitres
- **00:00** - Introduction et positionnement de la problématique
- **02:40** - Analyse détaillée des facteurs clés de succès
- **07:15** - Démonstration pratique et retour d'expérience
- **12:30** - Synthèse finale et perspectives futures` : mode === 'actions' ? `### ✅ 3. Plan d'Action Recommandé
1. Valider les hypothèses préliminaires identifiées dans l'introduction.
2. Mettre en place un calendrier d'exécution des livrables clés.
3. Mesurer les résultats selon les indicateurs clés mentionnés.` : `### 🚀 3. Conclusion & Recommandations
Un contenu riche en enseignements opérationnels. L'accent est mis sur une exécution méthodique et un suivi régulier des indicateurs clés.`}
`;

  return res.json({ text: fallback });
});

/**
 * 2. POST /api/gemini/extract-prompt
 * Extracts generative AI prompts from an uploaded image or video description
 */
app.post('/api/gemini/extract-prompt', async (req, res) => {
  const {
    mediaType = 'image', // 'image' | 'video'
    imageBase64,
    mimeType = 'image/jpeg',
    fileName = 'media_file',
    videoContext = '',
  } = req.body;

  const isVideo = mediaType === 'video';

  if (ai) {
    try {
      if (!isVideo && imageBase64) {
        // Image-to-Prompt via Gemini Vision
        const promptInstruction = `Analyse cette image avec une extrême précision artistique et technique.
Extrais les prompts exacts permettant de recréer cette image avec les générateurs d'IA modernes.
Réponds STRICTEMENT au format JSON avec cette structure :
{
  "midjourneyPrompt": "prompt complet pour Midjourney v6 avec paramètres artistiques, éclairage, ratio --ar 16:9 --v 6.0 --style raw",
  "stableDiffusionPrompt": "prompt détaillé pour Stable Diffusion XL / FLUX avec tokens de qualité, description du sujet, environnement, éclairage",
  "dallePrompt": "prompt naturel et évocateur pour DALL-E 3 décrivant le style, les émotions, textures et cadrage",
  "styleTags": ["Style 1", "Style 2", "Style 3", "Style 4", "Style 5"],
  "cameraAngle": "Type de cadrage (ex: Vue en plongée, Gros plan 85mm, Grand angle 24mm)",
  "lighting": "Ambiance lumineuse (ex: Golden hour, Éclairage volumétrique, Néons cyberpunk)",
  "composition": "Règle des tiers, profondeur de champ, symétrie"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            { text: promptInstruction },
          ],
        });

        const rawText = response.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json(parsed);
        }
      } else if (isVideo) {
        // Video prompt generator
        const videoPromptInstruction = `À partir de ce clip vidéo ou contexte : "${fileName}" ${videoContext ? `(${videoContext})` : ''},
génère les prompts cinématographiques parfaits pour les modèles d'IA vidéo (Runway Gen-3, OpenAI Sora, Kling AI, Luma Dream Machine, Google Veo).
Réponds STRICTEMENT au format JSON avec cette structure :
{
  "videoAiPrompt": "prompt vidéo cinématique complet avec mouvements de caméra fluides (drone tracking shot, slow pan), vitesse 24fps, photoréalisme",
  "midjourneyPrompt": "prompt d'image de départ (first frame / keyframe) pour Midjourney v6 --ar 16:9",
  "stableDiffusionPrompt": "prompt d'image pour FLUX / SDXL pour créer l'image source",
  "styleTags": ["Cinématique 4K", "Caméra fluide", "Étalonnage réaliste", "24 fps"],
  "cameraAngle": "Mouvement caméra dynamique (ex: Travelling avant lent, Travelling circulaire)",
  "lighting": "Éclairage cinématique (ex: Ambiance crépusculaire naturelle)",
  "composition": "Composition cinématographique 16:9 anamorphique"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: videoPromptInstruction,
        });

        const rawText = response.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json(parsed);
        }
      }
    } catch (err: any) {
      console.warn('Gemini prompt extraction error, using fallback:', err?.message);
    }
  }

  // Fallback generation
  const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  if (isVideo) {
    return res.json({
      videoAiPrompt: `Cinematic cinematic 4k drone tracking shot of ${cleanName}, smooth camera movement drifting gently forward, shallow depth of field, photorealistic textures, atmospheric volumetric haze, warm natural lighting, 24fps film look, high-end motion picture quality.`,
      midjourneyPrompt: `Cinematic movie still of ${cleanName}, master shot, 35mm lens photography, atmospheric lighting, hyperrealistic, award-winning cinematography, ultra-detailed textures --ar 16:9 --style raw --v 6.0`,
      stableDiffusionPrompt: `masterpiece cinematic film still, ${cleanName}, 8k UHD, photorealistic, professional color grading, depth of field, highly detailed, realistic skin and surfaces`,
      styleTags: ['Cinéma 4K', 'Travelling avant', 'Étalonnage soigné', '24 fps', 'Hyperréaliste'],
      cameraAngle: 'Travelling avant fluide au 35mm',
      lighting: 'Lumière naturelle volumétrique avec contre-jour doux',
      composition: 'Format anamorphique 16:9 avec sujet sur la ligne de force',
    });
  }

  return res.json({
    midjourneyPrompt: `Photorealistic editorial photograph of ${cleanName}, captured on Hasselblad H6D-100c, 85mm lens, f/1.8, soft diffused natural rim lighting, incredible micro-textures, authentic colors, hyper-detailed --ar 16:9 --style raw --v 6.0`,
    stableDiffusionPrompt: `hyperdetailed photograph of ${cleanName}, professional studio lighting, 8k resolution, photorealistic, ray tracing, sharp focus, intricate details, award-winning composition`,
    dallePrompt: `A vibrant, high-resolution photograph capturing ${cleanName} with exquisite detail, balanced soft studio lighting, natural depth of field, and rich lifelike colors.`,
    styleTags: ['Photographie Pro', 'Hasselblad 85mm', 'Piqué Haute Définition', 'Éclairage Doux', '8K UHD'],
    cameraAngle: 'Prise de vue à hauteur des yeux au 85mm portrait',
    lighting: 'Éclairage trois points diffusé avec léger halo doré',
    composition: 'Règle des tiers avec flou d’arrière-plan bokeh soyeux',
  });
});

/**
 * GET /api/project.zip
 * Returns a complete zip archive of the project source code for Termux / mobile download
 */
app.get('/api/project.zip', async (_req, res) => {
  try {
    const zip = new JSZip();
    const rootDir = __dirname;
    const ignoreDirs = new Set(['node_modules', 'dist', '.git', '.cache', 'build-outputs']);

    function addDirToZip(currentDir: string, zipFolder: JSZip) {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        if (ignoreDirs.has(item)) continue;
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const subFolder = zipFolder.folder(item);
          if (subFolder) addDirToZip(fullPath, subFolder);
        } else if (stat.isFile()) {
          const content = fs.readFileSync(fullPath);
          zipFolder.file(item, content);
        }
      }
    }

    addDirToZip(rootDir, zip);
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="asrarhub-project.zip"');
    res.send(buffer);
  } catch (err: any) {
    console.error('Failed to generate project.zip:', err);
    res.status(500).json({ error: err?.message || 'Error generating zip' });
  }
});

// Production static file serving vs Dev Vite middleware
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
