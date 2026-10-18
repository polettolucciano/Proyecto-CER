import { useState } from 'react';
import { Avatar, Badge, Empty, Icon, Modal, ModuleIcon } from '../../components';
import { moduleById } from '../../data';
import { canManage, formatDate, taskStatus, today, visibleData } from '../../domain';
import { navigation } from '../../navigation';
import type { AppActions } from '../../app/actions';
import { RecordsTable } from '../records/RecordsTable';
import { useApp } from '../../store';
import type { Equipment, MaintenanceRecord, Task } from '../../types';

export function TaskDetail({ task, actions, onClose }: { task: Task; actions: AppActions; onClose: () => void }) {
  const { data, user } = useApp();
  const equipment = data.equipment.find(item => item.id === task.equipmentId);
  const owner = data.users.find(item => item.id === task.assignedTo);
  return (
    <Modal title="Detalle de la tarea" subtitle={moduleById(task.module).name} onClose={onClose}>
      <div className="modal-body">
        <div className="detail-summary"><ModuleIcon module={task.module} /><Badge>{taskStatus(task, data.settings.advanceDays)}</Badge></div>
        <h2 className="task-detail-title">{task.title}</h2>
        <div className="detail-metadata two">
          <div><span>Fecha programada</span><strong>{formatDate(task.due)}</strong></div>
          <div><span>Periodicidad</span><strong>{task.frequency}</strong></div>
          <div><span>Equipo o sector</span><strong>{equipment?.name ?? 'Sin equipo'}</strong></div>
          <div><span>Ubicación</span><strong>{equipment?.location ?? '—'}</strong></div>
        </div>
        <div className="responsible-note"><Avatar initials={owner?.initials ?? '—'} /><div><small>Responsable asignado</small><strong>{owner?.name ?? 'Sin asignar'}</strong></div></div>
        {task.notes && <section className="detail-section"><h3>Indicaciones</h3><p className="preserve-lines">{task.notes}</p></section>}
        <div className="inline-notice soft"><Icon name="RefreshCw" /><span>Al registrar este control, la próxima fecha se actualizará según la periodicidad configurada.</span></div>
      </div>
      <footer className="modal-footer">
        {user.role !== 'Responsable técnico' ? <button className="button secondary" onClick={() => actions.editTask(task)}><Icon name="Pencil" size={16} />Editar tarea</button> : <button className="button secondary" onClick={onClose}>Cerrar</button>}
        <button className="button primary" onClick={() => actions.newRecord(task.module, task)}><Icon name="ClipboardCheck" size={16} />Registrar control</button>
      </footer>
    </Modal>
  );
}

export function EquipmentDetail({ equipment, actions, onClose }: { equipment: Equipment; actions: AppActions; onClose: () => void }) {
  const { data, user } = useApp();
  const records = data.records.filter(item => item.equipmentId === equipment.id).sort((a, b) => b.date.localeCompare(a.date));
  const tasks = data.tasks.filter(item => item.active && item.equipmentId === equipment.id);
  return (
    <Modal title={equipment.name} subtitle={`${equipment.code} · ${moduleById(equipment.module).name}`} onClose={onClose} wide>
      <div className="modal-body">
        <div className="detail-summary"><ModuleIcon module={equipment.module} /><Badge>{equipment.status}</Badge></div>
        <div className="detail-metadata">
          <div><span>Ubicación</span><strong>{equipment.location}</strong></div>
          <div><span>Modelo</span><strong>{equipment.model || 'Sin especificar'}</strong></div>
          <div><span>Número de serie</span><strong>{equipment.serial || 'Sin especificar'}</strong></div>
        </div>
        <section className="detail-section">
          <h3>Mantenimientos programados <span className="count-pill">{tasks.length}</span></h3>
          {tasks.map(task => <button className="detail-task" onClick={() => actions.viewTask(task)} key={task.id}><span><strong>{task.title}</strong><small>{task.frequency} · {formatDate(task.due)}</small></span><Icon name="ChevronRight" size={16} /></button>)}
          {!tasks.length && <p className="muted">No hay tareas programadas para este equipo.</p>}
        </section>
        <section className="detail-section">
          <h3>Historial del equipo <span className="count-pill">{records.length}</span></h3>
          <RecordsTable records={records.slice(0, 5)} actions={actions} compact />
          {records.length > 5 && <button className="text-button mt" onClick={() => { onClose(); actions.navigate('records', equipment.module); }}>Ver todos los registros del módulo<Icon name="ArrowRight" size={15} /></button>}
        </section>
      </div>
      <footer className="modal-footer">
        {canManage(user) ? <button className="button secondary" onClick={() => actions.editEquipment(equipment)}><Icon name="Pencil" size={16} />Editar ficha</button> : <button className="button secondary" onClick={onClose}>Cerrar</button>}
        <button className="button primary" onClick={() => actions.newRecord(equipment.module, undefined, equipment.id)}><Icon name="Plus" size={17} />Nuevo control</button>
      </footer>
    </Modal>
  );
}

export function SearchModal({ actions, onClose }: { actions: AppActions; onClose: () => void }) {
  const { data, user } = useApp();
  const visible = visibleData(data, user);
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const tasks = visible.tasks.filter(item => item.title.toLowerCase().includes(normalized)).slice(0, 4);
  const equipment = visible.equipment.filter(item => `${item.name} ${item.code}`.toLowerCase().includes(normalized)).slice(0, 4);
  const records = visible.records.filter(item => `${item.id} ${moduleById(item.module).name}`.toLowerCase().includes(normalized)).slice(0, 4);
  const groups: { label: string; items: (Equipment | Task | MaintenanceRecord)[] }[] = [
    { label: 'Equipos y sectores', items: equipment },
    { label: 'Tareas', items: tasks },
    { label: 'Registros', items: records },
  ];
  return (
    <Modal title="Buscar en CER" subtitle="Encontrá equipos, tareas y registros en un mismo lugar." onClose={onClose}>
      <div className="modal-body">
        <div className="search-field search-large"><Icon name="Search" /><input name="global-search" autoComplete="off" placeholder="Escribí un equipo, módulo o registro…" aria-label="Búsqueda global" value={query} onChange={event => setQuery(event.target.value)} /></div>
        {!normalized ? (
          <div className="search-suggestions"><p className="muted">Accesos rápidos</p>{navigation.slice(0, 6).map(item => <button key={item.id} onClick={() => { onClose(); actions.navigate(item.id); }}><Icon name={item.icon} /><span>{item.label}</span><Icon name="ArrowUpRight" size={15} /></button>)}</div>
        ) : groups.map(group => (
          <section key={group.label} className="search-results">
            <h3>{group.label}</h3>
            {group.items.map(item => <button key={item.id} onClick={() => { if ('code' in item) actions.viewEquipment(item); else if ('title' in item) actions.viewTask(item); else actions.viewRecord(item); }}><ModuleIcon module={item.module} small /><span>{'name' in item ? item.name : 'title' in item ? item.title : `${moduleById(item.module).name} · ${item.id}`}</span><Icon name="ArrowUpRight" size={15} /></button>)}
            {!group.items.length && <p className="muted small-text">Sin coincidencias</p>}
          </section>
        ))}
      </div>
    </Modal>
  );
}

export function Notifications({ actions, onClose }: { actions: AppActions; onClose: () => void }) {
  const { data, user } = useApp();
  const tasks = visibleData(data, user).tasks.filter(task => task.active && task.due <= today()).sort((a, b) => a.due.localeCompare(b.due));
  return (
    <Modal title="Atención operativa" subtitle="Tareas vencidas y controles pendientes para hoy." onClose={onClose}>
      <div className="modal-body notification-list">
        {tasks.length ? tasks.map(task => <button key={task.id} onClick={() => actions.viewTask(task)}><span className={`module-icon ${task.due < today() ? 'amber' : 'blue'}`}><Icon name={task.due < today() ? 'TriangleAlert' : 'Clock3'} /></span><span><strong>{task.title}</strong><small>{task.due < today() ? `Venció el ${formatDate(task.due)}` : 'Programado para hoy'} · {moduleById(task.module).name}</small></span><Icon name="ChevronRight" size={16} /></button>) : <Empty icon="CheckCheck" title="Todo al día" description="No hay tareas vencidas ni controles pendientes para hoy." />}
      </div>
      <footer className="modal-footer"><span className="muted small-text">Avisos dentro de la aplicación</span><button className="button secondary" onClick={() => { onClose(); actions.navigate('planning'); }}>Ver planificación<Icon name="ArrowRight" size={15} /></button></footer>
    </Modal>
  );
}
