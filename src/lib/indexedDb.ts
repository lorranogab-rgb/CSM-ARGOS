// IndexedDB Storage Layer for Argos Inspections & Fleet
// Provides asynchronous, high-capacity offline storage with automatic fallback

const DB_NAME = 'argos_offline_db';
const DB_VERSION = 2;
const STORE_INSPECTIONS = 'inspections';
const STORE_FLEET = 'fleet';
const STORE_DRAFT = 'active_draft';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      if (!db.objectStoreNames.contains(STORE_INSPECTIONS)) {
        db.createObjectStore(STORE_INSPECTIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FLEET)) {
        db.createObjectStore(STORE_FLEET, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DRAFT)) {
        db.createObjectStore(STORE_DRAFT, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalInspection(inspection: Record<string, unknown>): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_INSPECTIONS, 'readwrite');
      const store = tx.objectStore(STORE_INSPECTIONS);
      const req = store.put(inspection);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Falling back to localStorage for inspection:', err);
    try {
      const raw = localStorage.getItem('argos_local_backup_laudos');
      const list: Array<Record<string, unknown>> = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(item => item.id === inspection.id || (item.placa === inspection.placa && item.data === inspection.data));
      if (idx >= 0) {
        list[idx] = inspection;
      } else {
        list.unshift(inspection);
      }
      localStorage.setItem('argos_local_backup_laudos', JSON.stringify(list));
    } catch (e) {
      console.error('[localStorage fallback error]', e);
    }
  }
}

export async function getLocalInspections(): Promise<Array<Record<string, unknown>>> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_INSPECTIONS, 'readonly');
      const store = tx.objectStore(STORE_INSPECTIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const results: Array<Record<string, unknown>> = req.result || [];
        // Merge with legacy localStorage if present
        try {
          const raw = localStorage.getItem('argos_local_backup_laudos');
          if (raw) {
            const list: Array<Record<string, unknown>> = JSON.parse(raw);
            for (const item of list) {
              if (!results.some(r => r.id === item.id || (r.placa === item.placa && r.data === item.data))) {
                results.push(item);
              }
            }
          }
        } catch {
          // ignore
        }
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Fallback get from localStorage:', err);
    try {
      const raw = localStorage.getItem('argos_local_backup_laudos');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export async function deleteLocalInspection(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_INSPECTIONS, 'readwrite');
      const store = tx.objectStore(STORE_INSPECTIONS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Delete error:', err);
  }

  // Also clean from localStorage
  try {
    const raw = localStorage.getItem('argos_local_backup_laudos');
    if (raw) {
      const list: Array<Record<string, unknown>> = JSON.parse(raw);
      const filtered = list.filter(item => {
        const fullData = item.fullData as Record<string, unknown> | undefined;
        return item.id !== id && fullData?.id !== id;
      });
      localStorage.setItem('argos_local_backup_laudos', JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }
}

export interface ActiveInspectionDraft {
  id: string; // 'draft_' + userId
  userId?: string;
  userEmail?: string;
  laudoData: Record<string, unknown>;
  wizPhase: string;
  wizSubPhase: string;
  wizStep: number;
  activeTab: string;
  viewMode: boolean;
  updatedAt: number;
  updatedAtFormatted: string;
  vehicleSummary: {
    placa?: string;
    modelo?: string;
    chassi?: string;
    municipio?: string;
    ano?: string;
    patrimonio?: string;
  };
}

export async function saveActiveInspectionDraft(
  draft: Omit<ActiveInspectionDraft, 'id'> & { id?: string },
  userId?: string
): Promise<void> {
  const effectiveUserId = userId || draft.userId || 'anonymous';
  const draftKey = `draft_${effectiveUserId}`;

  const completeDraft: ActiveInspectionDraft = {
    ...draft,
    id: draftKey,
    userId: effectiveUserId,
    updatedAt: draft.updatedAt || Date.now(),
    updatedAtFormatted: draft.updatedAtFormatted || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };

  // 1. Save to localStorage immediately (isolated per user)
  const localKey = `argos_active_inspection_draft_${effectiveUserId}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(completeDraft));
  } catch {
    // If quota exceeded (e.g. photos), save without heavy photo data in localStorage fallback
    try {
      const lightweight = {
        ...completeDraft,
        laudoData: {
          ...completeDraft.laudoData,
          chassisPhoto: completeDraft.laudoData?.chassisPhoto ? '[saved_in_idb]' : null,
          motorPhoto: completeDraft.laudoData?.motorPhoto ? '[saved_in_idb]' : null,
        }
      };
      localStorage.setItem(localKey, JSON.stringify(lightweight));
    } catch (e2) {
      console.warn('[localStorage draft save error]', e2);
    }
  }

  // 2. Save full payload to IndexedDB (supports high capacity base64 photos)
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFT, 'readwrite');
      const store = tx.objectStore(STORE_DRAFT);
      const req = store.put(completeDraft);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (idbErr) {
    console.warn('[IndexedDB draft save error]', idbErr);
  }
}

export async function getActiveInspectionDraft(userId?: string): Promise<ActiveInspectionDraft | null> {
  if (!userId) {
    return null;
  }
  const draftKey = `draft_${userId}`;
  const localKey = `argos_active_inspection_draft_${userId}`;

  // 1. Try to load full draft from IndexedDB first
  try {
    const db = await openDB();
    const draftFromIdb = await new Promise<ActiveInspectionDraft | null>((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFT, 'readonly');
      const store = tx.objectStore(STORE_DRAFT);
      const req = store.get(draftKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (draftFromIdb && draftFromIdb.laudoData && draftFromIdb.userId === userId) {
      return draftFromIdb;
    }
  } catch (err) {
    console.warn('[IndexedDB draft read fallback to localStorage]:', err);
  }

  // 2. Fallback to localStorage for this specific user
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.laudoData && (!parsed.userId || parsed.userId === userId)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[localStorage draft read error]:', e);
  }

  return null;
}

export async function clearActiveInspectionDraft(userId?: string): Promise<void> {
  const effectiveUserId = userId || 'anonymous';
  const draftKey = `draft_${effectiveUserId}`;
  const localKey = `argos_active_inspection_draft_${effectiveUserId}`;

  // 1. Remove from localStorage
  try {
    localStorage.removeItem(localKey);
    // Also clean generic legacy key if any
    localStorage.removeItem('argos_active_inspection_draft');
  } catch {
    // ignore
  }

  // 2. Remove from IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFT, 'readwrite');
      const store = tx.objectStore(STORE_DRAFT);
      const req = store.delete(draftKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB draft clear error]:', err);
  }
}

