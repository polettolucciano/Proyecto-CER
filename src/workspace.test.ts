import { describe, expect, it } from 'vitest';
import { createSeed } from './data';
import { normalizeWorkspace } from './workspace';

describe('migración del espacio de trabajo', () => {
  it('migra registros anteriores sin perder contenido', () => {
    const legacy = createSeed() as unknown as { version: number; auditEvents?: unknown; records: Array<Record<string, unknown>> };
    legacy.version = 1;
    delete legacy.auditEvents;
    legacy.records = legacy.records.map(({ status: _status, revision: _revision, ...record }) => record);

    const migrated = normalizeWorkspace(legacy);
    expect(migrated?.version).toBe(2);
    expect(migrated?.records).toHaveLength(18);
    expect(migrated?.records.every(record => record.status === 'active' && record.revision === 1)).toBe(true);
    expect(migrated?.auditEvents).toEqual([]);
  });

  it('rechaza una estructura incompleta', () => {
    expect(normalizeWorkspace({ records: [] })).toBeUndefined();
  });

  it('rechaza datos sin un administrador activo para evitar una sesión inutilizable', () => {
    const workspace = createSeed();
    expect(normalizeWorkspace({ ...workspace, users: workspace.users.map(user => ({ ...user, active: false })) })).toBeUndefined();
  });
});
