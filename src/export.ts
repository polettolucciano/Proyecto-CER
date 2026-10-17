import type { MaintenanceRecord, Task, Workspace } from './types';
import { moduleById } from './data';
import { formatDate } from './domain';
import { buildAnnualReport, reportMonths } from './features/reports/annualReport';

export async function exportRecords(records: MaintenanceRecord[], data: Workspace) {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook(); workbook.creator = 'CER Gestión'; workbook.created = new Date();
  const sheet = workbook.addWorksheet('Registros', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [{ header: 'Código', key: 'id', width: 24 }, { header: 'Revisión', key: 'revision', width: 12 }, { header: 'Vigencia', key: 'status', width: 18 }, { header: 'Fecha', key: 'date', width: 22 }, { header: 'Módulo', key: 'module', width: 26 }, { header: 'Equipo / sector', key: 'equipment', width: 34 }, { header: 'Responsable', key: 'user', width: 32 }, { header: 'Resultado', key: 'result', width: 24 }, { header: 'Rectifica a', key: 'supersedes', width: 24 }, { header: 'Motivo de anulación', key: 'voidReason', width: 42 }, { header: 'Observaciones', key: 'notes', width: 60 }];
  const details = workbook.addWorksheet('Verificaciones'); details.columns = [{ header: 'Registro', key: 'id', width: 24 }, { header: 'Verificación', key: 'field', width: 44 }, { header: 'Valor', key: 'value', width: 45 }, { header: 'Unidad', key: 'unit', width: 16 }];
  const trace = workbook.addWorksheet('Trazabilidad'); trace.columns = [{ header: 'Registro', key: 'id', width: 24 }, { header: 'Fecha y hora', key: 'occurredAt', width: 25 }, { header: 'Responsable', key: 'actor', width: 30 }, { header: 'Acción', key: 'action', width: 22 }, { header: 'Detalle', key: 'summary', width: 70 }, { header: 'Registro relacionado', key: 'related', width: 24 }];
  records.forEach(r => { const module = moduleById(r.module); const status = r.status === 'active' ? 'Vigente' : r.status === 'superseded' ? 'Rectificado' : 'Anulado'; sheet.addRow({ id: r.id, revision: r.revision, status, date: formatDate(r.date), module: module.name, equipment: data.equipment.find(x => x.id === r.equipmentId)?.name ?? '', user: data.users.find(x => x.id === r.userId)?.name ?? '', result: r.result === 'ok' ? 'Conforme' : 'Con observaciones', supersedes: r.supersedesId ?? '', voidReason: r.voidReason ?? '', notes: r.notes }); module.sections.flatMap(s => s.fields).forEach(f => { details.addRow({ id: r.id, field: f.label, value: r.values[f.id] || 'Sin registrar', unit: f.unit || '' }); }); });
  const recordIds = new Set(records.map(record => record.id));
  data.auditEvents.filter(event => recordIds.has(event.entityId) || Boolean(event.relatedEntityId && recordIds.has(event.relatedEntityId))).forEach(event => trace.addRow({ id: event.entityId, occurredAt: new Date(event.occurredAt).toLocaleString('es-AR'), actor: data.users.find(user => user.id === event.actorId)?.name ?? 'Usuario no disponible', action: event.action, summary: event.summary, related: event.relatedEntityId ?? '' }));
  for (const s of [sheet, details, trace]) { s.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; s.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF19376F' } }; s.getRow(1).height = 30; s.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: s.columnCount } }; s.eachRow((row, i) => { row.alignment = { vertical: 'middle', wrapText: true }; if (i > 1 && i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F6FA' } }; }); }
  const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `CER-registros-${new Date().toISOString().slice(0,10)}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportAnnualProgram(tasks: Task[], data: Workspace, year: number) {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'CER Gestión';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(`Programa ${year}`, { views: [{ state: 'frozen', xSplit: 4, ySplit: 4 }] });
  const { groups, summary } = buildAnnualReport(data, tasks, year);
  const navy = 'FF173B72';
  const category = 'FFDCE9F4';
  const border = 'FFB8C4D1';
  const fills = { recorded: 'FFDDF4E9', planned: 'FFE7EFFA', overdue: 'FFFFE4E2', mixed: 'FFFFF0D2' } as const;
  const fonts = { recorded: 'FF227454', planned: 'FF356797', overdue: 'FFB14843', mixed: 'FFA76F18' } as const;

  sheet.columns = [
    { key: 'control', width: 38 }, { key: 'equipment', width: 34 }, { key: 'responsible', width: 23 }, { key: 'frequency', width: 14 },
    ...reportMonths.map((month, index) => ({ key: `month-${index}`, width: 9, header: month })),
  ];
  sheet.mergeCells('A1:C2');
  sheet.getCell('A1').value = 'C.E.R.\nCentro de Enfermedades Renales';
  sheet.mergeCells('D1:O2');
  sheet.getCell('D1').value = 'PROGRAMA DE MANTENIMIENTO PREVENTIVO\nDE EQUIPOS E INSTALACIONES';
  sheet.mergeCells('P1:P2');
  sheet.getCell('P1').value = 'F-PME-00';
  ['A1', 'D1', 'P1'].forEach(address => {
    const cell = sheet.getCell(address);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: address === 'D1' ? 14 : 12 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  sheet.getRow(1).height = 27;
  sheet.getRow(2).height = 27;
  const header = sheet.getRow(3);
  ['Control preventivo', 'Equipo / sector', 'Responsable', 'Frecuencia', ...reportMonths].forEach((value, index) => { header.getCell(index + 1).value = value; });
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } };
  header.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  header.height = 30;

  let rowNumber = 4;
  groups.forEach(group => {
    sheet.mergeCells(rowNumber, 1, rowNumber, 16);
    const groupCell = sheet.getCell(rowNumber, 1);
    groupCell.value = group.name.toUpperCase();
    groupCell.font = { bold: true, color: { argb: navy } };
    groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: category } };
    groupCell.alignment = { vertical: 'middle' };
    sheet.getRow(rowNumber).height = 22;
    rowNumber += 1;
    group.rows.forEach(item => {
      const row = sheet.getRow(rowNumber);
      row.getCell(1).value = item.task.title;
      row.getCell(2).value = item.equipment;
      row.getCell(3).value = item.responsible?.name ?? 'Sin asignar';
      row.getCell(4).value = item.task.frequency;
      item.months.forEach((cell, monthIndex) => {
        const excelCell = row.getCell(monthIndex + 5);
        if (cell.state !== 'empty') {
          excelCell.value = 'X';
          excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fills[cell.state] } };
          excelCell.font = { bold: true, color: { argb: fonts[cell.state] } };
          excelCell.note = `${cell.recorded} registrados de ${cell.planned} previstos${cell.overdue ? ` · ${cell.overdue} vencidos` : ''}`;
        }
        excelCell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      row.height = 28;
      rowNumber += 1;
    });
  });

  const legendStart = rowNumber + 1;
  sheet.getCell(legendStart, 1).value = `AÑO: ${year}`;
  sheet.getCell(legendStart, 1).font = { bold: true, color: { argb: navy } };
  sheet.getCell(legendStart + 1, 1).value = `Resumen: ${summary.tasks} tareas · ${summary.planned} controles previstos · ${summary.recorded} registros vinculados · ${summary.overdue} instancias vencidas`;
  sheet.mergeCells(legendStart + 1, 1, legendStart + 1, 16);
  sheet.getCell(legendStart + 2, 1).value = 'REFERENCIAS PROPUESTAS: verde = registrado · azul = planificado · amarillo = parcial · rojo = vencido. Validar convención final con CER.';
  sheet.mergeCells(legendStart + 2, 1, legendStart + 2, 16);
  sheet.getCell(legendStart + 2, 1).font = { italic: true, color: { argb: 'FF7A5C20' } };

  sheet.eachRow((row, index) => {
    if (index > 3 && !sheet.getCell(index, 1).isMerged) row.alignment = { vertical: 'middle', wrapText: true };
    row.eachCell({ includeEmpty: index <= rowNumber }, cell => {
      cell.border = { top: { style: 'thin', color: { argb: border } }, left: { style: 'thin', color: { argb: border } }, bottom: { style: 'thin', color: { argb: border } }, right: { style: 'thin', color: { argb: border } } };
    });
  });
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } };
  sheet.headerFooter.oddFooter = `Programa preventivo CER · ${year} · Página &P de &N`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CER-programa-mantenimiento-${year}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
