import { moduleById } from '../../../data';
import { advanceTask, isCancelledDate, uid } from '../../../domain';
import type { Attachment, MaintenanceRecord, ModuleId, Values, Workspace } from '../../../types';
import { auditEvent } from '../../../workspace';

export interface RecordDraft {
  module: ModuleId;
  equipmentId: string;
  taskId?: string;
  date: string;
  userId: string;
  hasIssue: boolean;
  values: Values;
  notes: string;
  photos: Attachment[];
}

export function createMaintenanceRecord(
  draft: RecordDraft,
  sourceRecord?: MaintenanceRecord,
  now = new Date(),
  id = `CER-${now.getFullYear()}-${uid('').slice(1, 9).toUpperCase()}`,
): MaintenanceRecord {
  return {
    id,
    module: draft.module,
    equipmentId: draft.equipmentId,
    taskId: draft.taskId,
    date: draft.date,
    createdAt: now.toISOString(),
    userId: draft.userId,
    result: draft.hasIssue ? 'attention' : 'ok',
    values: draft.values,
    notes: draft.notes.trim(),
    photos: draft.photos,
    status: 'active',
    revision: sourceRecord ? sourceRecord.revision + 1 : 1,
    supersedesId: sourceRecord?.id,
  };
}

export function registerRecordInWorkspace(workspace: Workspace, record: MaintenanceRecord, sourceRecord?: MaintenanceRecord): Workspace {
  if (!sourceRecord && record.taskId) { const task = workspace.tasks.find(item => item.id === record.taskId); if (!task?.active || isCancelledDate(task, record.date)) throw new Error('Ese control fue cancelado o su programación ya no está activa. Actualizá la planificación.'); }
  return {
    ...workspace,
    records: [
      { ...record, formDefinition: sourceRecord?.formDefinition ?? moduleById(record.module, workspace.modules) },
      ...workspace.records.map(item => item.id === sourceRecord?.id
        ? { ...item, status: 'superseded' as const, supersededById: record.id }
        : item),
    ],
    tasks: sourceRecord
      ? workspace.tasks
      : workspace.tasks.map(item => item.id === record.taskId ? advanceTask(item, record.date) : item),
    auditEvents: [
      auditEvent(
        record.userId,
        sourceRecord ? 'record.corrected' : 'record.created',
        record.id,
        sourceRecord ? `Rectificó el registro ${sourceRecord.id}` : 'Registró un nuevo control',
        sourceRecord?.id,
      ),
      ...workspace.auditEvents,
    ],
  };
}

