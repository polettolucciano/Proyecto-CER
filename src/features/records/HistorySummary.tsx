import type { MaintenanceRecord } from '../../types';

/** El resumen de actividad pertenece al historial; no tiene una pantalla propia. */
export function HistorySummary({ records }: { records: MaintenanceRecord[] }) {
  const active = records.filter(record => record.status === 'active');
  const attention = active.filter(record => record.result === 'attention').length;
  return <div className="history-activity-summary" aria-label="Resumen de los controles filtrados"><span><strong>{records.length}</strong> {records.length === active.length ? 'controles vigentes' : 'versiones'}</span><span><strong>{active.length - attention}</strong> conformes</span><span><strong>{attention}</strong> con observaciones</span></div>;
}
