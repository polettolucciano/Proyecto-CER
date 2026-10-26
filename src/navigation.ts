import type { Page, TeamUser } from './types';

export interface NavigationItem {
  id: Page;
  label: string;
  shortLabel: string;
  icon: string;
  group: 'Operación' | 'Conocimiento' | 'Administración';
}

export const navigation: NavigationItem[] = [
  { id: 'dashboard', label: 'Pulso operativo', shortLabel: 'Inicio', icon: 'LayoutDashboard', group: 'Operación' },
  { id: 'planning', label: 'Planificación', shortLabel: 'Agenda', icon: 'CalendarDays', group: 'Operación' },
  { id: 'records', label: 'Registros', shortLabel: 'Historial', icon: 'ClipboardCheck', group: 'Operación' },
  { id: 'equipment', label: 'Equipos y sectores', shortLabel: 'Equipos', icon: 'Wrench', group: 'Operación' },
  { id: 'reports', label: 'Reportes', shortLabel: 'Reportes', icon: 'FileSpreadsheet', group: 'Operación' },
  { id: 'training', label: 'Capacitaciones', shortLabel: 'Aprender', icon: 'BookOpen', group: 'Conocimiento' },
  { id: 'users', label: 'Personas y permisos', shortLabel: 'Personas', icon: 'Users', group: 'Administración' },
  { id: 'settings', label: 'Configuración', shortLabel: 'Ajustes', icon: 'Settings2', group: 'Administración' },
];

export const navigationGroups: NavigationItem['group'][] = ['Operación', 'Conocimiento', 'Administración'];

/** Agrupación visual; los permisos siguen comprobándose por separado. */
export function primaryNavigation(user: TeamUser): Page[] {
  return user.role === 'Enfermería' ? ['dashboard', 'planning', 'records', 'training'] : ['dashboard', 'planning', 'records', 'reports'];
}

export function pageLabel(page: Page, user: TeamUser) {
  if (page === 'dashboard') return user.role === 'Enfermería' ? 'Hoy' : 'Resumen del centro';
  if (page === 'planning') return 'Agenda';
  if (page === 'records') return 'Historial';
  if (page === 'reports') return 'Informes';
  return navigation.find(item => item.id === page)?.label ?? 'CER Gestión';
}
