import { useState } from 'react';
import { exportRecords } from '../../export';
import { useApp } from '../../store';
import type { MaintenanceRecord } from '../../types';

export function useExportRecords() {
  const { data, toast } = useApp();
  const [busy, setBusy] = useState(false);

  async function download(records: MaintenanceRecord[]) {
    setBusy(true);
    try {
      await exportRecords(records, data);
      toast(`Excel preparado con ${records.length} registros.`);
    } catch {
      toast('No se pudo generar el archivo. Intentá nuevamente.');
    } finally {
      setBusy(false);
    }
  }

  return { busy, download };
}

