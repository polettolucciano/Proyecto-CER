import { TrainingModuleFilters } from './TrainingModuleFilters';
import { useState } from 'react';
import { Badge, Empty, Icon, PageHeader } from '../../components';
import { canManage } from '../../domain';
import { useApp } from '../../store';
import type { Training } from '../../types';

export function TrainingPage({ onEdit }: { onEdit: (material?: Training) => void }) {
  const { data, user } = useApp();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('Todos');
  const [module, setModule] = useState('');
  const [submodule, setSubmodule] = useState('');
  const admin = canManage(user);
  const available = data.training.filter(material => admin || material.published);
  const materials = available.filter(material => (!module || material.category === module) && (!submodule || material.submodule === submodule) && (type === 'Todos' || material.type === type) && `${material.title} ${material.description} ${material.category} ${material.submodule ?? ''}`.toLowerCase().includes(query.toLowerCase()));

  return <>
    <PageHeader title="Capacitaciones" description="Buscá un módulo y elegí el tema que querés consultar.">
      <a className="button secondary" href="/capacitaciones"><Icon name="ExternalLink" size={16} />Ver biblioteca pública</a>
      {admin && <button className="button primary" onClick={() => onEdit()}><Icon name="Plus" size={17} />Agregar material</button>}
    </PageHeader>
    <TrainingModuleFilters materials={available} module={module} submodule={submodule} onChange={(nextModule, nextSubmodule) => { setModule(nextModule); setSubmodule(nextSubmodule); }} />
    <div className="training-toolbar"><div className="pill-tabs">{['Todos', 'Video', 'Documento', 'Presentación'].map(item => <button className={type === item ? 'active' : ''} onClick={() => setType(item)} key={item}>{item === 'Video' ? 'Videos' : item === 'Documento' ? 'Documentos' : item === 'Presentación' ? 'Presentaciones' : item}</button>)}</div><div className="search-field"><Icon name="Search" size={17} /><input aria-label="Buscar material" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar material…" />{query && <button aria-label="Limpiar búsqueda" className="icon-button tiny" onClick={() => setQuery('')}><Icon name="X" size={14} /></button>}</div></div>
    {materials.length ? <div className="training-grid">{materials.map(material => <article className="training-card" key={material.id}><div className={`training-cover ${material.type === 'Video' ? 'blue' : material.type === 'Documento' ? 'teal' : 'purple'}`}><Icon name={material.type === 'Video' ? 'Play' : material.type === 'Documento' ? 'FileText' : 'Monitor'} size={40} /><span>{material.type}</span></div><div className="training-card-body"><div className="training-labels"><small>{material.category}{material.submodule ? ` / ${material.submodule}` : ''}</small><Badge>{material.published ? 'Publicado' : 'Borrador'}</Badge></div><h3>{material.title}</h3><p>{material.description || 'Material de capacitación del centro.'}</p><div className="training-card-footer"><a className="text-button" href={material.url} target="_blank" rel="noreferrer">Abrir material<Icon name="ExternalLink" size={14} /></a>{admin && <button className="icon-button" aria-label={`Editar ${material.title}`} onClick={() => onEdit(material)}><Icon name="Pencil" size={16} /></button>}</div></div></article>)}</div> : <div className="panel"><Empty icon="GraduationCap" title={query || module || submodule || type !== 'Todos' ? 'No encontramos ese material' : 'La biblioteca está lista para empezar'} description={query || module || submodule || type !== 'Todos' ? 'Probá otra búsqueda o categoría.' : 'Agregá el primer video, documento o presentación del centro. Los contenidos publicados aparecerán en el espacio público.'} action={admin && <button className="button primary" onClick={() => onEdit()}><Icon name="Plus" size={16} />{available.length ? 'Agregar material' : 'Agregar primer material'}</button>} /></div>}

  </>;
}
