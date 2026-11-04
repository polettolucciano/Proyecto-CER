import { useState } from 'react';
import type { AppActions } from '../../app/actions';
import { Badge, Empty, Icon, ModuleIcon, PageHeader } from '../../components';
import { moduleById } from '../../data';
import { canManage, formatDate } from '../../domain';
import { SearchField } from '../../shared/ui/filters';
import { useVisibleWorkspace } from '../../shared/hooks/useVisibleWorkspace';
import { useApp } from '../../store';

export function EquipmentPage({ actions, home = false }: { actions: AppActions; home?: boolean }) {
  const data = useVisibleWorkspace();
  const { user } = useApp();
  const [query, setQuery] = useState('');
  const [module, setModule] = useState('all');
  const [status, setStatus] = useState('all');
  const filtered = data.equipment.filter(equipment =>
    (home || module === 'all' || equipment.module === module)
    && (home || status === 'all' || equipment.status === status)
    && `${equipment.name} ${equipment.code} ${equipment.location} ${moduleById(equipment.module).name}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return <>
    <PageHeader title={home ? '¿En qué sector vas a trabajar?' : 'Administrar equipos y sectores'} description={home ? 'Elegí el sector para realizar un control o consultar los anteriores.' : 'Consultá las fichas y mantené actualizado el inventario del centro.'}>
      {!home && canManage(user) && <button className="button primary" onClick={() => actions.editEquipment()}><Icon name="Plus" size={17} />Agregar equipo o sector</button>}
    </PageHeader>
    <div className={home ? 'sector-search' : 'filter-bar standalone'}><SearchField value={query} onChange={setQuery} placeholder="Buscar un equipo o sector…" />{!home && <><select aria-label="Filtrar por módulo" value={module} onChange={event => setModule(event.target.value)}><option value="all">Todos los módulos</option>{Array.from(new Set(data.equipment.map(item => item.module))).map(id => <option key={id} value={id}>{moduleById(id).name}</option>)}</select><select aria-label="Estado del equipo" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Todos los estados</option><option>Operativo</option><option>En mantenimiento</option><option>Fuera de servicio</option></select></>}</div>
    <div className="equipment-grid sector-grid">{filtered.map(equipment => {
      const last = data.records.filter(record => record.equipmentId === equipment.id && record.status === 'active').sort((a, b) => b.date.localeCompare(a.date))[0];
      return <article className="equipment-card sector-card" key={equipment.id} aria-label={equipment.name}>
        <div className="equipment-card-top"><ModuleIcon module={equipment.module} />{!home && <Badge>{equipment.status}</Badge>}</div>
        {!home && <span className="asset-code">{equipment.code}</span>}
        <h2>{equipment.name}</h2>
        <p className="location"><Icon name="Building2" size={14} />{equipment.location}</p>
        <p className="sector-last">Último control: {last ? formatDate(last.date) : 'Sin registros'}</p>
        <div className="sector-actions">
          <button className="button primary" onClick={() => actions.newRecord(equipment.module, undefined, equipment.id)}><Icon name="Plus" size={17} />Realizar nuevo control</button>
          <button className="button secondary" onClick={() => actions.navigate('records', equipment.module, equipment.id)}><Icon name="ClipboardCheck" size={17} />Ver historial del sector</button>
        </div>
        {!home && <button className="text-button sector-details" onClick={() => actions.viewEquipment(equipment)}>Ver ficha y planificación<Icon name="ArrowUpRight" size={15} /></button>}
      </article>;
    })}</div>
    {!filtered.length && <div className="panel"><Empty icon="Search" title={query ? 'No encontramos ese sector' : 'No hay equipos o sectores disponibles'} description={query ? 'Probá con otro nombre o ubicación.' : 'Los sectores aparecerán aquí cuando estén cargados y tengas acceso a sus módulos.'} /></div>}
  </>;
}
