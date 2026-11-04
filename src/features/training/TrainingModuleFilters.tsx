import type { Training } from '../../types';

export function TrainingModuleFilters({ materials, module, submodule, onChange }: {
  materials: Training[];
  module: string;
  submodule: string;
  onChange: (module: string, submodule: string) => void;
}) {
  const modules = Array.from(new Set(materials.map(item => item.category))).sort();
  const submodules = Array.from(new Set(materials.filter(item => !module || item.category === module).flatMap(item => item.submodule ? [item.submodule] : []))).sort();
  return <div className="training-module-filters">
    <label>Módulo principal<select value={module} onChange={event => onChange(event.target.value, '')}><option value="">Todos los módulos</option>{modules.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
    <label>Submódulo<select value={submodule} disabled={!module || !submodules.length} onChange={event => onChange(module, event.target.value)}><option value="">Todos los submódulos</option>{submodules.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
  </div>;
}
