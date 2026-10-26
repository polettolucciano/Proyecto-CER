import { IndexedDbWorkspaceRepository } from './local/IndexedDbWorkspaceRepository';
import { supabase } from '../supabase/client';
import { SupabaseWorkspaceRepository } from '../supabase/SupabaseWorkspaceRepository';

export type { WorkspaceRepository } from './contracts/WorkspaceRepository';

export const workspaceRepository = supabase ? new SupabaseWorkspaceRepository() : new IndexedDbWorkspaceRepository();

