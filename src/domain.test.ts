import { describe, expect, it } from 'vitest';
import { addMonths, advanceTask, canAccessPage, canManage, canPlan, nextDate, safeHttpsUrl } from './domain';
import type { Task, TeamUser } from './types';

const task: Task = { id: 'task-1', title: 'Control', module: 'generator', equipmentId: 'eq-1', assignedTo: 'user-1', frequency: 'Mensual', due: '2026-01-31', notes: '', active: true };

describe('recurrencias de mantenimiento', () => {
  it('conserva una fecha válida al avanzar desde fin de mes', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(nextDate('2026-02-28', 'Mensual')).toBe('2026-03-28');
  });

  it('avanza la tarea más allá de la fecha completada', () => {
    const advanced = advanceTask(task, '2026-03-02');
    expect(advanced.lastCompleted).toBe('2026-03-02');
    expect(advanced.due).toBe('2026-03-28');
  });

  it('desactiva una tarea de ejecución única', () => {
    const advanced = advanceTask({ ...task, frequency: 'Única' }, '2026-01-31');
    expect(advanced.active).toBe(false);
  });
});

describe('enlaces externos', () => {
  it('acepta únicamente enlaces HTTPS válidos', () => {
    expect(safeHttpsUrl('https://example.com/material')).toBe('https://example.com/material');
    expect(safeHttpsUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeHttpsUrl('http://example.com')).toBeUndefined();
    expect(safeHttpsUrl('texto')).toBeUndefined();
  });
});

describe('permisos de la vista previa', () => {
  const administrator: TeamUser = { id: 'admin', name: 'Administración', email: 'admin@example.com', role: 'Administrador', modules: ['generator'], active: true, initials: 'AD' };
  const supervisor: TeamUser = { ...administrator, id: 'supervisor', role: 'Supervisor' };
  const technician: TeamUser = { ...administrator, id: 'technician', role: 'Responsable técnico' };

  it('reserva la gestión de personas al perfil administrador', () => {
    expect(canAccessPage(administrator, 'users')).toBe(true);
    expect(canAccessPage(supervisor, 'users')).toBe(false);
    expect(canAccessPage(technician, 'users')).toBe(false);
  });

  it('permite planificar a administración y supervisión, pero no al responsable técnico', () => {
    expect(canPlan(administrator)).toBe(true);
    expect(canPlan(supervisor)).toBe(true);
    expect(canPlan(technician)).toBe(false);
    expect(canManage(supervisor)).toBe(false);
  });

  it('mantiene la biblioteca pública disponible sin depender del perfil', () => {
    expect(canAccessPage({ ...technician, active: false }, 'public-training')).toBe(true);
  });
});
