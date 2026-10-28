import type { AuditAction, AuditEvent, MaintenanceRecord, Workspace } from './types';
import { safeHttpsUrl, uid } from './domain';
import { modules } from './modules/catalog';

type LegacyWorkspace = Omit<Workspace, 'version' | 'auditEvents' | 'records'> & {
  version?: number;
  auditEvents?: AuditEvent[];
  records?: Array<Partial<MaintenanceRecord> & Pick<MaintenanceRecord, 'id' | 'module' | 'equipmentId' | 'date' | 'createdAt' | 'userId' | 'result' | 'values' | 'notes' | 'photos'>>;
};

const normalizeRole = (role: string) => role === 'Responsable técnico' ? 'Enfermería' : role;

export function normalizeWorkspace(value: unknown): Workspace | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as LegacyWorkspace;
  if (!Array.isArray(candidate.equipment) || !Array.isArray(candidate.users) || !Array.isArray(candidate.tasks) || !Array.isArray(candidate.records) || !Array.isArray(candidate.training) || !candidate.settings) return undefined;
  if (!candidate.users.some(user => user && user.active && user.role === 'Administrador')) return undefined;
  if (!candidate.records.every(record => record && typeof record.id === 'string' && typeof record.createdAt === 'string' && record.values && typeof record.values === 'object' && Array.isArray(record.photos))) return undefined;
  if (!candidate.training.every(material => material && typeof material.id === 'string' && typeof material.url === 'string')) return undefined;
  return {
    ...candidate,
    version: 2,
    // Only used for local demo data. Preserve historical authors while giving
    // the single nursing demo profile access to all maintenance modules.
    users: candidate.users.map(user => ({ ...user, role: normalizeRole(user.role), ...(normalizeRole(user.role) === 'Enfermería' ? { modules: modules.map(module => module.id) } : {}) })) as Workspace['users'],
    records: candidate.records.map(record => ({
      ...record,
      status: record.status ?? 'active',
      revision: record.revision ?? 1,
    })) as MaintenanceRecord[],
    auditEvents: Array.isArray(candidate.auditEvents) ? candidate.auditEvents : [],
    training: candidate.training.map(material => ({ ...material, url: safeHttpsUrl(material.url) ?? '' })),
  };
}

export function auditEvent(actorId: string, action: AuditAction, entityId: string, summary: string, relatedEntityId?: string): AuditEvent {
  return {
    id: uid('audit'),
    occurredAt: new Date().toISOString(),
    actorId,
    action,
    entityType: 'maintenance-record',
    entityId,
    summary,
    relatedEntityId,
  };
}

export const isCurrentRecord = (record: MaintenanceRecord) => record.status === 'active';
