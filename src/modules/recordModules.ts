import type { Field, ModuleId } from '../types';

export interface RecordModuleMeta {
  form: string;
  title: string;
  cadence: string;
  guidance: string;
}

export const recordModuleMeta: Partial<Record<ModuleId, RecordModuleMeta>> = {
  generator: {
    form: 'F-GE-00',
    title: 'Mantenimiento preventivo del grupo electrógeno',
    cadence: 'Control mensual',
    guidance: 'Completar primero las verificaciones con el equipo parado y luego las mediciones tras más de 5 minutos de marcha.',
  },
  osmosis: {
    form: 'Control diario',
    title: 'Ósmosis inversa',
    cadence: 'Registro diario',
    guidance: 'Los controles periódicos se completan solamente cuando correspondan a la fecha seleccionada.',
  },
  loop: {
    form: 'Rotación de bombas',
    title: 'Rotación de bombas del loop',
    cadence: 'Planilla quincenal',
    guidance: 'Registrar el estado final de cada bomba. La periodicidad exacta por actividad sigue pendiente de confirmación con CER.',
  },
};

export function controlOptions(field: Field, moduleId: ModuleId) {
  if (field.type === 'check') return field.optional ? ['OK', 'MAL', 'No aplica'] : ['OK', 'MAL'];
  if (field.type === 'switch') return moduleId === 'loop' ? ['START', 'STOP'] : ['ON', 'OFF'];
  return ['Sí', 'No', 'No aplica'];
}

export function evidenceCategories(moduleId: ModuleId) {
  if (moduleId === 'loop') return [
    { label: 'Bombas de planta baja', category: 'Bombas planta baja' },
    { label: 'Bombas del lazo', category: 'Bombas lazo' },
    { label: 'Otra evidencia', category: 'Otra evidencia' },
  ];
  if (moduleId === 'osmosis') return [{ label: 'Foto del control de ósmosis', category: 'Control de ósmosis' }];
  return [{ label: 'Evidencia fotográfica', category: 'Evidencia general' }];
}

