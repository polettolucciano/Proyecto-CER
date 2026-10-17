import { Fragment, useMemo, useState } from 'react';
import { DownloadButton, Field, Icon, ModuleIcon, PageHeader } from '../../components';
import { modules } from '../../data';
import { addDays, allowed, formatDate, today, visibleData } from '../../domain';
import { exportAnnualProgram, exportRecords } from '../../export';
import { useApp } from '../../store';
import type { ModuleId } from '../../types';
import { buildAnnualReport, currentReportYear, reportMonths, type AnnualCell } from './annualReport';

type View = 'annual' | 'records';

const stateText = {
  empty: 'Sin programación',
  planned: 'Planificado',
  recorded: 'Registrado',
  overdue: 'Vencido',
  mixed: 'Registro parcial',
};

function CellMark({ cell, task }: { cell: AnnualCell; task: string }) {
  const detail = cell.state === 'empty'
    ? 'Sin actividad'
    : `${stateText[cell.state]}. ${cell.recorded} registrados de ${cell.planned} previstos${cell.overdue ? `; ${cell.overdue} vencidos` : ''}.`;
  return (
    <span className={`program-mark ${cell.state}`} title={`${task}: ${detail}`} aria-label={`${task}: ${detail}`}>
      {cell.state === 'empty' ? <span aria-hidden="true">—</span> : <><strong>{cell.recorded || cell.planned}</strong><small>{cell.recorded ? `/${cell.planned}` : 'prev.'}</small></>}
    </span>
  );
}

function ReportMetric({ icon, label, value, tone }: { icon: string; label: string; value: number; tone: string }) {
  return <div className={`report-metric ${tone}`}><span><Icon name={icon} size={18} /></span><div><strong>{value.toLocaleString('es-AR')}</strong><small>{label}</small></div></div>;
}

export function ReportsPage() {
  const { data, user, toast } = useApp();
  const visible = visibleData(data, user);
  const [view, setView] = useState<View>('annual');
  const [year, setYear] = useState(currentReportYear);
  const [module, setModule] = useState<string>('all');
  const [from, setFrom] = useState(addDays(today(), -30));
  const [to, setTo] = useState(today());
  const [busy, setBusy] = useState(false);
  const yearTasks = useMemo(
    () => visible.tasks.filter(task => module === 'all' || task.module === module),
    [visible.tasks, module],
  );
  const annual = useMemo(() => buildAnnualReport({ ...data, records: visible.records }, yearTasks, year), [data, visible.records, yearTasks, year]);
  const filteredRecords = useMemo(
    () => visible.records.filter(record => record.date >= from && record.date <= to && (module === 'all' || record.module === module)),
    [visible.records, from, to, module],
  );
  const currentMonth = currentReportYear() === year ? new Date().getMonth() : -1;

  async function downloadAnnual() {
    setBusy(true);
    try {
      await exportAnnualProgram(yearTasks, { ...data, records: visible.records }, year);
      toast(`Programa anual ${year} preparado.`);
    } catch {
      toast('No se pudo generar el programa anual. Intentá nuevamente.');
    } finally {
      setBusy(false);
    }
  }

  async function downloadFilteredRecords() {
    setBusy(true);
    try {
      await exportRecords(filteredRecords, data);
      toast(`Excel preparado con ${filteredRecords.length} registros.`);
    } catch {
      toast('No se pudo generar el archivo. Intentá nuevamente.');
    } finally {
      setBusy(false);
    }
  }

  const linkedRecords = filteredRecords.filter(record => record.taskId).length;
  const attention = filteredRecords.filter(record => record.result === 'attention').length;

  return <>
    <PageHeader eyebrow="PROGRAMA PREVENTIVO · F-PME-00" title="Informes que hablan el idioma de CER" description="La planilla anual del centro, transformada en una vista clara, trazable y lista para exportar.">
      <DownloadButton busy={busy} label={view === 'annual' ? 'Exportar programa' : 'Exportar registros'} onClick={() => void (view === 'annual' ? downloadAnnual() : downloadFilteredRecords())} />
    </PageHeader>

    <div className="report-view-tabs" role="tablist" aria-label="Tipo de informe">
      <button role="tab" aria-selected={view === 'annual'} className={view === 'annual' ? 'active' : ''} onClick={() => setView('annual')}><Icon name="Grid2X2" size={16} />Programa anual</button>
      <button role="tab" aria-selected={view === 'records'} className={view === 'records' ? 'active' : ''} onClick={() => setView('records')}><Icon name="FileText" size={16} />Registros por período</button>
    </div>

    {view === 'annual' ? <>
      <section className="program-sheet" aria-labelledby="program-title">
        <header className="program-sheet-header">
          <div className="program-brand"><img src="/cer-logo.png" width="54" height="46" alt="" /><span><small>C.E.R.</small><strong>Centro de Enfermedades Renales</strong></span></div>
          <div className="program-title"><small>Programa de mantenimiento preventivo</small><h2 id="program-title">Equipos e instalaciones</h2></div>
          <div className="program-code"><span>Documento</span><strong>F-PME-00</strong></div>
        </header>
        <div className="program-toolbar">
          <div className="year-switcher"><button className="icon-button" aria-label="Año anterior" onClick={() => setYear(value => value - 1)}><Icon name="ChevronLeft" /></button><span><small>Año del informe</small><strong>{year}</strong></span><button className="icon-button" aria-label="Año siguiente" onClick={() => setYear(value => value + 1)}><Icon name="ChevronRight" /></button></div>
          <label className="program-module-filter"><span>Módulo</span><select aria-label="Filtrar programa por módulo" value={module} onChange={event => setModule(event.target.value)}><option value="all">Todos los módulos</option>{modules.filter(item => allowed(user, item.id)).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <button className="button secondary small" onClick={() => setYear(currentReportYear())}><Icon name="CalendarDays" size={15} />Ir al año actual</button>
        </div>

        <div className="report-metrics">
          <ReportMetric icon="ClipboardCheck" label="tareas activas" value={annual.summary.tasks} tone="navy" />
          <ReportMetric icon="CalendarDays" label="controles previstos" value={annual.summary.planned} tone="blue" />
          <ReportMetric icon="CheckCircle2" label="registros vinculados" value={annual.summary.recorded} tone="green" />
          <ReportMetric icon="TriangleAlert" label="instancias vencidas" value={annual.summary.overdue} tone="amber" />
        </div>

        <div className="program-legend" aria-label="Referencias del informe">
          <span><i className="recorded" />Registrado</span><span><i className="planned" />Planificado</span><span><i className="mixed" />Parcial</span><span><i className="overdue" />Vencido</span>
          <small>Los números indican realizados / previstos.</small>
        </div>

        <div className="program-scroll" tabIndex={0} aria-label="Programa anual. Desplazá horizontalmente para ver todos los meses.">
          <table className="program-table">
            <thead><tr><th className="activity-column">Control preventivo</th><th>Responsable</th><th>Frecuencia</th>{reportMonths.map((month, index) => <th className={index === currentMonth ? 'current-month' : ''} key={month}>{month}</th>)}</tr></thead>
            <tbody>{annual.groups.map(group => <Fragment key={group.id}>
              <tr className="program-group" key={`${group.id}-heading`}><th colSpan={15}><ModuleIcon module={group.id} small />{group.name}<span>{group.rows.length} {group.rows.length === 1 ? 'tarea' : 'tareas'}</span></th></tr>
              {group.rows.map(row => <tr key={row.task.id}>
                <th className="activity-column"><strong>{row.task.title}</strong><small>{row.equipment}</small></th>
                <td className="owner-column"><span className="owner-initials">{row.responsible?.initials ?? '—'}</span><span>{row.responsible?.name ?? 'Sin asignar'}</span></td>
                <td><span className="frequency-label">{row.task.frequency}</span></td>
                {row.months.map((cell, index) => <td className={index === currentMonth ? 'current-month' : ''} key={reportMonths[index]}><CellMark cell={cell} task={row.task.title} /></td>)}
              </tr>)}
            </Fragment>)}</tbody>
          </table>
        </div>
        <div className="program-scroll-note"><Icon name="ArrowRight" size={14} />En celular, deslizá la tabla para consultar los 12 meses.</div>
      </section>

      <div className="report-guidance-grid">
        <section className="panel report-guidance"><div className="guidance-icon"><Icon name="FileSpreadsheet" /></div><div><h3>Fiel al informe original, más fácil de leer</h3><p>Conservamos categorías, responsable, frecuencia y meses. Cada celda se calcula desde la planificación y los registros vinculados; no se cargan cumplimientos ficticios.</p></div></section>
        <section className="panel report-question"><div><Icon name="CircleHelp" /><h3>Una definición pendiente con CER</h3></div><p>La planilla recibida usa cruces verdes, rojas, negras y celdas amarillas, pero no explica su significado. Esta versión propone estados operativos claros; antes del formato final debemos validar esa convención con el cliente.</p></section>
      </div>
      {annual.summary.unlinkedRecords > 0 && <div className="report-data-note" role="note"><Icon name="CircleHelp" size={18} /><div><strong>{annual.summary.unlinkedRecords} registros de demostración no están vinculados a una tarea programada.</strong><span>Siguen disponibles en el historial, pero no se cuentan como cumplimiento mensual para evitar atribuciones incorrectas.</span></div></div>}
    </> : <>
      <section className="panel report-period-filters">
        <Field label="Desde"><input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></Field>
        <Field label="Hasta"><input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></Field>
        <Field label="Módulo"><select aria-label="Filtrar registros por módulo" value={module} onChange={event => setModule(event.target.value)}><option value="all">Todos los módulos</option>{modules.filter(item => allowed(user, item.id)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <div className="period-caption"><Icon name="CalendarDays" /><span>{formatDate(from)} — {formatDate(to)}</span></div>
      </section>
      <div className="report-metrics records-metrics">
        <ReportMetric icon="FileCheck2" label="registros encontrados" value={filteredRecords.length} tone="navy" />
        <ReportMetric icon="CheckCircle2" label="controles conformes" value={filteredRecords.length - attention} tone="green" />
        <ReportMetric icon="TriangleAlert" label="con observaciones" value={attention} tone="amber" />
        <ReportMetric icon="RefreshCw" label="vinculados al programa" value={linkedRecords} tone="blue" />
      </div>
      <section className="panel period-report-panel">
        <div className="panel-heading"><div><h2>Actividad registrada</h2><p>Detalle por módulo dentro del período seleccionado.</p></div><button className="button primary small" disabled={busy} onClick={() => void downloadFilteredRecords()}><Icon name="ArrowDownToLine" size={16} />Descargar Excel</button></div>
        {modules.filter(item => allowed(user, item.id) && (module === 'all' || module === item.id)).map(item => {
          const records = filteredRecords.filter(record => record.module === item.id);
          if (!records.length) return null;
          return <div className="period-module-row" key={item.id}><ModuleIcon module={item.id} /><div><strong>{item.name}</strong><span>{records.length} {records.length === 1 ? 'registro' : 'registros'}</span></div><div className="period-result"><span>{records.filter(record => record.result === 'ok').length} conformes</span><span>{records.filter(record => record.result === 'attention').length} con observaciones</span></div></div>;
        })}
        {!filteredRecords.length && <div className="period-empty"><Icon name="FileText" size={28} /><strong>No hay registros en este período</strong><span>Modificá las fechas o elegí otro módulo.</span></div>}
      </section>
    </>}
  </>;
}
