import { canManage, nextTaskDate, occurrences, parseDate } from '../../domain';
import type { Task, TeamUser, Workspace } from '../../types';
import { auditEvent } from '../../workspace';

export function cancelScheduledControl(workspace: Workspace, user: TeamUser, taskId: string, date: string, scope: 'date' | 'series', reason: string, now = new Date()): Workspace {
  if (!canManage(user)) throw new Error('Solo Administración puede cancelar controles programados.');
  const task = workspace.tasks.find(item => item.id === taskId);
  if (!task?.active) throw new Error('La programación ya no está activa.');
  if (reason.trim().length < 10) throw new Error('Indicá un motivo de al menos 10 caracteres.');
  if (!occurrences(task, task.due, date).includes(date)) throw new Error('La fecha elegida no pertenece a los controles pendientes.');
  if (workspace.records.some(record => record.taskId === taskId && record.status === 'active' && (scope === 'date' ? record.date === date : record.date >= date))) throw new Error('Hay controles realizados en ese período. Consultá el historial; no se borrarán.');
  const at = now.toISOString();
  const next: Task = { ...task, anchorDay: task.anchorDay ?? parseDate(task.due).getDate() };
  if (scope === 'series') Object.assign(next, { cancelledFrom: date, cancellationReason: reason.trim(), cancelledAt: at, cancelledBy: user.id, active: task.due < date });
  else {
    next.cancellations = [...(task.cancellations ?? []), { date, reason: reason.trim(), cancelledAt: at, cancelledBy: user.id }];
    if (date === task.due) {
      if (task.frequency === 'Única') next.active = false;
      else { let due = nextTaskDate(next, task.due); while (next.cancellations.some(item => item.date === due)) due = nextTaskDate(next, due); next.due = due; if (next.cancelledFrom && due >= next.cancelledFrom) next.active = false; }
    }
  }
  return { ...workspace, tasks: workspace.tasks.map(item => item.id === taskId ? next : item), auditEvents: [{ ...auditEvent(user.id, 'task.cancelled', taskId, `Canceló ${scope === 'date' ? 'el control del' : 'la programación desde el'} ${date}. Motivo: ${reason.trim()}`), entityType: 'task' }, ...workspace.auditEvents] };
}
