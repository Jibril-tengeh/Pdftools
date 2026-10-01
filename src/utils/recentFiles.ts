import type { ToolId } from '../types';

export interface RecentFileRecord {
  id: string;
  name: string;
  toolName: string;
  toolId: ToolId;
  timestamp: number;
  size: number;
  pageCount?: number;
}

// In-memory cache for blobs so users can re-download recently processed files
const memoryFileBlobs = new Map<string, { blob: Blob; mimeType: string }>();

const STORAGE_KEY = 'pdf_tools_recent_files_v1';

export function getRecentFiles(): RecentFileRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch (e) {
    console.error('Error reading recent files from localStorage:', e);
    return [];
  }
}

export function addRecentFile(item: {
  name: string;
  toolName: string;
  toolId: ToolId;
  size: number;
  pageCount?: number;
  data?: Uint8Array | Blob | ArrayBuffer;
  mimeType?: string;
}): RecentFileRecord {
  const id = `recent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: RecentFileRecord = {
    id,
    name: item.name,
    toolName: item.toolName,
    toolId: item.toolId,
    timestamp: Date.now(),
    size: item.size,
    pageCount: item.pageCount,
  };

  // Cache data in memory if provided
  if (item.data) {
    const blob =
      item.data instanceof Blob
        ? item.data
        : new Blob([item.data as any], { type: item.mimeType || 'application/pdf' });
    memoryFileBlobs.set(id, { blob, mimeType: item.mimeType || 'application/pdf' });
  }

  try {
    const existing = getRecentFiles().filter((f) => f.name !== item.name);
    const updated = [record, ...existing].slice(0, 5);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('recent_files_updated'));
  } catch (e) {
    console.error('Error saving recent file to localStorage:', e);
  }

  return record;
}

export function downloadCachedRecentFile(id: string, filename: string): boolean {
  const cached = memoryFileBlobs.get(id);
  if (!cached) return false;

  const url = URL.createObjectURL(cached.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}

export function hasCachedBlob(id: string): boolean {
  return memoryFileBlobs.has(id);
}

export function removeRecentFile(id: string) {
  memoryFileBlobs.delete(id);
  try {
    const existing = getRecentFiles().filter((f) => f.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent('recent_files_updated'));
  } catch (e) {
    console.error('Error removing recent file:', e);
  }
}

export function clearRecentFiles() {
  memoryFileBlobs.clear();
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('recent_files_updated'));
  } catch (e) {
    console.error('Error clearing recent files:', e);
  }
}
