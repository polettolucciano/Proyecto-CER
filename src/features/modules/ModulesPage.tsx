import { useState } from 'react';
import { Icon, ModuleIcon } from '../../components';
import { workspaceModules } from '../../data';
import { canManage } from '../../domain';
import { useApp } from '../../store';
import type { Module } from '../../types';
import { ModuleForm } from './ModuleForm';
import { responsibleName } from './moduleResponsibility';
export function ModulesPage() {
  const { data, user } = useApp();
  const [editing, setEditing] = useState<Module | 'new' | null>(null);
  if (!canManage(user)) return null;
  return <><div className="team-actions"><p>Módulos disponibles y sus responsables predeterminados.</p><button className="button primary" onClick={() => setEditing('new')}><Icon name="Plus" size={17} />Agregar módulo</button></div><section className="panel">{workspaceModules(data).map(module => <div className="module-admin-row" key={module.id}><ModuleIcon module={module.id} small /><div><strong>{module.name}</strong><small>{responsibleName(data, module.responsibleId)}</small></div><button className="button secondary small" aria-label={`Editar módulo ${module.name}`} onClick={() => setEditing(module)}>Editar</button></div>)}</section>{editing && <ModuleForm module={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}</>;
}
