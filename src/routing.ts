import { modules } from './data';
import { canonicalDestination, navigation } from './navigation';
import type { ModuleId, Page } from './types';

export interface AppRoute { page: Page; module?: ModuleId; equipmentId?: string; view?: string; }
const legacyPages = ['equipment', 'reports', 'summary', 'users'];
const views: Partial<Record<Page, string[]>> = { planning: ['list', 'calendar', 'annual'], records: ['recent'], settings: ['team', 'center', 'modules'] };

export function parseRoute(hash: string): AppRoute {
  const [path, query] = hash.replace(/^#/, '').split('?');
  const known = [...legacyPages, 'public-training', 'training', ...navigation.map(item => item.id)];
  const destination = canonicalDestination(known.includes(path) ? path as Page : 'dashboard');
  const params = new URLSearchParams(query);
  const module = params.get('module');
  const requestedView = destination.view ?? params.get('view') ?? '';
  return {
    page: destination.page,
    view: views[destination.page]?.includes(requestedView) ? requestedView : undefined,
    module: (modules.some(item => item.id === module) || /^custom-[a-f0-9-]{36}$/.test(module ?? '')) ? module as ModuleId : undefined,
    equipmentId: params.get('equipment') || undefined,
  };
}

export function routeHash(route: AppRoute): string {
  const canonical = canonicalDestination(route.page);
  const params = new URLSearchParams();
  if (route.module) params.set('module', route.module);
  if (route.equipmentId) params.set('equipment', route.equipmentId);
  const view = canonical.view ?? route.view;
  if (view && views[canonical.page]?.includes(view)) params.set('view', view);
  return `#${canonical.page}${params.size ? `?${params}` : ''}`;
}
export function isLegacyRoute(hash: string) { return legacyPages.includes(hash.replace(/^#/, '').split('?')[0]); }
