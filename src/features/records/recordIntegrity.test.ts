import { describe, expect, it } from 'vitest';
import type { MaintenanceRecord } from '../../types';
import { findPotentialDuplicates } from './recordIntegrity';

const base: MaintenanceRecord = { id: 'record-1', module: 'osmosis', equipmentId: 'eq-osm', taskId: 'task-osm', date: '2026-10-17', createdAt: '2026-10-17T12:00:00.000Z', userId: 'user-1', result: 'ok', values: {}, notes: '', photos: [], status: 'active', revision: 1 };

describe('prevención de duplicados', () => {
  it('detecta un control vigente del mismo equipo, fecha y tarea', () => {
    expect(findPotentialDuplicates([base], { module: 'osmosis', equipmentId: 'eq-osm', date: '2026-10-17', taskId: 'task-osm' })).toEqual([base]);
  });

  it('ignora registros anulados, rectificados y el registro excluido', () => {
    const records = [{ ...base, status: 'voided' as const }, { ...base, id: 'record-2', status: 'superseded' as const }];
    expect(findPotentialDuplicates(records, { module: 'osmosis', equipmentId: 'eq-osm', date: '2026-10-17' })).toEqual([]);
    expect(findPotentialDuplicates([base], { module: 'osmosis', equipmentId: 'eq-osm', date: '2026-10-17', excludeRecordId: base.id })).toEqual([]);
  });
});
