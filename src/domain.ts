import type { Frequency, Task, Workspace, TeamUser, ModuleId, Page } from './types';

export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Cordoba', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const parseDate = (s: string) => new Date(`${s}T12:00:00`);
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function addDays(s: string, amount: number) { const d = parseDate(s); d.setDate(d.getDate() + amount); return iso(d); }
export function addMonths(s: string, amount: number) { const d = parseDate(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + amount); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return iso(d); }
export function nextDate(s: string, frequency: Frequency) { const days: Partial<Record<Frequency, number>> = { Diaria: 1, Semanal: 7, Quincenal: 15 }; const months: Partial<Record<Frequency, number>> = { Mensual: 1, Bimestral: 2, Trimestral: 3, Semestral: 6, Anual: 12 }; return days[frequency] ? addDays(s, days[frequency]!) : months[frequency] ? addMonths(s, months[frequency]!) : s; }
export function advanceTask(task: Task, completedOn: string): Task { if (task.frequency === 'Única') return { ...task, active: false, lastCompleted: completedOn }; let due = nextDate(task.due, task.frequency); while (due <= completedOn) due = nextDate(due, task.frequency); return { ...task, due, lastCompleted: completedOn }; }
export function daysBetween(a: string, b: string) { return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000); }
export function taskStatus(task: Task, advance = 7) { const days = daysBetween(today(), task.due); return !task.active ? 'Completado' : days < 0 ? 'Vencido' : days === 0 ? 'Para hoy' : days <= advance ? 'Próximo' : 'Programado'; }
export function formatDate(value: string, opts?: Intl.DateTimeFormatOptions) { return parseDate(value).toLocaleDateString('es-AR', opts ?? { day: '2-digit', month: 'short', year: 'numeric' }); }
export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
export function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
export function safeHttpsUrl(value: string) { try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : undefined; } catch { return undefined; } }
export function allowed(user: TeamUser, module: ModuleId) { return user.active && (user.role === 'Administrador' || user.modules.includes(module)); }
export const canManage = (user: TeamUser) => user.active && user.role === 'Administrador';
export const canPlan = (user: TeamUser) => user.active && user.role !== 'Enfermería';
export function canAccessPage(user: TeamUser, page: Page) {
  if (page === 'public-training') return true;
  if (!user.active) return false;
  return page !== 'users' || canManage(user);
}
export function visibleData(data: Workspace, user: TeamUser) { return { ...data, equipment: data.equipment.filter(x => allowed(user, x.module)), tasks: data.tasks.filter(x => allowed(user, x.module)), records: data.records.filter(x => allowed(user, x.module)) }; }
export const monthTitle = (date: Date) => date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
export function occurrences(task: Task, start: string, end: string): string[] { if (!task.active) return []; const dates: string[] = []; let date = task.due; for (let i = 0; i < 2000 && date <= end; i++) { if (date >= start) dates.push(date); if (task.frequency === 'Única') break; date = nextDate(date, task.frequency); } return dates; }
