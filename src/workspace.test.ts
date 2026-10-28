import { describe, expect, it } from 'vitest';
import { createSeed } from './data';
import { normalizeWorkspace } from './workspace';

describe('migración del espacio de trabajo', () => {
  it('unifica el acceso de Enfermería en la demo sin cambiar autores ni asignaciones históricas', () => {
    const workspace = createSeed();
    const nurse = workspace.users.find(user => user.role === 'Enfermería')!;
    nurse.modules = ['osmosis'];
    const migrated = normalizeWorkspace(workspace)!;
    expect(migrated.users.find(user => user.id === nurse.id)?.modules).toContain('generator');
    expect(migrated.records.map(record => record.userId)).toEqual(workspace.records.map(record => record.userId));
    expect(migrated.tasks.map(task => task.assignedTo)).toEqual(workspace.tasks.map(task => task.assignedTo));
    expect(workspace.users.filter(user => user.role === 'Enfermería')).toHaveLength(1);
  });

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
