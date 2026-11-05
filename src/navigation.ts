import type { Page, TeamUser } from './types';

export interface NavigationItem {
  id: Page;
  label: string;
  shortLabel: string;
  icon: string;
  group: 'Operación' | 'Conocimiento' | 'Administración';
}

/** Un destino por tarea. Las vistas complementarias viven dentro de su sección. */
export const navigation: NavigationItem[] = [
  { id: 'dashboard', label: 'Inicio', shortLabel: 'Inicio', icon: 'Grid2X2', group: 'Operación' },
  { id: 'planning', label: 'Planificación', shortLabel: 'Planificación', icon: 'CalendarDays', group: 'Operación' },
  { id: 'records', label: 'Historial', shortLabel: 'Historial', icon: 'ClipboardCheck', group: 'Operación' },
  { id: 'settings', label: 'Administración', shortLabel: 'Administración', icon: 'Settings2', group: 'Administración' },
];
export const navigationGroups: NavigationItem['group'][] = ['Operación', 'Conocimiento', 'Administración'];
export function primaryNavigation(_user: TeamUser): Page[] {
  return ['dashboard', 'planning', 'records'];
}

/** Conserva enlaces anteriores sin mantener pantallas duplicadas. */
export function canonicalDestination(page: Page): { page: Page; view?: string } {
  if (page === 'equipment') return { page: 'dashboard' };
  if (page === 'summary') return { page: 'records', view: 'recent' };
  if (page === 'reports') return { page: 'planning', view: 'annual' };
  if (page === 'users') return { page: 'settings', view: 'team' };
  return { page };
}
export function pageLabel(page: Page, _user: TeamUser) {
  return navigation.find(item => item.id === canonicalDestination(page).page)?.label ?? 'CER Gestión';
}
