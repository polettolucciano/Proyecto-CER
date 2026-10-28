import { Badge, Empty, Icon, ModuleIcon, PageHeader } from '../../components';
import { modules } from '../../data';
import { addDays, formatDate, taskStatus, today, visibleData } from '../../domain';
import { useApp } from '../../store';
import type { Task } from '../../types';
import type { AppActions } from '../../app/actions';
import { RecordsTable } from '../records/RecordsTable';

function Worklist({ title, tasks, actions, operational }: { title: string; tasks: Task[]; actions: AppActions; operational: boolean }) {
  const { data } = useApp();
  return <section className="panel home-worklist">
    <header className="panel-heading"><h2>{title} <span className="count-pill">{tasks.length}</span></h2></header>
    {tasks.length ? tasks.map(task => {
      const equipment = data.equipment.find(item => item.id === task.equipmentId);
      return <div className="home-task" key={task.id}>
        <ModuleIcon module={task.module} small />
        <div className="home-task-copy"><button className="task-title-link" onClick={() => actions.viewTask(task)}>{task.title}</button><small>{equipment?.name ?? 'Equipo sin identificar'}{!operational && ` · ${'Enfermería'}`}</small><span className="home-task-meta"><Badge>{taskStatus(task, data.settings.advanceDays)}</Badge><span>{formatDate(task.due, { day: 'numeric', month: 'short' })}</span></span></div>
        <button className="button secondary small" aria-label={`Registrar ${task.title}`} onClick={() => actions.newRecord(task.module, task)}>Registrar<Icon name="ArrowRight" size={16} /></button>
      </div>;
    }) : <Empty icon="CheckCheck" title="Sin controles pendientes en esta lista" description="Podés consultar la agenda o registrar un control fuera de programación." />}
  </section>;
}

export function Dashboard({ actions }: { actions: AppActions }) {
  const { data, user } = useApp();
  const visible = visibleData(data, user);
  const date = today();
  const operational = user.role === 'Enfermería';
  const activeTasks = visible.tasks.filter(task => task.active).sort((a, b) => a.due.localeCompare(b.due));
  const pending = activeTasks.filter(task => task.due <= date);
  const upcoming = activeTasks.filter(task => task.due > date && task.due <= addDays(date, data.settings.advanceDays));
  const records = visible.records.filter(record => record.status === 'active');
  const recent = records.filter(record => record.date >= addDays(date, -30) && record.date <= date);
  const attention = recent.filter(record => record.result === 'attention');
  const recentRecords = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const controls = modules.filter(module => module.defined && visible.equipment.some(item => item.module === module.id));
  const displayDate = formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
  return <div className="simple-home">
    <PageHeader title={operational ? 'Controles de hoy' : 'Resumen del centro'} description={`${displayDate.charAt(0).toUpperCase() + displayDate.slice(1)} · ${operational ? 'Controles compartidos: cualquier integrante de Enfermería puede realizarlos.' : 'Pendientes del equipo y resultados de los últimos 30 días.'}`}>
      {!operational && <button className="button secondary" onClick={() => actions.navigate('reports')}><Icon name="FileSpreadsheet" size={17} />Ver informes</button>}
      <button className="button primary" onClick={() => actions.newRecord()}><Icon name="Plus" size={18} />Registrar control</button>
    </PageHeader>
    {!operational && <div className="home-summary" aria-label="Resumen operativo">
      <button onClick={() => actions.navigate('planning')}><span className="metric-icon urgent"><Icon name="Clock3" /></span><span><strong>{activeTasks.filter(task => task.due < date).length}</strong><small>Controles vencidos</small></span></button>
      <button onClick={() => actions.navigate('planning')}><span className="metric-icon today"><Icon name="CalendarDays" /></span><span><strong>{activeTasks.filter(task => task.due === date).length}</strong><small>Programados para hoy</small></span></button>
      <button onClick={() => actions.navigate('records')}><span className="metric-icon healthy"><Icon name="FileCheck2" /></span><span><strong>{recent.length}</strong><small>Registrados en 30 días</small></span></button>
      <button onClick={() => document.getElementById('home-observations')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span className="metric-icon urgent"><Icon name="TriangleAlert" /></span><span><strong>{attention.length}</strong><small>Con observaciones · 30 días</small></span></button>
    </div>}
    <div className="home-columns">
      <div className="home-primary">
        <Worklist title={operational ? 'Para completar · hoy y atrasados' : 'Controles pendientes · hoy y atrasados'} tasks={pending} actions={actions} operational={operational} />
        {upcoming.length > 0 && <details className="home-upcoming"><summary>Próximos {data.settings.advanceDays} días <span className="count-pill">{upcoming.length}</span><Icon name="ChevronDown" size={17} /></summary><Worklist title="Próximos controles" tasks={upcoming} actions={actions} operational={operational} /></details>}
        <button className="text-button" onClick={() => actions.navigate('planning')}>{operational ? 'Consultar agenda de mis módulos' : 'Abrir agenda completa'}<Icon name="ArrowRight" size={16} /></button>
      </div>
      <aside className="panel home-modules"><header className="panel-heading"><div><h2>Registrar otro control</h2><p>Elegí el formulario que necesitás.</p></div></header>
        {controls.map(module => <button className="home-module" key={module.id} onClick={() => actions.newRecord(module.id)}><ModuleIcon module={module.id} small /><span>{module.name}</span><Icon name="ChevronRight" size={17} /></button>)}
        <button className="text-button" onClick={() => actions.newRecord()}>Todos los formularios<Icon name="ArrowRight" size={16} /></button>
        <div className="home-help-links"><button className="text-button" onClick={() => actions.navigate('equipment')}><Icon name="Search" size={16} />Consultar equipo e historial</button><button className="text-button" onClick={() => actions.navigate('training')}><Icon name="BookOpen" size={16} />Capacitaciones</button></div>
      </aside>
    </div>
    {!operational && <section id="home-observations" className="panel home-observations"><header className="panel-heading"><div><h2>Controles con observaciones</h2><p>Registros vigentes de los últimos 30 días para revisar con el equipo.</p></div></header>{attention.length ? <RecordsTable records={[...attention].sort((a, b) => b.date.localeCompare(a.date))} actions={actions} compact /> : <Empty icon="CheckCircle2" title="Sin observaciones registradas en este período" description="Los controles con observaciones aparecerán aquí." />}</section>}
    <section className="panel"><header className="panel-heading"><div><h2>{operational ? 'Últimos registros del equipo' : 'Últimos registros del equipo'}</h2></div><button className="text-button" onClick={() => actions.navigate('records')}>Ver historial<Icon name="ArrowRight" size={16} /></button></header><RecordsTable records={recentRecords} actions={actions} compact /></section>
  </div>;
}
