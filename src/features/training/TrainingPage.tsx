import { useState } from 'react';
import { Badge, Empty, Icon, PageHeader } from '../../components';
import { canManage } from '../../domain';
import { useApp } from '../../store';
import type { Training } from '../../types';

export function TrainingPage({ onEdit }: { onEdit: (material?: Training) => void }) {
  const { data, user,remote } = useApp();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('Todos');
  const admin = canManage(user);
  const materials = data.training.filter(material => (admin || material.published) && (type === 'Todos' || material.type === type) && `${material.title} ${material.description} ${material.category}`.toLowerCase().includes(query.toLowerCase()));

  return <>
    <PageHeader eyebrow="CONOCIMIENTO COMPARTIDO" title="Aprender también es cuidar." description="Un espacio para reunir el conocimiento y hacerlo crecer.">
      <a className="button secondary" href="#public-training"><Icon name="ExternalLink" size={16} />Ver biblioteca pública</a>
      {admin && <button className="button primary" onClick={() => onEdit()}><Icon name="Plus" size={17} />Agregar material</button>}
    </PageHeader>
    <div className="training-banner"><div><span className="eyebrow">BIBLIOTECA CER</span><h2>El conocimiento, más cerca.</h2><p>Videos, guías y presentaciones para acompañar<br className="desktop-only" /> el trabajo de cada día.</p><span className="training-banner-meta"><Icon name="BookOpen" size={15} />{data.training.filter(material => material.published).length} recursos publicados</span></div><div className="training-art" aria-hidden="true"><div className="art-orbit" /><div className="art-orbit second" /><span className="art-book"><Icon name="BookOpen" size={65} /></span><span className="art-play"><Icon name="Play" size={22} /></span><span className="art-check"><Icon name="Check" size={21} /></span><i /></div></div>
    <div className="training-toolbar"><div className="pill-tabs">{['Todos', 'Video', 'Documento', 'Presentación'].map(item => <button className={type === item ? 'active' : ''} onClick={() => setType(item)} key={item}>{item === 'Video' ? 'Videos' : item === 'Documento' ? 'Documentos' : item === 'Presentación' ? 'Presentaciones' : item}</button>)}</div><div className="search-field"><Icon name="Search" size={17} /><input aria-label="Buscar material" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar material…" />{query && <button aria-label="Limpiar búsqueda" className="icon-button tiny" onClick={() => setQuery('')}><Icon name="X" size={14} /></button>}</div></div>
    {materials.length ? <div className="training-grid">{materials.map(material => <article className="training-card" key={material.id}><div className={`training-cover ${material.type === 'Video' ? 'blue' : material.type === 'Documento' ? 'teal' : 'purple'}`}><Icon name={material.type === 'Video' ? 'Play' : material.type === 'Documento' ? 'FileText' : 'Monitor'} size={40} /><span>{material.type}</span></div><div className="training-card-body"><div className="training-labels"><small>{material.category}</small><Badge>{material.published ? 'Publicado' : 'Borrador'}</Badge></div><h3>{material.title}</h3><p>{material.description || 'Material de capacitación del centro.'}</p><div className="training-card-footer"><a className="text-button" href={material.url} target="_blank" rel="noreferrer">Abrir material<Icon name="ExternalLink" size={14} /></a>{admin && <button className="icon-button" aria-label={`Editar ${material.title}`} onClick={() => onEdit(material)}><Icon name="Pencil" size={16} /></button>}</div></div></article>)}</div> : <div className="panel"><Empty icon="GraduationCap" title={query || type !== 'Todos' ? 'No encontramos ese material' : 'La biblioteca está lista para empezar'} description={query || type !== 'Todos' ? 'Probá otra búsqueda o categoría.' : 'Agregá el primer video, documento o presentación del centro. Los contenidos publicados aparecerán en el espacio público.'} action={admin && <button className="button primary" onClick={() => onEdit()}><Icon name="Plus" size={16} />Agregar primer material</button>} /></div>}
    <p className="page-footnote"><Icon name="CircleHelp" size={14} />{remote?'Los materiales publicados pueden consultarse en la biblioteca pública.':'La publicación entre dispositivos se habilitará al conectar el backend.'}</p>
  </>;
}
