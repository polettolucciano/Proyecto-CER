import { moduleById } from '../../data';
import { occurrences } from '../../domain';
import type { MaintenanceRecord, ModuleId, Task, Workspace } from '../../types';
export interface CalendarControl { key: string; date: string; title: string; module: ModuleId; equipmentId: string; task?: Task; record?: MaintenanceRecord; }
export function calendarControls(data: Workspace, tasks: Task[], start: string, end: string, includeCompleted = true, module = 'all', query = ''): CalendarControl[] {
  const current = data.records.filter(record => record.status === 'active' && record.date >= start && record.date <= end);
  const pending = tasks.flatMap(task => occurrences(task,start,end).filter(date => !current.some(record => record.taskId === task.id && record.date === date)).map(date => ({ key: `${task.id}-${date}`, date, title: task.title, module: task.module, equipmentId: task.equipmentId, task })));
  const completed = !includeCompleted ? [] : current.filter(record => (module === 'all' || record.module === module)).map(record => {
    const task = data.tasks.find(item => item.id === record.taskId);
    return { key: record.id, date: record.date, title: task?.title ?? record.formDefinition?.name ?? moduleById(record.module,data.modules).name, module: record.module, equipmentId: record.equipmentId, task, record };
  }).filter(event => `${event.title} ${event.record.id} ${data.equipment.find(item => item.id === event.equipmentId)?.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  return [...pending,...completed].sort((a,b)=>a.date.localeCompare(b.date));
}
