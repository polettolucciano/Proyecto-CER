import { useState } from 'react';
import type { AppActions } from '../../app/actions';
import { Badge, Empty, Icon, ModuleIcon, PageHeader } from '../../components';
import { moduleById } from '../../data';
import { addDays, canPlan, formatDate, iso, monthTitle, parseDate, taskStatus, today } from '../../domain';
import { useVisibleWorkspace } from '../../shared/hooks/useVisibleWorkspace';
import { ModuleSelect, SearchField } from '../../shared/ui/filters';
import { SectionTabs } from '../../shared/ui/SectionTabs';
import { useApp } from '../../store';
import { calendarControls } from './calendarEvents';
import { responsibleName } from '../modules/moduleResponsibility';
import { ReportsPage } from '../reports/ReportsPage';

const views = [{ value: 'list', label: 'Pendientes' }, { value: 'calendar', label: 'Calendario' }, { value: 'annual', label: 'Cronograma' }];
const statuses = ['all', 'Vencido', 'Para hoy', 'Próximo', 'Programado'];
const statusLabels: Record<string, string> = { all: 'Todos', Vencido: 'Vencidos', 'Para hoy': 'Hoy', Próximo: 'Próximos', Programado: 'Más adelante', Realizado: 'Realizados' };

export function PlanningPage({ actions, initialView, onViewChange }: { actions: AppActions; initialView?: string; onViewChange: (view: string) => void }) {
  const data = useVisibleWorkspace();
  const { user } = useApp();
  const view = views.some(item => item.value === initialView) ? initialView : 'list';
  const [module, setModule] = useState('all');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(parseDate(today()));
  const [expandedDay, setExpandedDay] = useState('');
  const baseTasks = data.tasks.filter(task => task.active && (module === 'all' || task.module === module) && `${task.title} ${data.equipment.find(item => item.id === task.equipmentId)?.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const effectiveStatus = view === 'list' && status === 'Realizado' ? 'all' : status;
  const tasks = baseTasks.filter(task => effectiveStatus === 'all' || taskStatus(task, data.settings.advanceDays) === effectiveStatus).sort((a, b) => a.due.localeCompare(b.due));
  const year = month.getFullYear();
  const start = new Date(year, month.getMonth(), 1);
  const calendarStart = new Date(start);
  calendarStart.setDate(1 - (start.getDay() + 6) % 7);
  const calendarDays = Array.from({ length: 42 }, (_, index) => addDays(iso(calendarStart), index));
  const allCalendarEvents = calendarControls(data, baseTasks, calendarDays[0], calendarDays[41], true, module, query);
  const eventStatus = (event: typeof allCalendarEvents[number]) => event.record ? 'Realizado' : taskStatus({ ...event.task!, due: event.date }, data.settings.advanceDays);
  const events = allCalendarEvents.filter(event => effectiveStatus === 'all' || eventStatus(event) === effectiveStatus);
  const monthControls = allCalendarEvents.filter(event => parseDate(event.date).getMonth() === month.getMonth());
  const visibleStatuses = view === 'calendar' ? [...statuses, 'Realizado'] : statuses;
  const countStatus = (item: string) => view === 'calendar' ? monthControls.filter(event => item === 'all' || eventStatus(event) === item).length : baseTasks.filter(task => item === 'all' || taskStatus(task, data.settings.advanceDays) === item).length;
  const monthEvents = events.filter(event => parseDate(event.date).getMonth() === month.getMonth());

  return <>
    <PageHeader title="Planificación" description="Todo lo pendiente y programado, en un solo lugar.">
      {canPlan(user) && <button className="button primary" onClick={() => actions.editTask()}><Icon name="Plus" size={17} />Programar control</button>}
    </PageHeader>
    <SectionTabs label="Vistas de planificación" page="planning" value={view ?? 'list'} items={views} onChange={onViewChange} />
    {view === 'annual' ? <ReportsPage actions={actions} /> : <section className="panel planning-workspace">
      <div className="filter-bar"><SearchField value={query} onChange={setQuery} placeholder="Buscar control o sector…" /><ModuleSelect value={module} onChange={setModule} /></div>
      <div className="queue-filters" aria-label="Estado de los controles">{visibleStatuses.map(item => <button key={item} aria-pressed={effectiveStatus === item} onClick={() => setStatus(item)}>{statusLabels[item]}<span>{countStatus(item)}</span></button>)}</div>
      {view === 'list' ? <div className="planning-task-list">{tasks.length ? tasks.map(task => <article className="planning-task-row" key={task.id}>
        <ModuleIcon module={task.module} small />
        <div className="planning-task-copy"><button className="task-title-link" onClick={() => actions.viewTask(task)}>{task.title}</button><p>{data.equipment.find(item => item.id === task.equipmentId)?.name ?? 'Sin sector'} · {task.frequency} · {responsibleName(data, task.assignedTo)}</p></div>
        <div className="planning-task-date"><strong>{formatDate(task.due)}</strong><Badge>{taskStatus(task, data.settings.advanceDays)}</Badge></div>
        <button className="button secondary small" aria-label={`Realizar ${task.title}`} onClick={() => actions.newRecord(task.module, task)}>Realizar<Icon name="ArrowRight" size={15} /></button>
      </article>) : <Empty title="No hay controles con estos filtros" description="Cambiá el estado, el módulo o la búsqueda." />}</div> : <>
        <div className="calendar-nav unified-calendar-nav"><button className="icon-button" aria-label="Mes anterior" onClick={() => setMonth(new Date(year, month.getMonth() - 1, 1))}><Icon name="ChevronLeft" /></button><strong>{monthTitle(month)}</strong><button className="icon-button" aria-label="Mes siguiente" onClick={() => setMonth(new Date(year, month.getMonth() + 1, 1))}><Icon name="ChevronRight" /></button><button className="button secondary small" onClick={() => setMonth(parseDate(today()))}>Mes actual</button></div>
        <div className="calendar-scroll desktop-calendar"><div className="calendar-grid">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => <div className="weekday" key={day}>{day}</div>)}{calendarDays.map(day => {
          const dayEvents = events.filter(event => event.date === day);
          return <div key={day} className={`calendar-day ${parseDate(day).getMonth() !== month.getMonth() ? 'outside' : ''} ${day === today() ? 'today' : ''}`}><span className="day-number">{parseDate(day).getDate()}</span>{dayEvents.slice(0, expandedDay === day ? undefined : 3).map(event => <button title={event.title} aria-label={`${event.title} · ${event.record ? 'realizado' : 'previsto'} · ${day}`} className={`calendar-event ${event.record ? 'completed' : moduleById(event.module, data.modules).color}`} key={event.key} onClick={() => event.record ? actions.viewRecord(event.record) : event.task && actions.viewTask(event.task, { date: day })}>{event.record ? '✓ ' : ''}{event.title}</button>)}{dayEvents.length > 3 && <button className="calendar-more" onClick={() => setExpandedDay(expandedDay === day ? '' : day)}>{expandedDay === day ? 'Ver menos' : `Ver ${dayEvents.length - 3} más`}</button>}</div>;
        })}</div></div>
        <div className="mobile-calendar-agenda">{Array.from(new Set(monthEvents.map(event => event.date))).sort().map(day => <section key={day}><h2>{formatDate(day, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>{monthEvents.filter(event => event.date === day).map(event => <button key={event.key} aria-label={`${event.title} · ${event.record ? 'realizado' : 'previsto'} · ${day}`} onClick={() => event.record ? actions.viewRecord(event.record) : event.task && actions.viewTask(event.task, { date: day })}><ModuleIcon module={event.module} small /><span><strong>{event.title}</strong><small>{data.equipment.find(item => item.id === event.equipmentId)?.name} · {event.record ? 'Realizado' : 'Previsto'}</small></span><Icon name="ChevronRight" size={16} /></button>)}</section>)}</div>
        {!monthEvents.length && <Empty icon="CalendarDays" title="Sin controles para este mes" description="Elegí otro mes o cambiá los filtros." />}
      </>}
    </section>}
  </>;
}
