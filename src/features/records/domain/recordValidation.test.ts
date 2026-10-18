import { describe, expect, it } from 'vitest';
import { moduleById } from '../../../data';
import { findMissingRequiredField, selectValidEvidence, validateClosure, validateIdentification } from './recordValidation';

describe('validación de controles operativos', () => {
  it('rechaza identificación incompleta o una fecha futura', () => {
    expect(validateIdentification('', '2026-10-18', '2026-10-18')).toBeTruthy();
    expect(validateIdentification('eq-1', '2026-10-19', '2026-10-18')).toBeTruthy();
    expect(validateIdentification('eq-1', '2026-10-18', '2026-10-18')).toBeUndefined();
  });

  it('identifica el primer campo obligatorio pendiente', () => {
    const generator = moduleById('generator');
    const missing = findMissingRequiredField(generator, {});
    expect(missing?.id).toBe(generator.sections[0].fields.find(field => !field.optional)?.id);
  });

  it('exige explicación para una medición observada sin descartar su valor', () => {
    expect(validateClosure(true, '')).toContain('Describí');
    expect(validateClosure(true, 'Presión observada por debajo de la referencia')).toBeUndefined();
  });

  it('separa evidencias inválidas y limita la cantidad', () => {
    const valid = new File(['image'], 'equipo.webp', { type: 'image/webp' });
    const invalid = new File(['text'], 'nota.txt', { type: 'text/plain' });
    const result = selectValidEvidence([valid, invalid], []);
    expect(result.accepted).toEqual([valid]);
    expect(result.rejected).toBe(true);
    expect(result.exceedsLimit).toBe(false);
  });
});

