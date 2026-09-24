// IndexedDB Storage Layer for Argos Inspections & Fleet
// Provides asynchronous, high-capacity offline storage with automatic fallback

const DB_NAME = 'argos_offline_db';
const DB_VERSION = 1;
const STORE_INSPECTIONS = 'inspections';
const STORE_FLEET = 'fleet';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveLocalFleet(fleet: Array<any>): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FLEET, 'readwrite');
      const store = tx.objectStore(STORE_FLEET);
      fleet.forEach(item => {
        if (item.id) {
          store.put(item);
        }
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Falling back to localStorage for fleet:', err);
    try {
      localStorage.setItem('argos_local_backup_fleet', JSON.stringify(fleet));
    } catch (e) {
      console.error('[localStorage fallback fleet error]', e);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLocalFleet(): Promise<Array<any>> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FLEET, 'readonly');
      const store = tx.objectStore(STORE_FLEET);
      const req = store.getAll();
      req.onsuccess = () => {
        const results: Array<Record<string, unknown>> = req.result || [];
        if (results.length === 0) {
          try {
            const raw = localStorage.getItem('argos_local_backup_fleet');
            if (raw) return resolve(JSON.parse(raw));
          } catch {
            // ignore
          }
        }
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Fallback get fleet from localStorage:', err);
    try {
      const raw = localStorage.getItem('argos_local_backup_fleet');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export async function clearLocalFleet(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FLEET, 'readwrite');
      const store = tx.objectStore(STORE_FLEET);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Clear fleet error:', err);
  }
  try {
    localStorage.removeItem('argos_local_backup_fleet');
  } catch {
    // ignore
  }
}

