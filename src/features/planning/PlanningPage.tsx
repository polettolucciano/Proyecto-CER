import { useState } from 'react';
import type { AppActions } from '../../app/actions';
import { Badge, Empty, Icon, ModuleIcon, PageHeader } from '../../components';
import { moduleById } from '../../data';
import { addDays, formatDate, iso, monthTitle, occurrences, parseDate, taskStatus, today } from '../../domain';
import { useVisibleWorkspace } from '../../shared/hooks/useVisibleWorkspace';
import { ModuleSelect, SearchField } from '../../shared/ui/filters';
import { useApp } from '../../store';

type PlanningView = 'Lista' | 'Calendario';

export function PlanningPage({ actions }: { actions: AppActions }) {
  const data = useVisibleWorkspace();
  const { user } = useApp();
  const [selectedView, setView] = useState<PlanningView>('Lista');
  const calendarOnly = user.role === 'Enfermería';
  const view = calendarOnly ? 'Calendario' : selectedView;
  const [module, setModule] = useState('all');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(parseDate(today()));
  const tasks = data.tasks.filter(task => task.active && (module === 'all' || task.module === module) && (status === 'all' || taskStatus(task, data.settings.advanceDays) === status) && task.title.toLowerCase().includes(query.toLowerCase())).sort((left, right) => left.due.localeCompare(right.due));
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (start.getDay() + 6) % 7;
  const calendarStart = new Date(start);
  calendarStart.setDate(1 - offset);
  const calendarDays = Array.from({ length: 42 }, (_, index) => addDays(iso(calendarStart), index));
  const monthOccurrences = tasks.flatMap(task => occurrences(task, calendarDays[0], calendarDays[41]).map(date => ({ task, date })));
  const year = month.getFullYear();
  const canPlan = user.role !== 'Enfermería';

  return <><PageHeader eyebrow="ORGANIZACIÓN" title={calendarOnly ? 'Calendario de controles' : 'Planificación de mantenimiento'} description="Agenda compartida de Enfermería. Cualquier integrante del equipo puede realizar los controles.">{canPlan && <button className="button primary" onClick={() => actions.editTask()}><Icon name="Plus" size={17} />Programar tarea</button>}</PageHeader><div className="planning-summary"><div><span className="dot amber" /><strong>{data.tasks.filter(task => task.active && task.due < today()).length}</strong> vencidas</div><div><span className="dot blue" /><strong>{data.tasks.filter(task => task.active && task.due === today()).length}</strong> para hoy</div><div><span className="dot teal" /><strong>{data.tasks.filter(task => task.active && task.due > today() && task.due <= addDays(today(), 7)).length}</strong> esta semana</div><span className="muted">Las recurrencias se actualizan con cada control vinculado.</span></div><section className={`panel ${calendarOnly ? 'calendar-only' : ''}`}><div className="planning-toolbar"><div className="view-tabs" hidden={calendarOnly}>{([['Lista', 'List'], ['Calendario', 'CalendarDays']] as const).map(([option, icon]) => <button key={option} onClick={() => setView(option)} className={view === option ? 'active' : ''}><Icon name={icon} size={16} />{option}</button>)}</div>{!calendarOnly && <button className="text-button" onClick={() => actions.navigate('reports')}>Programa anual<Icon name="ArrowUpRight" size={16} /></button>}{view === 'Calendario' && <div className="calendar-nav"><button className="icon-button" aria-label="Período anterior" onClick={() => setMonth(new Date(year, month.getMonth() - 1, 1))}><Icon name="ChevronLeft" size={17} /></button><strong>{monthTitle(month)}</strong><button className="icon-button" aria-label="Período siguiente" onClick={() => setMonth(new Date(year, month.getMonth() + 1, 1))}><Icon name="ChevronRight" size={17} /></button><button className="button small secondary" onClick={() => setMonth(parseDate(today()))}>Hoy</button></div>}</div><div className="filter-bar"><SearchField value={query} onChange={setQuery} placeholder="Buscar tarea…" /><ModuleSelect value={module} onChange={setModule} /><select aria-label="Filtrar tareas por estado" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Todos los estados</option>{['Vencido', 'Para hoy', 'Próximo', 'Programado'].map(option => <option key={option}>{option}</option>)}</select></div>
    {view === 'Lista' && (tasks.length ? <div className="table-scroll"><table className="data-table task-table"><thead><tr><th>Tarea programada</th><th>Frecuencia</th><th>Próxima fecha</th><th>Equipo responsable</th><th>Estado</th><th /></tr></thead><tbody>{tasks.map(task => <tr key={task.id}><td><button className="table-link" onClick={() => actions.viewTask(task)}><ModuleIcon module={task.module} small /><span><strong>{task.title}</strong><small>{data.equipment.find(equipment => equipment.id === task.equipmentId)?.code} · {moduleById(task.module).name}</small></span></button></td><td><span className="frequency-pill"><Icon name="RefreshCw" size={12} />{task.frequency}</span></td><td className="nowrap">{formatDate(task.due)}</td><td>Enfermería</td><td><Badge>{taskStatus(task, data.settings.advanceDays)}</Badge></td><td><button className="icon-button" aria-label={`Abrir ${task.title}`} onClick={() => actions.viewTask(task)}><Icon name="ChevronRight" size={17} /></button></td></tr>)}</tbody></table></div> : <Empty title="Sin tareas para estos filtros" description="Cambiá los filtros o programá un mantenimiento." />)}
    {view === 'Calendario' && <div className="calendar-scroll"><div className="calendar-grid">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => <div className="weekday" key={day}>{day}</div>)}{calendarDays.map(day => { const events = monthOccurrences.filter(event => event.date === day); return <div key={day} className={`calendar-day ${parseDate(day).getMonth() !== month.getMonth() ? 'outside' : ''} ${day === today() ? 'today' : ''}`}><span className="day-number">{parseDate(day).getDate()}</span>{events.slice(0, 3).map(({ task }) => <button title={task.title} className={`calendar-event ${moduleById(task.module).color}`} key={task.id} onClick={() => actions.viewTask(task)}><i />{task.title}</button>)}{events.length > 3 && <span className="calendar-more">+ {events.length - 3} tareas</span>}</div>; })}</div></div>}
    <div className="panel-bottom"><Icon name="CalendarDays" size={15} /><span>{tasks.length} tareas en el programa · Seleccioná un control para consultar su detalle.</span></div></section></>;
}

