import type { Module, ModuleId, Workspace, Task, MaintenanceRecord, Values } from './types';
import { addDays, today } from './domain';

const check = (id: string, label: string, hint?: string) => ({ id, label, type: 'check' as const, hint });
const number = (id: string, label: string, unit?: string, hint?: string) => ({ id, label, type: 'number' as const, unit, hint });
export const modules: Module[] = [
  { id: 'generator', name: 'Grupo electrógeno', short: 'Grupo electrógeno', description: 'Control preventivo y prueba de funcionamiento.', color: 'amber', icon: 'Zap', frequency: 'Mensual', defined: true, sections: [
    { title: 'Equipo parado', description: 'Verificaciones previas a la puesta en marcha.', fields: [check('radiator', 'Nivel de agua del radiador'), check('oil', 'Nivel de aceite'), check('fuel', 'Nivel de combustible', 'Referencia de la planilla: más de 15 litros.'), check('filters', 'Estado y limpieza de filtros de aire'), check('battery', 'Estado de la batería'), check('leaks', 'Ausencia de pérdidas líquidas'), check('board', 'Tablero de transferencia'), check('transfer', 'Simulación de transferencia')] },
    { title: 'Marcha en vacío', description: 'Registrar las mediciones luego de más de 5 minutos de marcha.', fields: [number('hours', 'Horas de funcionamiento', 'h', 'Lectura acumulada del horómetro.'), number('voltage', 'Voltaje de batería', 'V', 'Referencia de la planilla: 13 V.'), number('pressure', 'Presión de aceite', 'PSI', 'Referencia de la planilla: 60 PSI.'), number('frequency', 'Frecuencia', 'Hz', 'Referencia de la planilla: 50/60 Hz.'), number('tension', 'Tensión', 'V', 'Referencia de la planilla: 210–230 V.'), { id: 'other', label: 'Otras verificaciones', type: 'text', optional: true }] },
  ] },
  { id: 'osmosis', name: 'Ósmosis diaria', short: 'Ósmosis diaria', description: 'Seguimiento de la planta de tratamiento de agua.', color: 'blue', icon: 'Droplets', frequency: 'Diaria', defined: true, sections: [
    { title: 'Control diario', fields: [check('pressures', 'Control de presiones'), check('pumps', 'Bombas en funcionamiento'), check('leaks', 'Sin pérdidas de agua'), number('rejection', 'Relación de rechazo', '%', 'Referencia de la planilla: mayor a 96. Validar unidad con CER.'), number('conductivity', 'Conductividad', undefined, 'Referencia de la planilla: menor a 20. Unidad pendiente de confirmar.'), check('temperature', 'Temperatura menor a 25 °C'), check('salt', 'Revisión de sal'), { ...number('saltAdded', 'Sal agregada', 'kg'), optional: true }] },
    { title: 'Verificaciones periódicas', description: 'Completar únicamente las tareas realizadas en esta fecha.', fields: [{ ...check('hardness', 'Medición de dureza / cloro', 'Frecuencia semanal.'), optional: true }, { id: 'microfilters', label: 'Cambio de microfiltros', type: 'yesno', hint: 'Frecuencia mensual.', optional: true }, { id: 'bacteriology', label: 'Control bacteriológico', type: 'yesno', hint: 'Frecuencia mensual.', optional: true }, { id: 'physicochemical', label: 'Control fisicoquímico', type: 'yesno', hint: 'Dos veces al año.', optional: true }] },
  ] },
  { id: 'loop', name: 'Loop y bombas', short: 'Loop y bombas', description: 'Rotación y registro de bombas por sector.', color: 'teal', icon: 'RefreshCw', frequency: 'Quincenal', defined: true, sections: ['Planta baja', 'Pretratamiento', 'Loop'].map((title, i) => ({ title, fields: [1, 2].map(n => ({ id: `pump-${i}-${n}`, label: `Bomba N.º ${n}`, type: 'switch' as const })) })) },
  ...([
    ['crash', 'Carro de paro', 'Verificación del equipo y los insumos.', 'rose', 'HeartPulse', 'Mensual'],
    ['fumigation', 'Fumigación', 'Intervenciones y control de plagas.', 'purple', 'Bug', 'Bimestral'],
    ['electrical', 'Electricidad', 'Instalaciones, iluminación y puesta a tierra.', 'amber', 'Plug', 'Anual'],
    ['rooms', 'Salas', 'Condiciones e instalaciones de cada sector.', 'blue', 'Building2', 'Mensual'],
    ['general', 'Otros mantenimientos', 'Seguridad, servicios y controles generales.', 'slate', 'Wrench', 'Mensual'],
  ] as const).map(([id, name, description, color, icon, frequency]) => ({ id, name, short: name, description, color, icon, frequency, defined: false, sections: [{ title: 'Registro de intervención', description: 'Ficha inicial. El checklist específico se incorporará con la planilla de CER.', fields: [{ id: 'work', label: 'Trabajo o control realizado', type: 'text' as const }, { id: 'provider', label: 'Proveedor o técnico interviniente', type: 'text' as const, optional: true }] }] })),
];
export const moduleById = (id: ModuleId) => modules.find(x => x.id === id)!;
export const frequencies = ['Diaria', 'Semanal', 'Quincenal', 'Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual', 'Única'] as const;

export function createSeed(): Workspace {
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
  const all = modules.map(x => x.id);
  const users: Workspace['users'] = [
    { id: 'user-admin', name: 'Administración CER', email: 'administracion@example.com', role: 'Administrador', modules: all, active: true, initials: 'AC' },
    { id: 'user-tech', name: 'Técnico de mantenimiento', email: 'tecnico@example.com', role: 'Responsable técnico', modules: ['generator', 'loop', 'electrical', 'rooms', 'general', 'fumigation', 'crash'], active: true, initials: 'TM' },
    { id: 'user-water', name: 'Responsable de ósmosis', email: 'osmosis@example.com', role: 'Responsable técnico', modules: ['osmosis', 'loop'], active: true, initials: 'RO' },
    { id: 'user-super', name: 'Supervisión CER', email: 'supervision@example.com', role: 'Supervisor', modules: all, active: true, initials: 'SC' },
  ];
  const taskRows: [string, ModuleId, string, Task['frequency'], number][] = [
    ['Control diario de ósmosis', 'osmosis', 'eq-osm', 'Diaria', 0],
    ['Prueba del grupo electrógeno', 'generator', 'eq-gen', 'Mensual', 0],
    ['Rotación quincenal de bombas', 'loop', 'eq-loop', 'Quincenal', 2],
    ['Control del carro de paro', 'crash', 'eq-crash', 'Mensual', -2],
    ['Medición de puesta a tierra', 'electrical', 'eq-elec', 'Anual', -4],
    ['Servicio de fumigación', 'fumigation', 'eq-fum', 'Bimestral', 4],
    ['Revisión de sala de hemodiálisis', 'rooms', 'eq-room', 'Mensual', 6],
    ['Service anual del generador', 'generator', 'eq-gen', 'Anual', 24],
    ['Cambio de microfiltros', 'osmosis', 'eq-osm', 'Mensual', 8],
    ['Medición de dureza y cloro', 'osmosis', 'eq-osm', 'Semanal', 3],
    ['Análisis bacteriológico', 'osmosis', 'eq-osm', 'Mensual', 12],
    ['Análisis fisicoquímico', 'osmosis', 'eq-osm', 'Semestral', 46],
    ['Control de matafuegos', 'general', 'eq-general', 'Anual', 15],
    ['Revisión de iluminación', 'electrical', 'eq-elec', 'Única', 9],
    ['Limpieza de cisternas', 'general', 'eq-general', 'Semestral', 18],
    ['Verificación de alarmas de agua', 'osmosis', 'eq-osm', 'Bimestral', 20],
  ];
  const tasks: Task[] = taskRows.map(([title, module, equipmentId, frequency, offset], i) => ({ id: `task-${i + 1}`, title, module, equipmentId, frequency, due: addDays(date, offset), assignedTo: module === 'osmosis' ? 'user-water' : 'user-tech', notes: '', active: true }));
  const records: MaintenanceRecord[] = [];
  for (let i = 1; i <= 18; i++) {
    const module = i % 6 === 0 ? 'generator' : i % 5 === 0 ? 'loop' : 'osmosis';
    const m = moduleById(module); const values: Values = {};
    m.sections.flatMap(s => s.fields).forEach(f => { values[f.id] = f.type === 'check' ? 'OK' : f.type === 'number' ? ({ rejection: '98', conductivity: '12', hours: '1248', voltage: '13', pressure: '60', frequency: '50', tension: '220', saltAdded: '5' }[f.id] ?? '0') : f.type === 'switch' ? (f.id.endsWith('1') ? 'ON' : 'OFF') : f.type === 'yesno' ? 'No aplica' : ''; });
    const attention = i === 4 || i === 11;
    if (attention) values.pressures = 'MAL';
    records.push({ id: `REG-${String(100 + i).padStart(4, '0')}`, module, equipmentId: module === 'generator' ? 'eq-gen' : module === 'loop' ? 'eq-loop' : 'eq-osm', date: addDays(date, -i), createdAt: `${addDays(date, -i)}T11:30:00.000Z`, userId: module === 'osmosis' ? 'user-water' : 'user-tech', result: attention ? 'attention' : 'ok', values, notes: attention ? 'Registro de ejemplo: se detectó una variación de presión. Requiere revisión del responsable.' : 'Control de ejemplo realizado según la planilla.', photos: [], status: 'active', revision: 1 });
  }
  return { version: 2, equipment, users, tasks, records, auditEvents: [], training: [], settings: { organization: 'Centro de Enfermedades Renales', location: 'Sede principal', advanceDays: 7, emailAlerts: false, mobileAlerts: false } };
}
