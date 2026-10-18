import { AppError } from '../../../shared/errors/AppError';
import type { Workspace } from '../../../types';
import type { WorkspaceRepository } from '../contracts/WorkspaceRepository';

const DATABASE_NAME = 'cer-gestion-preview';
const DATABASE_VERSION = 1;
const WORKSPACE_STORE = 'workspace';
const WORKSPACE_KEY = 'main';

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(WORKSPACE_STORE)) {
      request.result.createObjectStore(WORKSPACE_STORE);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new AppError('persistence', 'No se pudo abrir el almacenamiento local.', request.error));
});

export class IndexedDbWorkspaceRepository implements WorkspaceRepository {
  async load() {
    const database = await openDatabase();
    return new Promise<unknown>((resolve, reject) => {
      const transaction = database.transaction(WORKSPACE_STORE, 'readonly');
      const request = transaction.objectStore(WORKSPACE_STORE).get(WORKSPACE_KEY);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new AppError('persistence', 'No se pudieron recuperar los datos locales.', request.error));
      transaction.oncomplete = () => database.close();
      transaction.onabort = () => {
        database.close();
        reject(new AppError('persistence', 'La lectura local fue interrumpida.', transaction.error));
      };
    });
  }

  async save(data: Workspace) {
    const database = await openDatabase();
    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(WORKSPACE_STORE, 'readwrite');
      transaction.objectStore(WORKSPACE_STORE).put(data, WORKSPACE_KEY);

      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(new AppError('persistence', 'No se pudieron guardar los datos locales.', transaction.error));
      };
      transaction.onabort = () => {
        database.close();
        reject(new AppError('persistence', 'El guardado local fue interrumpido.', transaction.error));
      };
    });
  }
}

