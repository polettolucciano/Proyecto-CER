import type { Attachment, Field, Module, Values } from '../../../types';

export const ACCEPTED_EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_EVIDENCE_SIZE = 5 * 1024 * 1024;
export const MAX_EVIDENCE_COUNT = 6;

export function findMissingRequiredField(module: Module, values: Values): Field | undefined {
  return module.sections
    .flatMap(section => section.fields)
    .find(field => !field.optional && !values[field.id]?.trim());
}

export function validateIdentification(equipmentId: string, date: string, maximumDate: string) {
  if (!equipmentId || !date || date > maximumDate) return 'Seleccioná un equipo y una fecha válida, hasta hoy.';
  return undefined;
}

export function validateClosure(hasIssue: boolean, notes: string) {
  if (hasIssue && !notes.trim()) return 'Describí la observación para que el responsable pueda revisarla.';
  return undefined;
}

export function selectValidEvidence(files: File[], existing: Attachment[]) {
  const accepted = files.filter(file =>
    ACCEPTED_EVIDENCE_TYPES.includes(file.type as typeof ACCEPTED_EVIDENCE_TYPES[number])
    && file.size <= MAX_EVIDENCE_SIZE,
  );
  return {
    accepted,
    rejected: accepted.length !== files.length,
    exceedsLimit: accepted.length + existing.length > MAX_EVIDENCE_COUNT,
  };
}

