import { useState } from 'react';
import type { AppActions } from '../../app/actions';
import { Badge, Empty, Icon, ModuleIcon, PageHeader } from '../../components';
import { moduleById } from '../../data';
import { canManage, formatDate, today } from '../../domain';
import { SearchField } from '../../shared/ui/filters';
import { useVisibleWorkspace } from '../../shared/hooks/useVisibleWorkspace';
import { useApp } from '../../store';

export function EquipmentPage({ actions }: { actions: AppActions }) {
  const data = useVisibleWorkspace();
  const { user } = useApp();
  const [query, setQuery] = useState('');
  const [module, setModule] = useState('all');
  const [status, setStatus] = useState('all');
  const filtered = data.equipment.filter(equipment =>
    (module === 'all' || equipment.module === module)
    && (status === 'all' || equipment.status === status)
    && `${equipment.name} ${equipment.code} ${equipment.location}`.toLowerCase().includes(query.toLowerCase()),
  );

  return <><PageHeader eyebrow="INVENTARIO" title="Equipos y sectores" description="Cada activo tiene su lugar. Y su historia, también.">{canManage(user) && <button className="button primary" onClick={() => actions.editEquipment()}><Icon name="Plus" size={17} />Agregar equipo</button>}</PageHeader><div className="filter-bar standalone"><SearchField value={query} onChange={setQuery} placeholder="Buscar equipo, código o ubicación…" /><select aria-label="Filtrar por módulo" value={module} onChange={event => setModule(event.target.value)}><option value="all">Todos los módulos</option>{Array.from(new Set(data.equipment.map(item => item.module))).map(moduleId => <option key={moduleId} value={moduleId}>{moduleById(moduleId).name}</option>)}</select><select aria-label="Estado del equipo" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Todos los estados</option><option>Operativo</option><option>En mantenimiento</option><option>Fuera de servicio</option></select></div><div className="list-caption">{filtered.length} equipos y sectores<span>Inventario del centro</span></div><div className="equipment-grid">{filtered.map(equipment => { const records = data.records.filter(record => record.equipmentId === equipment.id).sort((left, right) => right.date.localeCompare(left.date)); const next = data.tasks.filter(task => task.active && task.equipmentId === equipment.id).sort((left, right) => left.due.localeCompare(right.due))[0]; return <button className="equipment-card" onClick={() => actions.viewEquipment(equipment)} key={equipment.id}><div className="equipment-card-top"><ModuleIcon module={equipment.module} /><Badge>{equipment.status}</Badge></div><span className="asset-code">{equipment.code}</span><h3>{equipment.name}</h3><p className="location"><Icon name="Building2" size={14} />{equipment.location}</p><div className="equipment-meta"><div><span>Último control</span><strong>{records[0] ? formatDate(records[0].date) : 'Sin registros'}</strong></div><div><span>Próximo control</span><strong className={next && next.due < today() ? 'text-amber' : ''}>{next ? formatDate(next.due) : 'Sin programar'}</strong></div></div><div className="equipment-bottom"><span>{moduleById(equipment.module).name}</span><span>Ver ficha<Icon name="ArrowUpRight" size={15} /></span></div></button>; })}</div>{!filtered.length && <div className="panel"><Empty icon="Search" title="No hay equipos para esta búsqueda" description="Cambiá los filtros o agregá un equipo al inventario." /></div>}</>;
}

