import { describe, expect, it } from 'vitest';
import { createSeed } from '../../../data';
import { createMaintenanceRecord, registerRecordInWorkspace } from './registerRecord';

describe('registro de un control', () => {
  it('preserva una medición real aunque quede fuera de referencia', () => {
    const record = createMaintenanceRecord({
      module: 'generator',
      equipmentId: 'eq-gen',
      date: '2026-10-18',
      userId: 'user-admin',
      hasIssue: true,
      values: { voltage: '9.5' },
      notes: 'Voltaje observado fuera de la referencia.',
      photos: [],
    }, undefined, new Date('2026-10-18T12:00:00.000Z'), 'CER-2026-TEST0001');

    expect(record.values.voltage).toBe('9.5');
    expect(record.result).toBe('attention');
  });

  it('guarda una rectificación como nueva revisión y preserva la anterior', () => {
    const workspace = createSeed();
    const source = workspace.records.find(record => record.status === 'active')!;
    const corrected = createMaintenanceRecord({
      module: source.module,
      equipmentId: source.equipmentId,
      taskId: source.taskId,
      date: source.date,
      userId: 'user-admin',
      hasIssue: false,
      values: source.values,
      notes: 'Dato rectificado.',
      photos: [],
    }, source, new Date('2026-10-18T12:00:00.000Z'), 'CER-2026-TEST0002');

    const next = registerRecordInWorkspace(workspace, corrected, source);
    expect(next.records[0]).toMatchObject({ id: corrected.id, revision: source.revision + 1, supersedesId: source.id });
    expect(next.records.find(record => record.id === source.id)).toMatchObject({ status: 'superseded', supersededById: corrected.id });
    expect(next.auditEvents[0]).toMatchObject({ action: 'record.corrected', entityId: corrected.id, relatedEntityId: source.id });
  });
});

