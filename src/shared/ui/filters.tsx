import { Icon } from '../../components';
import { modules } from '../../data';
import { allowed } from '../../domain';
import { useApp } from '../../store';

export function ModuleSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { user } = useApp();
  return <select aria-label="Filtrar por módulo" value={value} onChange={event => onChange(event.target.value)}><option value="all">Todos los módulos</option>{modules.filter(module => allowed(user, module.id)).map(module => <option key={module.id} value={module.id}>{module.name}</option>)}</select>;
}

export function SearchField({ value, onChange, placeholder = 'Buscar…' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div className="search-field"><Icon name="Search" size={17} /><input aria-label={placeholder} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />{value && <button type="button" aria-label="Limpiar búsqueda" className="icon-button tiny" onClick={() => onChange('')}><Icon name="X" size={14} /></button>}</div>;
}

