import { useState } from 'react';
import { Avatar, Badge, Empty, Icon, Modal, ModuleIcon } from '../../components';
import { moduleById } from '../../data';
import { canManage, formatDate, taskStatus, visibleData, occurrences } from '../../domain';
import type { AppActions } from '../../app/actions';
import { useApp } from '../../store';
import { RecordsTable } from '../records/RecordsTable';
import { annualOccurrences } from '../reports/annualReport';
import { responsibleName, defaultResponsible } from '../modules/moduleResponsibility';
import type { Equipment, MaintenanceRecord, Task } from '../../types';

export function TaskDetail({ task, context, actions, onClose }: { task: Task; context?: { date?: string; month?: string }; actions: AppActions; onClose: () => void }) {
  const { data, user } = useApp();
  const equipment = data.equipment.find(item => item.id === task.equipmentId);
  const records = data.records.filter(record => record.taskId === task.id && (!context?.date || record.date === context.date) && (!context?.month || record.date.startsWith(context.month))).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const dates = !task.active ? [] : context?.date ? occurrences(task, task.due, context.date).filter(date => date === context.date) : context?.month ? annualOccurrences(task, Number(context.month.slice(0,4))).filter(date => date.startsWith(context.month!) && date >= task.due) : [task.due];
  const cancelled = (task.cancellations ?? []).filter(item => (!context?.date || item.date === context.date) && (!context?.month || item.date.startsWith(context.month)));
  return <Modal title={task.title} subtitle={context?.date ? `Control del ${formatDate(context.date)}` : context?.month ? `Programación y registros · ${context.month}` : 'Programación y controles realizados'} onClose={onClose} wide>
    <div className="modal-body"><div className="detail-summary"><ModuleIcon module={task.module} /><Badge>{task.active ? taskStatus(task, data.settings.advanceDays) : task.cancelledFrom || cancelled.length ? 'Cancelado' : 'Completado'}</Badge></div>
      <div className="detail-metadata two"><div><span>Equipo o sector</span><strong>{equipment?.name ?? 'Sin equipo'}</strong></div><div><span>Periodicidad</span><strong>{task.frequency}</strong></div><div><span>Responsable asignado</span><strong>{responsibleName(data, task.assignedTo)}</strong></div><div><span>Próxima fecha</span><strong>{task.active ? formatDate(task.due) : 'Sin próximos controles'}</strong></div></div>
      {task.notes && <p className="task-instructions preserve-lines">{task.notes}</p>}
      <section className="detail-section"><h3>Controles realizados{context?.month || context?.date ? ' en este período' : ''}</h3><RecordsTable records={records} actions={actions} />
      </section>
      <section className="detail-section"><h3>Controles previstos{context?.month || context?.date ? ' en este período' : ''}</h3>{dates.length ? dates.map(date => <div className="scheduled-date-row" key={date}><strong>{formatDate(date)}</strong>{canManage(user) && <button className="button secondary small" aria-label={`Cancelar control del ${date}`} onClick={() => actions.cancelTask(task, date)}>Cancelar control</button>}</div>) : <p className="muted">No hay controles pendientes en el período seleccionado.</p>}</section>
      {(cancelled.length > 0 || task.cancelledFrom) && <section className="detail-section cancellation-history"><h3>Cancelaciones</h3>{cancelled.map(item => <p key={item.date}><strong>{formatDate(item.date)}</strong> · {item.reason}<small>{responsibleName(data, item.cancelledBy)} · {formatDate(item.cancelledAt.slice(0,10))}</small></p>)}{task.cancelledFrom && <p>Programación cancelada desde {formatDate(task.cancelledFrom)}. {task.cancellationReason}<small>{responsibleName(data, task.cancelledBy)}{task.cancelledAt ? ` · ${formatDate(task.cancelledAt.slice(0,10))}` : ''}</small></p>}</section>}
    </div><footer className="modal-footer"><button className="button secondary" onClick={onClose}>Cerrar</button>{canManage(user) && <button className="button secondary" onClick={() => actions.editTask(task)}><Icon name="Pencil" size={16} />Editar programación</button>}{task.active && dates.includes(task.due) && <button className="button primary" onClick={() => actions.newRecord(task.module, task)}>Realizar control</button>}</footer>
  </Modal>;
}

export function EquipmentDetail({ equipment, actions, onClose }: { equipment: Equipment; actions: AppActions; onClose: () => void }) {
  const { data, user } = useApp();
  return (
    <Modal title={equipment.name} subtitle="Datos del equipo o sector." onClose={onClose} wide>
      <div className="modal-body">
        <div className="detail-summary"><ModuleIcon module={equipment.module} /><Badge>{equipment.status}</Badge></div>
        <div className="detail-metadata">
          <div><span>Ubicación</span><strong>{equipment.location}</strong></div>
          <div><span>Modelo</span><strong>{equipment.model || 'Sin especificar'}</strong></div>
          <div><span>Número de serie</span><strong>{equipment.serial || 'Sin especificar'}</strong></div>
        </div>
        <div className="detail-metadata two"><div><span>Código</span><strong>{equipment.code}</strong></div><div><span>Módulo</span><strong>{moduleById(equipment.module, data.modules).name}</strong></div><div><span>Responsable predeterminado</span><strong>{responsibleName(data, defaultResponsible(data, equipment.module, equipment.id))}</strong></div></div>
      </div>
      <footer className="modal-footer">
        {canManage(user) ? <button className="button secondary" onClick={() => actions.editEquipment(equipment)}><Icon name="Pencil" size={16} />Editar sector</button> : null}
        <button className="button secondary" onClick={onClose}>Cerrar</button>
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
  const records = visible.records.filter(item => `${item.id} ${moduleById(item.module, data.modules).name}`.toLowerCase().includes(normalized)).slice(0, 4);
  const groups: { label: string; items: (Equipment | Task | MaintenanceRecord)[] }[] = [
    { label: 'Equipos y sectores', items: equipment },
    { label: 'Controles programados', items: tasks },
    { label: 'Controles realizados', items: records },
  ];
  return (
    <Modal title="Buscar en CER" subtitle="Encontrá equipos, tareas y registros en un mismo lugar." onClose={onClose}>
      <div className="modal-body">
        <div className="search-field search-large"><Icon name="Search" /><input name="global-search" autoComplete="off" placeholder="Escribí un equipo, módulo o registro…" aria-label="Búsqueda global" value={query} onChange={event => setQuery(event.target.value)} /></div>
        {!normalized ? (
          <p className="search-prompt">Escribí un nombre o código para encontrar un sector, un control programado o un registro.</p>
        ) : groups.map(group => (
          <section key={group.label} className="search-results">
            <h3>{group.label}</h3>
            {group.items.map(item => <button key={item.id} onClick={() => { if ('code' in item) actions.viewEquipment(item); else if ('title' in item) actions.viewTask(item); else actions.viewRecord(item); }}><ModuleIcon module={item.module} small /><span>{'name' in item ? item.name : 'title' in item ? item.title : `${moduleById(item.module, data.modules).name} · ${item.id}`}</span><Icon name="ArrowUpRight" size={15} /></button>)}
            {!group.items.length && <p className="muted small-text">Sin coincidencias</p>}
          </section>
        ))}
      </div>
    </Modal>
  );
}
