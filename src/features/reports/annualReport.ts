import { modules } from '../../data';
import { addDays, addMonths, nextDate, parseDate, today } from '../../domain';
import type { MaintenanceRecord, Task, TeamUser, Workspace } from '../../types';

export const reportMonths = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const;

export type AnnualCellState = 'empty' | 'planned' | 'recorded' | 'overdue' | 'mixed';

export interface AnnualCell {
  planned: number;
  recorded: number;
  overdue: number;
  state: AnnualCellState;
}

export interface AnnualRow {
  task: Task;
  equipment: string;
  responsible: TeamUser | undefined;
  months: AnnualCell[];
}

export interface AnnualGroup {
  id: Task['module'];
  name: string;
  rows: AnnualRow[];
}

export interface AnnualSummary {
  tasks: number;
  planned: number;
  recorded: number;
  overdue: number;
  unlinkedRecords: number;
}

function previousDate(value: string, task: Task) {
  if (task.frequency === 'Diaria') return addDays(value, -1);
  if (task.frequency === 'Semanal') return addDays(value, -7);
  if (task.frequency === 'Quincenal') return addDays(value, -15);
  const monthsBack: Partial<Record<Task['frequency'], number>> = {
    Mensual: -1,
    Bimestral: -2,
    Trimestral: -3,
    Semestral: -6,
    Anual: -12,
  };
  return monthsBack[task.frequency] ? addMonths(value, monthsBack[task.frequency]!) : value;
}

/**
 * La fecha de una tarea representa su próxima ejecución. Para el informe anual
 * proyectamos también hacia atrás, conservando el mismo ciclo, para reconstruir
 * el programa completo del año sin modificar la planificación guardada.
 */
export function annualOccurrences(task: Task, year: number) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  if (task.frequency === 'Única') return task.due >= start && task.due <= end ? [task.due] : [];

  let cursor = task.due;
  for (let i = 0; i < 800 && cursor > start; i += 1) {
    const previous = previousDate(cursor, task);
    if (previous === cursor) break;
    cursor = previous;
  }
  while (cursor < start) cursor = nextDate(cursor, task.frequency);

  const dates: string[] = [];
  for (let i = 0; i < 800 && cursor <= end; i += 1) {
    dates.push(cursor);
    const next = nextDate(cursor, task.frequency);
    if (next === cursor) break;
    cursor = next;
  }
  return dates;
}

function cellState(planned: number, recorded: number, overdue: number): AnnualCellState {
  if (!planned && !recorded) return 'empty';
  if (recorded > 0 && overdue > 0) return 'mixed';
  if (overdue > 0) return 'overdue';
  if (recorded >= planned && planned > 0) return 'recorded';
  if (recorded > 0) return 'recorded';
  return 'planned';
}

function recordsForTask(records: MaintenanceRecord[], taskId: string, year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return records.filter(record => record.status === 'active' && record.taskId === taskId && record.date.startsWith(prefix));
}

export function buildAnnualReport(data: Workspace, tasks: Task[], year: number) {
  const currentDate = today();
  const activeTasks = tasks.filter(task => task.active);
  const rows = activeTasks.map<AnnualRow>(task => {
    const occurrences = annualOccurrences(task, year);
    const months = reportMonths.map((_, month) => {
      const plannedDates = occurrences.filter(date => parseDate(date).getMonth() === month);
      const recorded = recordsForTask(data.records, task.id, year, month).length;
      const elapsed = plannedDates.filter(date => date < currentDate).length;
      const overdue = Math.max(elapsed - recorded, 0);
      return {
        planned: plannedDates.length,
        recorded,
        overdue,
        state: cellState(plannedDates.length, recorded, overdue),
      };
    });
    return {
      task,
      equipment: data.equipment.find(item => item.id === task.equipmentId)?.name ?? 'Sin equipo asignado',
      responsible: data.users.find(item => item.id === task.assignedTo),
      months,
    };
  });

  const groups = modules.flatMap<AnnualGroup>(module => {
    const moduleRows = rows.filter(row => row.task.module === module.id);
    return moduleRows.length ? [{ id: module.id, name: module.name, rows: moduleRows }] : [];
  });
  const cells = rows.flatMap(row => row.months);
  const summary: AnnualSummary = {
    tasks: rows.length,
    planned: cells.reduce((total, cell) => total + cell.planned, 0),
    recorded: cells.reduce((total, cell) => total + cell.recorded, 0),
    overdue: cells.reduce((total, cell) => total + cell.overdue, 0),
    unlinkedRecords: data.records.filter(record => record.status === 'active' && record.date.startsWith(String(year)) && !record.taskId).length,
  };

  return { groups, summary };
}

export function currentReportYear() {
  return parseDate(today()).getFullYear();
}

