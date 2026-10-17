import type { MaintenanceRecord, ModuleId } from '../../types';

interface DuplicateCandidate {
  module: ModuleId;
  equipmentId: string;
  date: string;
  taskId?: string;
  excludeRecordId?: string;
}

export function findPotentialDuplicates(records: MaintenanceRecord[], candidate: DuplicateCandidate) {
  return records.filter(record =>
    record.id !== candidate.excludeRecordId
    && record.status === 'active'
    && record.module === candidate.module
    && record.equipmentId === candidate.equipmentId
    && record.date === candidate.date
    && (!candidate.taskId || record.taskId === candidate.taskId),
  );
}
