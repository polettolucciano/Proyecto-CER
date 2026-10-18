import { useMemo, useState } from 'react';
import { Icon } from '../../components';
import { useApp } from '../../store';

const allCategories = 'Todos';

export function PublicTrainingPage() {
  const { data } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(allCategories);
  const published = data.training.filter(material => material.published);
  const categories = useMemo(() => [allCategories, ...Array.from(new Set(published.map(material => material.category)))], [published]);
  const materials = published.filter(material => (category === allCategories || material.category === category) && `${material.title} ${material.description} ${material.category}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <div className="public-training-shell">
    <header className="public-training-header">
      <a className="public-training-brand" href="#public-training" aria-label="Biblioteca pública CER, inicio"><img src="/cer-logo.png" width={58} height={49} alt="" /><span><strong>Centro de Enfermedades Renales</strong><small>Biblioteca de capacitaciones</small></span></a>
      <a className="button secondary" href="#training"><Icon name="LogOut" size={16} />Ingresar a gestión</a>
    </header>

    <main className="public-training-main">
      <section className="public-training-hero">
        <div>
          <span className="public-kicker"><Icon name="GraduationCap" size={15} />Acceso público</span>
          <h1>Capacitaciones del Centro de Enfermedades Renales</h1>
          <p>Materiales, videos y presentaciones reunidos por CER para acompañar el aprendizaje y la consulta.</p>
          <div className="public-training-meta"><span><strong>{published.length}</strong> recursos publicados</span><span><strong>{categories.length - 1}</strong> categorías</span></div>
        </div>
        <div className="public-training-visual" aria-hidden="true"><span><Icon name="BookOpen" size={48} /></span><i /><i /><i /></div>
      </section>

      <section className="public-training-library" aria-labelledby="public-library-title">
        <div className="public-training-heading"><div><span>Biblioteca CER</span><h2 id="public-library-title">Explorá los recursos disponibles</h2></div><label className="public-training-search"><Icon name="Search" size={17} /><input aria-label="Buscar capacitaciones" placeholder="Buscar por tema o título" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery('')}><Icon name="X" size={15} /></button>}</label></div>
        {categories.length > 1 && <div className="public-training-filters" aria-label="Filtrar por categoría">{categories.map(item => <button type="button" aria-pressed={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>}

        {materials.length > 0 ? <div className="public-training-grid">{materials.map(material => <article className="public-resource-card" key={material.id}>
          <div className={`public-resource-cover ${material.type === 'Video' ? 'video' : material.type === 'Documento' ? 'document' : 'presentation'}`}><Icon name={material.type === 'Video' ? 'Play' : material.type === 'Documento' ? 'FileText' : 'Monitor'} size={32} /><span>{material.type}</span></div>
          <div className="public-resource-body"><small>{material.category}</small><h3>{material.title}</h3><p>{material.description || 'Recurso publicado por el Centro de Enfermedades Renales.'}</p><a href={material.url} target="_blank" rel="noreferrer">Abrir recurso<Icon name="ArrowUpRight" size={15} /></a></div>
        </article>)}</div> : <div className="public-training-empty"><span><Icon name={published.length ? 'Search' : 'BookOpen'} size={29} /></span><h3>{published.length ? 'No encontramos recursos con esos filtros' : 'La biblioteca pública está preparada'}</h3><p>{published.length ? 'Probá otra búsqueda o elegí una categoría diferente.' : 'Los materiales aparecerán aquí cuando CER los publique desde el panel de gestión.'}</p>{(query || category !== allCategories) && <button className="button secondary" type="button" onClick={() => { setQuery(''); setCategory(allCategories); }}>Limpiar filtros</button>}</div>}
      </section>

      <p className="public-preview-note"><Icon name="Monitor" size={15} /><span><strong>Vista previa local.</strong> En esta etapa los recursos publicados se leen solamente desde este navegador. El acceso público real entre dispositivos se habilitará con el backend.</span></p>
    </main>

    <footer className="public-training-footer"><span>Centro de Enfermedades Renales</span><span>Capacitaciones y recursos públicos</span></footer>
  </div>;
}
