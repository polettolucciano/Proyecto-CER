import { useState } from 'react';
import { Avatar, Badge, Empty, Icon, Modal, ModuleIcon } from '../../components';
import { moduleById } from '../../data';
import { canManage, formatDate, taskStatus, visibleData } from '../../domain';
import type { AppActions } from '../../app/actions';
import { useApp } from '../../store';
import type { Equipment, MaintenanceRecord, Task } from '../../types';

export function TaskDetail({ task, actions, onClose }: { task: Task; actions: AppActions; onClose: () => void }) {
  const { data, user } = useApp();
  const equipment = data.equipment.find(item => item.id === task.equipmentId);
  return (
    <Modal title="Control programado" subtitle={moduleById(task.module).name} onClose={onClose}>
      <div className="modal-body">
        <div className="detail-summary"><ModuleIcon module={task.module} /><Badge>{taskStatus(task, data.settings.advanceDays)}</Badge></div>
        <h2 className="task-detail-title">{task.title}</h2>
        <div className="detail-metadata two">
          <div><span>Fecha programada</span><strong>{formatDate(task.due)}</strong></div>
          <div><span>Periodicidad</span><strong>{task.frequency}</strong></div>
          <div><span>Equipo o sector</span><strong>{equipment?.name ?? 'Sin equipo'}</strong></div>
          <div><span>Ubicación</span><strong>{equipment?.location ?? '—'}</strong></div>
        </div>
        <div className="responsible-note"><Avatar initials="EN" /><div><small>Equipo responsable</small><strong>Enfermería · cualquier integrante</strong></div></div>
        {task.notes && <section className="detail-section"><h3>Indicaciones</h3><p className="preserve-lines">{task.notes}</p></section>}
        <div className="inline-notice soft"><Icon name="RefreshCw" /><span>Al registrar este control, la próxima fecha se actualizará según la periodicidad configurada.</span></div>
      </div>
      <footer className="modal-footer">
        {user.role !== 'Enfermería' ? <button className="button secondary" onClick={() => actions.editTask(task)}><Icon name="Pencil" size={16} />Editar programación</button> : <button className="button secondary" onClick={onClose}>Cerrar</button>}
        <button className="button primary" onClick={() => actions.newRecord(task.module, task)}><Icon name="ClipboardCheck" size={16} />Realizar control</button>
      </footer>
    </Modal>
  );
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
        <div className="detail-metadata two"><div><span>Código</span><strong>{equipment.code}</strong></div><div><span>Módulo</span><strong>{moduleById(equipment.module).name}</strong></div></div>
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
  const records = visible.records.filter(item => `${item.id} ${moduleById(item.module).name}`.toLowerCase().includes(normalized)).slice(0, 4);
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
            {group.items.map(item => <button key={item.id} onClick={() => { if ('code' in item) actions.viewEquipment(item); else if ('title' in item) actions.viewTask(item); else actions.viewRecord(item); }}><ModuleIcon module={item.module} small /><span>{'name' in item ? item.name : 'title' in item ? item.title : `${moduleById(item.module).name} · ${item.id}`}</span><Icon name="ArrowUpRight" size={15} /></button>)}
            {!group.items.length && <p className="muted small-text">Sin coincidencias</p>}
          </section>
        ))}
      </div>
    </Modal>
  );
}
