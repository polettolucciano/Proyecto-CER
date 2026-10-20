import { addDays, today } from '../domain';
import { moduleById, modules } from '../modules/catalog';
import type { MaintenanceRecord, ModuleId, Task, Values, Workspace } from '../types';

export function createDemoWorkspace(): Workspace {
  const date = today();
  const equipment: Workspace['equipment'] = [
    { id: 'eq-gen', name: 'Grupo electrógeno principal', code: 'GE-001', module: 'generator', location: 'Sala de máquinas', model: 'P44E', serial: '03664', status: 'Operativo' },
    { id: 'eq-osm', name: 'Planta de ósmosis inversa', code: 'OI-001', module: 'osmosis', location: 'Tratamiento de agua', model: 'Por confirmar', serial: '', status: 'Operativo' },
    { id: 'eq-loop', name: 'Sistema de bombas de agua', code: 'LP-001', module: 'loop', location: 'Planta baja / pretratamiento / loop', model: 'Sistema de 6 bombas', serial: '', status: 'Operativo' },
    { id: 'eq-crash', name: 'Carro de paro principal', code: 'CP-001', module: 'crash', location: 'Sala de hemodiálisis', model: 'Por confirmar', serial: '', status: 'Operativo' },
    { id: 'eq-fum', name: 'Instalaciones del centro', code: 'FM-001', module: 'fumigation', location: 'Todos los sectores', model: 'Servicio externo', serial: '', status: 'Operativo' },
    { id: 'eq-elec', name: 'Tablero eléctrico general', code: 'EL-001', module: 'electrical', location: 'Planta baja', model: 'Por confirmar', serial: '', status: 'En mantenimiento' },
    { id: 'eq-room', name: 'Sala de hemodiálisis', code: 'SL-001', module: 'rooms', location: 'Primer piso', model: 'Instalación', serial: '', status: 'Operativo' },
    { id: 'eq-general', name: 'Seguridad e instalaciones', code: 'MT-001', module: 'general', location: 'Todos los sectores', model: 'General', serial: '', status: 'Operativo' },
  ];
  const all = modules.map(module => module.id);
  const users: Workspace['users'] = [
    { id: 'user-admin', name: 'Administración CER', email: 'administracion@example.com', role: 'Administrador', modules: all, active: true, initials: 'AC' },
    { id: 'user-tech', name: 'Enfermería de mantenimiento', email: 'mantenimiento@example.com', role: 'Enfermería', modules: ['generator', 'loop', 'electrical', 'rooms', 'general', 'fumigation', 'crash'], active: true, initials: 'EM' },
    { id: 'user-water', name: 'Enfermería de tratamiento de agua', email: 'osmosis@example.com', role: 'Enfermería', modules: ['osmosis', 'loop'], active: true, initials: 'EA' },
    { id: 'user-super', name: 'Supervisión CER', email: 'supervision@example.com', role: 'Supervisor', modules: all, active: true, initials: 'SC' },
  ];
  const taskRows: [string, ModuleId, string, Task['frequency'], number][] = [
    ['Control diario de ósmosis', 'osmosis', 'eq-osm', 'Diaria', 0], ['Prueba del grupo electrógeno', 'generator', 'eq-gen', 'Mensual', 0], ['Rotación quincenal de bombas', 'loop', 'eq-loop', 'Quincenal', 2], ['Control del carro de paro', 'crash', 'eq-crash', 'Mensual', -2], ['Medición de puesta a tierra', 'electrical', 'eq-elec', 'Anual', -4], ['Servicio de fumigación', 'fumigation', 'eq-fum', 'Bimestral', 4], ['Revisión de sala de hemodiálisis', 'rooms', 'eq-room', 'Mensual', 6], ['Service anual del generador', 'generator', 'eq-gen', 'Anual', 24], ['Cambio de microfiltros', 'osmosis', 'eq-osm', 'Mensual', 8], ['Medición de dureza y cloro', 'osmosis', 'eq-osm', 'Semanal', 3], ['Análisis bacteriológico', 'osmosis', 'eq-osm', 'Mensual', 12], ['Análisis fisicoquímico', 'osmosis', 'eq-osm', 'Semestral', 46], ['Control de matafuegos', 'general', 'eq-general', 'Anual', 15], ['Revisión de iluminación', 'electrical', 'eq-elec', 'Única', 9], ['Limpieza de cisternas', 'general', 'eq-general', 'Semestral', 18], ['Verificación de alarmas de agua', 'osmosis', 'eq-osm', 'Bimestral', 20],
  ];
  const tasks: Task[] = taskRows.map(([title, module, equipmentId, frequency, offset], index) => ({ id: `task-${index + 1}`, title, module, equipmentId, frequency, due: addDays(date, offset), assignedTo: module === 'osmosis' ? 'user-water' : 'user-tech', notes: '', active: true }));
  const records: MaintenanceRecord[] = [];
  for (let index = 1; index <= 18; index++) {
    const module = index % 6 === 0 ? 'generator' : index % 5 === 0 ? 'loop' : 'osmosis';
    const definition = moduleById(module);
    const values: Values = {};
    definition.sections.flatMap(section => section.fields).forEach(field => { values[field.id] = field.type === 'check' ? 'OK' : field.type === 'number' ? ({ rejection: '98', conductivity: '12', hours: '1248', voltage: '13', pressure: '60', frequency: '50', tension: '220', saltAdded: '5' }[field.id] ?? '0') : field.type === 'switch' ? (field.id.endsWith('1') ? 'ON' : 'OFF') : field.type === 'yesno' ? 'No aplica' : ''; });
    const attention = index === 4 || index === 11;
    if (attention) values.pressures = 'MAL';
    records.push({ id: `REG-${String(100 + index).padStart(4, '0')}`, module, equipmentId: module === 'generator' ? 'eq-gen' : module === 'loop' ? 'eq-loop' : 'eq-osm', date: addDays(date, -index), createdAt: `${addDays(date, -index)}T11:30:00.000Z`, userId: module === 'osmosis' ? 'user-water' : 'user-tech', result: attention ? 'attention' : 'ok', values, notes: attention ? 'Registro de ejemplo: se detectó una variación de presión. Requiere revisión del responsable.' : 'Control de ejemplo realizado según la planilla.', photos: [], status: 'active', revision: 1 });
  }
  return { version: 2, equipment, users, tasks, records, auditEvents: [], training: [], settings: { organization: 'Centro de Enfermedades Renales', location: 'Sede principal', advanceDays: 7, emailAlerts: false, mobileAlerts: false } };
}

