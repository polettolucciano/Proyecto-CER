import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MaintenanceRecord, Task, Workspace } from '../../types';
import { buildAnnualReport } from './annualReport';

const task = (id: string, due: string): Task => ({
  id,
  title: id,
  module: 'generator',
  equipmentId: 'equipment-1',
  assignedTo: 'nurse-1',
  frequency: 'Mensual',
  due,
  notes: '',
  active: true,
});

const record = (id: string, taskId: string, result: MaintenanceRecord['result']): MaintenanceRecord => ({
  id,
  taskId,
  module: 'generator',
  equipmentId: 'equipment-1',
  date: '2026-10-01',
  createdAt: '2026-10-01T12:00:00.000Z',
  userId: 'nurse-1',
  result,
  values: {},
  notes: '',
  photos: [],
  status: 'active',
  revision: 1,
});

afterEach(() => vi.useRealTimers());

describe('convención anual confirmada por CER', () => {
  it('distingue pendiente, conforme y alerta por atraso o falla', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T15:00:00.000Z'));
    const tasks = [
      task('overdue', '2026-10-15'),
      task('pending', '2026-10-25'),
      task('compliant', '2026-10-01'),
      task('failed', '2026-10-01'),
    ];
    const workspace: Workspace = {
      version: 2,
      equipment: [{ id: 'equipment-1', name: 'Grupo principal', code: 'GE-001', module: 'generator', location: 'Sala técnica', model: 'P44E', serial: '03664', status: 'Operativo' }],
      users: [{ id: 'nurse-1', name: 'Enfermería', email: 'enfermeria@example.com', role: 'Enfermería', modules: ['generator'], active: true, initials: 'EN' }],
      tasks,
      records: [record('record-ok', 'compliant', 'ok'), record('record-failed', 'failed', 'attention')],
      auditEvents: [],
      training: [],
      settings: { organization: 'CER', location: 'Sede principal', advanceDays: 7, emailAlerts: false, mobileAlerts: false },
    };

    const report = buildAnnualReport(workspace, tasks, 2026);
    const octoberState = (taskId: string) => report.groups.flatMap(group => group.rows).find(row => row.task.id === taskId)?.months[9].state;

    expect(octoberState('pending')).toBe('pending');
    expect(octoberState('compliant')).toBe('compliant');
    expect(octoberState('overdue')).toBe('alert');
    expect(octoberState('failed')).toBe('alert');
    expect(report.summary.attention).toBe(1);
  });
});
