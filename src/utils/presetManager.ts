/**
 * Preset & Settings Manager
 * Allows exporting and importing tool configuration presets (Watermark, Image Conversion, Compression, etc.)
 * into local JSON files for seamless reusability.
 */

export interface ToolPreset<T = any> {
  app: 'pdf-media-studio';
  version: 1;
  tool: string;
  createdAt: string;
  label?: string;
  settings: T;
}

/**
 * Export any tool configuration settings into a formatted JSON file and trigger browser download
 */
export const exportPresetToFile = <T>(tool: string, settings: T, customName?: string) => {
  const preset: ToolPreset<T> = {
    app: 'pdf-media-studio',
    version: 1,
    tool,
    createdAt: new Date().toISOString(),
    label: customName || `Configuration ${tool}`,
    settings,
  };

  const jsonStr = JSON.stringify(preset, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = customName
    ? `${customName.toLowerCase().replace(/[^a-z0-9_-]/gi, '_')}.json`
    : `preset_${tool}_${new Date().toISOString().slice(0, 10)}.json`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Read and validate a JSON preset file selected by the user
 */
export const importPresetFromFile = async <T = any>(file: File): Promise<ToolPreset<T>> => {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      return reject(new Error('Le fichier doit être un fichier JSON (.json)'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Fichier JSON invalide');
        }

        // Validate presence of settings
        if (!parsed.settings) {
          // If the user uploaded raw settings directly without our envelope, accept it
          return resolve({
            app: 'pdf-media-studio',
            version: 1,
            tool: parsed.tool || 'generic',
            createdAt: parsed.createdAt || new Date().toISOString(),
            settings: parsed as T,
          });
        }

        resolve(parsed as ToolPreset<T>);
      } catch (err: any) {
        reject(new Error(`Impossible d'analyser le fichier JSON : ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsText(file);
  });
};

/**
 * Local storage quick preset caching
 */
export const saveQuickPreset = <T>(tool: string, settings: T) => {
  try {
    localStorage.setItem(`pms_preset_${tool}`, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save quick preset to localStorage', e);
  }
};

export const getQuickPreset = <T>(tool: string): T | null => {
  try {
    const raw = localStorage.getItem(`pms_preset_${tool}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
