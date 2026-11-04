import { describe, expect, it } from 'vitest';
import { isLegacyRoute, parseRoute, routeHash } from './routing';

describe('navegación consolidada y enlaces existentes', () => {
  it('los enlaces antiguos llegan a su función dentro de una sección vigente', () => {
    const cases = [['#equipment', '#dashboard'], ['#reports', '#planning?view=annual'], ['#summary', '#records?view=recent'], ['#users', '#settings?view=team']];
    for (const [old, current] of cases) {
      expect(isLegacyRoute(old)).toBe(true);
      expect(routeHash(parseRoute(old))).toBe(current);
      expect(isLegacyRoute(current)).toBe(false);
      expect(parseRoute(routeHash(parseRoute(old)))).toEqual(parseRoute(old));
    }
  });
  it('una consulta de sector mantiene su identidad al compartir o recargar el enlace', () => {
    const hash = routeHash({ page: 'records', module: 'osmosis', equipmentId: 'planta 1 / A&B' });
    expect(parseRoute(hash)).toMatchObject({ page: 'records', module: 'osmosis', equipmentId: 'planta 1 / A&B' });
  });
  it('las vistas se conservan al recargar y no se mezclan entre secciones', () => {
    expect(parseRoute('#planning?view=calendar')).toMatchObject({ page: 'planning', view: 'calendar' });
    expect(parseRoute('#records?view=annual').view).toBeUndefined();
    expect(parseRoute('#reports?view=calendar').view).toBe('annual');
    expect(parseRoute('#planning?module=inexistente').module).toBeUndefined();
  });
  it('un enlace desconocido vuelve a Inicio y conserva la biblioteca pública anterior', () => {
    expect(parseRoute('#pantalla-inexistente').page).toBe('dashboard');
    expect(parseRoute('#public-training').page).toBe('public-training');
  });
});
