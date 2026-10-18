import { IndexedDbWorkspaceRepository } from './local/IndexedDbWorkspaceRepository';

export type { WorkspaceRepository } from './contracts/WorkspaceRepository';

export const workspaceRepository = new IndexedDbWorkspaceRepository();

