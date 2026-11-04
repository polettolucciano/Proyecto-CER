import { useState } from 'react';
import type { AppActions } from '../../app/actions';
import { Empty, Icon, ModuleIcon, PageHeader } from '../../components';
import { moduleById } from '../../data';
import { canManage } from '../../domain';
import { SearchField } from '../../shared/ui/filters';
import { useVisibleWorkspace } from '../../shared/hooks/useVisibleWorkspace';
import { useApp } from '../../store';

/** El inicio es también el único catálogo y punto de administración de sectores. */
export function EquipmentPage({ actions }: { actions: AppActions }) {
  const data = useVisibleWorkspace();
  const { user } = useApp();
  const [query, setQuery] = useState('');
  const [module, setModule] = useState('all');
  const [status, setStatus] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtered = data.equipment.filter(equipment =>
    (module === 'all' || equipment.module === module)
    && (status === 'all' || equipment.status === status)
    && `${equipment.name} ${equipment.code} ${equipment.location} ${moduleById(equipment.module).name}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const filtering = module !== 'all' || status !== 'all';
  return <>
    <PageHeader title="Equipos y sectores" description="Elegí dónde realizar un control o consultar el historial.">
      {canManage(user) && <button className="button secondary" onClick={() => actions.editEquipment()}><Icon name="Plus" size={17} />Agregar sector o equipo</button>}
    </PageHeader>
    <div className="sector-toolbar"><SearchField value={query} onChange={setQuery} placeholder="Buscar un equipo o sector…" /><button className="text-button" aria-expanded={filtersOpen} aria-controls="sector-filters" onClick={() => setFiltersOpen(value => !value)}><Icon name="SlidersHorizontal" size={16} />Filtrar{filtering ? ' (activos)' : ''}</button></div>
    <div id="sector-filters" className="sector-filters" hidden={!filtersOpen}>
      <label>Módulo<select value={module} onChange={event => setModule(event.target.value)}><option value="all">Todos los módulos</option>{Array.from(new Set(data.equipment.map(item => item.module))).map(id => <option key={id} value={id}>{moduleById(id).name}</option>)}</select></label>
      <label>Estado<select value={status} onChange={event => setStatus(event.target.value)}><option value="all">Todos los estados</option><option>Operativo</option><option>En mantenimiento</option><option>Fuera de servicio</option></select></label>
      {filtering && <button className="text-button" onClick={() => { setModule('all'); setStatus('all'); }}>Limpiar filtros</button>}
    </div>
    <div className="equipment-grid sector-grid">{filtered.map(equipment => <article className="equipment-card sector-card" key={equipment.id} aria-label={equipment.name}>
      <div className="sector-card-heading"><ModuleIcon module={equipment.module} />{canManage(user) && <button className="icon-button" aria-label={`Ver ficha de ${equipment.name}`} onClick={() => actions.viewEquipment(equipment)}><Icon name="Settings2" size={18} /></button>}</div>
      <h2>{equipment.name}</h2>
      <p className="location"><Icon name="Building2" size={14} />{equipment.location}</p>
      {equipment.status !== 'Operativo' && <p className="sector-status"><Icon name="TriangleAlert" size={14} />{equipment.status}</p>}
      <div className="sector-actions">
        <button className="button primary" onClick={() => actions.newRecord(equipment.module, undefined, equipment.id)}><Icon name="Plus" size={17} />Nuevo control</button>
        <button className="button secondary" onClick={() => actions.navigate('records', undefined, equipment.id)}><Icon name="ClipboardCheck" size={17} />Ver historial</button>
      </div>
    </article>)}</div>
    {!filtered.length && <div className="panel"><Empty icon="Search" title={query || filtering ? 'No encontramos ese sector' : 'No hay sectores disponibles'} description={query || filtering ? 'Probá con otro nombre o cambiá los filtros.' : 'Los sectores aparecerán aquí cuando estén cargados y tengas acceso.'} /></div>}
  </>;
}
