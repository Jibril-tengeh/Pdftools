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

// In-memory cache for fast session access
const memoryFileBlobs = new Map<string, { blob: Blob; mimeType: string }>();

const STORAGE_KEY = 'pdf_tools_recent_files_v1';
const DB_NAME = 'pdftools_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'recent_files_blobs';

// IndexedDB Helper for persistent storage across app restarts
function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function persistBlobToIdb(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDatabase();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
  } catch (e) {
    console.warn('Failed to persist blob in IndexedDB:', e);
  }
}

async function getBlobFromIdb(id: string): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function removeBlobFromIdb(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
  } catch {
    // Ignore errors
  }
}

async function clearBlobsFromIdb(): Promise<void> {
  try {
    const db = await openDatabase();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // Ignore errors
  }
}

export function getRecentFiles(): RecentFileRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
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

  // Cache data in memory and persist in IndexedDB
  if (item.data) {
    const blob =
      item.data instanceof Blob
        ? item.data
        : new Blob([item.data as any], { type: item.mimeType || 'application/pdf' });
    memoryFileBlobs.set(id, { blob, mimeType: item.mimeType || 'application/pdf' });
    persistBlobToIdb(id, blob);
  }

  try {
    const existing = getRecentFiles().filter((f) => f.name !== item.name);
    const updated = [record, ...existing].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('recent_files_updated'));
  } catch (e) {
    console.error('Error saving recent file to localStorage:', e);
  }

  return record;
}

export async function downloadCachedRecentFile(id: string, filename: string): Promise<boolean> {
  let blob: Blob | null = memoryFileBlobs.get(id)?.blob || null;
  if (!blob) {
    blob = await getBlobFromIdb(id);
    if (blob) {
      memoryFileBlobs.set(id, { blob, mimeType: blob.type || 'application/pdf' });
    }
  }

  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}

export async function hasCachedBlob(id: string): Promise<boolean> {
  if (memoryFileBlobs.has(id)) return true;
  const blob = await getBlobFromIdb(id);
  if (blob) {
    memoryFileBlobs.set(id, { blob, mimeType: blob.type || 'application/pdf' });
    return true;
  }
  return false;
}

export async function getCachedArrayBuffer(id: string): Promise<ArrayBuffer | null> {
  let blob: Blob | null = memoryFileBlobs.get(id)?.blob || null;
  if (!blob) {
    blob = await getBlobFromIdb(id);
    if (blob) {
      memoryFileBlobs.set(id, { blob, mimeType: blob.type || 'application/pdf' });
    }
  }

  if (!blob) return null;
  return await blob.arrayBuffer();
}

export function openPdfInTool(toolId: ToolId, buffer: ArrayBuffer, filename: string) {
  window.dispatchEvent(
    new CustomEvent('open_pdf_in_tool', {
      detail: { toolId, buffer, filename },
    })
  );
}

export function removeRecentFile(id: string) {
  memoryFileBlobs.delete(id);
  removeBlobFromIdb(id);
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
  clearBlobsFromIdb();
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('recent_files_updated'));
  } catch (e) {
    console.error('Error clearing recent files:', e);
  }
}
