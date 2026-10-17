import type { Workspace } from './types';

// Sustituir esta implementación por un repositorio HTTP al conectar el backend.
// IndexedDB conserva los datos y fotografías de esta vista previa en este navegador.
export interface WorkspaceRepository { load(): Promise<Workspace | undefined>; save(data: Workspace): Promise<void>; }
const openDB = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('cer-gestion-preview', 1);
  request.onupgradeneeded = () => { request.result.createObjectStore('workspace'); };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
export const repository: WorkspaceRepository = {
  async load() { const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction('workspace', 'readonly'); const req = tx.objectStore('workspace').get('main'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); tx.oncomplete = () => db.close(); }); },
  async save(data) { const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction('workspace', 'readwrite'); tx.objectStore('workspace').put(data, 'main'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Guardado interrumpido')); }; }); },
};
