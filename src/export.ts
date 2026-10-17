import type { MaintenanceRecord, Workspace } from './types';
import { moduleById } from './data';
import { formatDate } from './domain';

export async function exportRecords(records: MaintenanceRecord[], data: Workspace) {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook(); workbook.creator = 'CER Gestión'; workbook.created = new Date();
  const sheet = workbook.addWorksheet('Registros', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [{ header: 'Código', key: 'id', width: 24 }, { header: 'Fecha', key: 'date', width: 22 }, { header: 'Módulo', key: 'module', width: 26 }, { header: 'Equipo / sector', key: 'equipment', width: 34 }, { header: 'Responsable', key: 'user', width: 32 }, { header: 'Resultado', key: 'result', width: 24 }, { header: 'Observaciones', key: 'notes', width: 60 }];
  const details = workbook.addWorksheet('Verificaciones'); details.columns = [{ header: 'Registro', key: 'id', width: 24 }, { header: 'Verificación', key: 'field', width: 44 }, { header: 'Valor', key: 'value', width: 45 }, { header: 'Unidad', key: 'unit', width: 16 }];
  records.forEach(r => { const module = moduleById(r.module); sheet.addRow({ id: r.id, date: formatDate(r.date), module: module.name, equipment: data.equipment.find(x => x.id === r.equipmentId)?.name ?? '', user: data.users.find(x => x.id === r.userId)?.name ?? '', result: r.result === 'ok' ? 'Conforme' : 'Con observaciones', notes: r.notes }); module.sections.flatMap(s => s.fields).forEach(f => { details.addRow({ id: r.id, field: f.label, value: r.values[f.id] || 'Sin registrar', unit: f.unit || '' }); }); });
  for (const s of [sheet, details]) { s.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; s.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF19376F' } }; s.getRow(1).height = 30; s.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: s.columnCount } }; s.eachRow((row, i) => { row.alignment = { vertical: 'middle', wrapText: true }; if (i > 1 && i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F6FA' } }; }); }
  const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `CER-registros-${new Date().toISOString().slice(0,10)}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
