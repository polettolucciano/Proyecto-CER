import type { AppActions } from '../../app/actions';
import { Fragment, useMemo, useState } from 'react';
import { DownloadButton, Icon, ModuleIcon } from '../../components';
import { workspaceModules } from '../../data';
import { allowed, visibleData } from '../../domain';
import { exportAnnualProgram } from '../../export';
import { useApp } from '../../store';
import { buildAnnualReport, currentReportYear, reportMonths, type AnnualCell } from './annualReport';

const stateText = {
  empty: 'Sin programación',
  pending: 'Pendiente',
  compliant: 'Realizado conforme',
  alert: 'No realizado o con falla',
};

function CellMark({ cell, task, period, onOpen }: { cell: AnnualCell; task: string; period: string; onOpen: () => void }) {
  const detail = cell.state === 'empty'
    ? 'Sin actividad'
    : `${stateText[cell.state]}. ${cell.recorded} registrados de ${cell.planned} previstos${cell.attention ? `; ${cell.attention} con falla u observación` : ''}${cell.overdue ? `; ${cell.overdue} no realizados en término` : ''}.`;
  return (
    <button type="button" onClick={onOpen} className={`program-mark ${cell.state}`} title={`${task} · ${period}: ${detail}`} aria-label={`${task} · ${period}: ${detail}`}>
      {cell.state === 'empty' ? <span aria-hidden="true">—</span> : <><strong>{cell.recorded || cell.planned}</strong><small>{cell.recorded ? `/${cell.planned}` : 'prev.'}</small></>}
    </button>
  );
}

function ReportMetric({ icon, label, value, tone }: { icon: string; label: string; value: number; tone: string }) {
  return <div className={`report-metric ${tone}`}><span><Icon name={icon} size={18} /></span><div><strong>{value.toLocaleString('es-AR')}</strong><small>{label}</small></div></div>;
}

export function ReportsPage({ actions }: { actions: AppActions }) {
  const { data, user, toast } = useApp();
  const catalog = workspaceModules(data);
  const visible = visibleData(data, user);
  const [year, setYear] = useState(currentReportYear);
  const [module, setModule] = useState<string>('all');
  const [busy, setBusy] = useState(false);
  const yearTasks = useMemo(
    () => visible.tasks.filter(task => module === 'all' || task.module === module),
    [visible.tasks, module],
  );
  const annual = useMemo(() => buildAnnualReport({ ...data, records: visible.records }, yearTasks, year), [data, visible.records, yearTasks, year]);
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

  return <>
    <div className="annual-actions"><p>Seguimiento anual de los controles programados.</p><DownloadButton busy={busy} label="Exportar cronograma" onClick={() => void downloadAnnual()} /></div>
      <section className="program-sheet" aria-labelledby="program-title">
        <h2 id="program-title" className="annual-section-title">Cronograma anual <span>F-PME-00</span></h2>
        <div className="program-toolbar">
          <div className="year-switcher"><button className="icon-button" aria-label="Año anterior" onClick={() => setYear(value => value - 1)}><Icon name="ChevronLeft" /></button><span><small>Año del informe</small><strong>{year}</strong></span><button className="icon-button" aria-label="Año siguiente" onClick={() => setYear(value => value + 1)}><Icon name="ChevronRight" /></button></div>
          <label className="program-module-filter"><span>Módulo</span><select aria-label="Filtrar programa por módulo" value={module} onChange={event => setModule(event.target.value)}><option value="all">Todos los módulos</option>{catalog.filter(item => allowed(user, item.id)).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <button className="button secondary small" onClick={() => setYear(currentReportYear())}><Icon name="CalendarDays" size={15} />Ir al año actual</button>
        </div>

        <div className="report-metrics">
          <ReportMetric icon="ClipboardCheck" label="programaciones" value={annual.summary.tasks} tone="navy" />
          <ReportMetric icon="CalendarDays" label="controles previstos" value={annual.summary.planned} tone="blue" />
          <ReportMetric icon="CheckCircle2" label="registros vinculados" value={annual.summary.recorded} tone="green" />
          <ReportMetric icon="TriangleAlert" label="vencidas o con falla" value={annual.summary.overdue + annual.summary.attention} tone="amber" />
        </div>

        <div className="program-legend" aria-label="Referencias del informe">
          <span><i className="compliant" />Verde: realizado y conforme</span><span><i className="pending" />Negro: pendiente</span><span><i className="alert" />Rojo: no realizado o con falla</span>
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
                {row.months.map((cell, index) => <td className={index === currentMonth ? 'current-month' : ''} key={reportMonths[index]}><CellMark cell={cell} task={row.task.title} period={`${reportMonths[index]} ${year}`} onOpen={() => actions.viewTask(row.task, { month: `${year}-${String(index + 1).padStart(2, '0')}` })} /></td>)}
              </tr>)}
            </Fragment>)}</tbody>
          </table>
        </div>
        <div className="program-scroll-note"><Icon name="ArrowRight" size={14} />En celular, deslizá la tabla para consultar los 12 meses.</div>
      </section>

      <details className="annual-explanation"><summary>¿Cómo se calcula el cronograma?</summary><p>Se comparan la planificación y los controles vinculados a cada tarea. El historial conserva también los controles fuera de programación.</p>{annual.summary.unlinkedRecords > 0 && <p>{annual.summary.unlinkedRecords} controles sin tarea vinculada no se cuentan como cumplimiento de una tarea programada.</p>}</details>
  </>;
}
