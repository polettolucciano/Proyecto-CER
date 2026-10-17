import { useMemo } from 'react';
import { Avatar, Badge, Empty, Icon, ModuleIcon } from '../../components';
import { modules, moduleById } from '../../data';
import { addDays, daysBetween, formatDate, taskStatus, today, visibleData } from '../../domain';
import { useApp } from '../../store';
import type { Task } from '../../types';
import { RecordsTable, type Actions, useExport } from '../../pages';

function TaskRow({ task, actions }: { task: Task; actions: Actions }) {
  const { data } = useApp();
  const owner = data.users.find(item => item.id === task.assignedTo);
  const equipment = data.equipment.find(item => item.id === task.equipmentId);
  const status = taskStatus(task, data.settings.advanceDays);
  const date = today();
  const dateLabel = task.due === date ? 'Hoy' : task.due < date ? `Venció ${formatDate(task.due, { day: '2-digit', month: 'short' })}` : formatDate(task.due, { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <button className="pulse-task" onClick={() => actions.viewTask(task)}>
      <ModuleIcon module={task.module} />
      <span className="pulse-task-copy">
        <strong>{task.title}</strong>
        <small>{equipment?.name ?? moduleById(task.module).name}</small>
      </span>
      <span className="pulse-task-owner"><Avatar initials={owner?.initials ?? '—'} className="tiny-avatar" /><small>{owner?.name ?? 'Sin asignar'}</small></span>
      <span className="pulse-task-date"><Badge>{status}</Badge><small>{dateLabel}</small></span>
      <Icon name="ChevronRight" size={18} className="row-chevron" />
    </button>
  );
}

function QueueSection({ title, caption, tasks, actions, tone }: { title: string; caption: string; tasks: Task[]; actions: Actions; tone: 'critical' | 'today' | 'next' }) {
  return (
    <section className={`queue-section ${tone}`}>
      <header>
        <span className="queue-signal" />
        <div><h3>{title}<b>{tasks.length}</b></h3><p>{caption}</p></div>
      </header>
      <div>{tasks.length ? tasks.map(task => <TaskRow task={task} actions={actions} key={task.id} />) : <Empty icon="CheckCheck" title="Sin tareas en esta categoría" description="El equipo está al día por el momento." />}</div>
    </section>
  );
}

function QuickAction({ icon, title, caption, onClick }: { icon: string; title: string; caption: string; onClick: () => void }) {
  return <button className="quick-action" onClick={onClick}><span><Icon name={icon} size={20} /></span><div><strong>{title}</strong><small>{caption}</small></div><Icon name="ArrowUpRight" size={17} /></button>;
}

export function Dashboard({ actions }: { actions: Actions }) {
  const { data, user } = useApp();
  const visible = visibleData(data, user);
  const date = today();
  const { busy, download } = useExport();

  const summary = useMemo(() => {
    const active = visible.tasks.filter(task => task.active).sort((a, b) => a.due.localeCompare(b.due));
    const overdue = active.filter(task => task.due < date);
    const dueToday = active.filter(task => task.due === date);
    const upcoming = active.filter(task => task.due > date && daysBetween(date, task.due) <= data.settings.advanceDays);
    const recent = visible.records.filter(record => record.date >= addDays(date, -30) && record.date <= date);
    return { active, overdue, dueToday, upcoming, recent };
  }, [visible.tasks, visible.records, data.settings.advanceDays, date]);

  const attention = summary.overdue.length + summary.dueToday.length;
  const operational = visible.equipment.filter(item => item.status === 'Operativo').length;
  const definedModules = modules.filter(module => module.defined && visible.equipment.some(item => item.module === module.id));
  const undefinedModules = modules.filter(module => !module.defined && visible.equipment.some(item => item.module === module.id));
  const recentRecords = [...visible.records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const firstName = user.name.split(' ')[0];

  return (
    <div className="pulse-dashboard">
      <header className="pulse-hero">
        <div className="pulse-hero-copy">
          <div className="pulse-date"><span />{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <p className="pulse-kicker">Pulso operativo CER</p>
          <h1>{attention ? `${attention} ${attention === 1 ? 'control necesita' : 'controles necesitan'} atención hoy` : 'El centro está al día'}</h1>
          <p>{attention ? `${firstName}, empezá por las tareas vencidas y continuá con la agenda de hoy.` : `${firstName}, no hay controles vencidos ni programados para hoy.`}</p>
        </div>
        <div className="pulse-hero-actions">
          <button className="button pulse-secondary" disabled={busy} onClick={() => void download(summary.recent)}><Icon name="ArrowDownToLine" size={17} />{busy ? 'Preparando…' : 'Exportar actividad'}</button>
          <button className="button pulse-primary" onClick={() => actions.newRecord()}><Icon name="Plus" size={19} />Registrar control</button>
        </div>
        <div className="pulse-indicator" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
      </header>

      <div className="pulse-metrics" aria-label="Resumen del centro">
        <button onClick={() => actions.navigate('planning')}><span className="metric-icon urgent"><Icon name="TriangleAlert" size={20} /></span><div><small>Vencidos</small><strong>{summary.overdue.length}</strong></div><em>{summary.overdue.length ? 'Requieren revisión' : 'Sin atrasos'}</em></button>
        <button onClick={() => actions.navigate('planning')}><span className="metric-icon today"><Icon name="CalendarDays" size={20} /></span><div><small>Para hoy</small><strong>{summary.dueToday.length}</strong></div><em>Agenda del día</em></button>
        <button onClick={() => actions.navigate('equipment')}><span className="metric-icon healthy"><Icon name="Activity" size={20} /></span><div><small>Operativos</small><strong>{operational}/{visible.equipment.length}</strong></div><em>Equipos y sectores</em></button>
        <button onClick={() => actions.navigate('records')}><span className="metric-icon records"><Icon name="FileCheck2" size={20} /></span><div><small>Registrados</small><strong>{summary.recent.length}</strong></div><em>Últimos 30 días</em></button>
      </div>

      <div className="pulse-layout">
        <main className="pulse-worklist">
          <div className="pulse-section-heading">
            <div><span className="section-rule" /><div><h2>Prioridades de mantenimiento</h2><p>Ordenadas por urgencia para decidir el próximo paso.</p></div></div>
            <button className="text-button" onClick={() => actions.navigate('planning')}>Abrir planificación<Icon name="ArrowRight" size={16} /></button>
          </div>
          {summary.overdue.length > 0 && <QueueSection title="Fuera de fecha" caption="Controles que deben revisarse primero" tasks={summary.overdue.slice(0, 3)} actions={actions} tone="critical" />}
          <QueueSection title="Agenda de hoy" caption="Actividades programadas para esta jornada" tasks={summary.dueToday.slice(0, 4)} actions={actions} tone="today" />
          <QueueSection title="Próximos controles" caption={`Dentro de los próximos ${data.settings.advanceDays} días`} tasks={summary.upcoming.slice(0, 4)} actions={actions} tone="next" />
        </main>

        <aside className="pulse-aside">
          <section className="pulse-side-section">
            <header><h2>Accesos rápidos</h2><p>Las tareas más utilizadas del sistema.</p></header>
            <div className="quick-actions">
              <QuickAction icon="ClipboardCheck" title="Registrar un control" caption="Elegir módulo y equipo" onClick={() => actions.newRecord()} />
              {user.role !== 'Responsable técnico' && <QuickAction icon="CalendarDays" title="Programar mantenimiento" caption="Crear una tarea recurrente" onClick={() => actions.editTask()} />}
              <QuickAction icon="Wrench" title="Buscar un equipo" caption="Abrir ficha e historial" onClick={() => actions.navigate('equipment')} />
              <QuickAction icon="FileSpreadsheet" title="Preparar un reporte" caption="Filtrar y exportar registros" onClick={() => actions.navigate('reports')} />
            </div>
          </section>

          <section className="pulse-side-section coverage-section">
            <header><h2>Cobertura de formularios</h2><p>Alcance confirmado por la documentación de CER.</p></header>
            <div className="coverage-list">
              {definedModules.map(module => <button key={module.id} onClick={() => actions.newRecord(module.id)}><ModuleIcon module={module.id} small /><span><strong>{module.name}</strong><small>Formulario documentado</small></span><Icon name="ChevronRight" size={16} /></button>)}
            </div>
            {undefinedModules.length > 0 && <div className="coverage-pending"><Icon name="CircleHelp" size={18} /><p><strong>{undefinedModules.length} módulos pendientes de definición</strong><span>No se completarán checklists sin la planilla validada por CER.</span></p></div>}
          </section>
        </aside>
      </div>

      <section className="pulse-recent panel">
        <div className="pulse-section-heading">
          <div><span className="section-rule" /><div><h2>Actividad reciente</h2><p>Últimos controles registrados por el equipo.</p></div></div>
          <button className="text-button" onClick={() => actions.navigate('records')}>Ver historial completo<Icon name="ArrowRight" size={16} /></button>
        </div>
        <RecordsTable records={recentRecords} actions={actions} compact />
      </section>
    </div>
  );
}
