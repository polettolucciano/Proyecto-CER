import type { Workspace } from '../../../types';

/**
 * Contrato transitorio de la vista previa local.
 *
 * Los casos de uso no deben conocer IndexedDB. En la etapa Supabase este
 * agregado se reemplazará gradualmente por repositorios orientados al negocio.
 */
export interface WorkspaceRepository {
  readonly remote?: boolean;
  load(): Promise<unknown>;
  save(data: Workspace): Promise<void>;
}

