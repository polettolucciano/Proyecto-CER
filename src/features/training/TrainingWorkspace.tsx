import { useState } from 'react';
import { Empty, Icon } from '../../components';
import { canManage } from '../../domain';
import { useApp } from '../../store';
import type { Training } from '../../types';
import { TrainingForm } from './TrainingForm';
import { TrainingPage } from './TrainingPage';
export function TrainingWorkspace() {
  const { user, remote, signOut } = useApp();
  const [editing, setEditing] = useState<Training | 'new' | null>(null);
  return <div className="training-management-shell"><header><a href="/capacitaciones" className="text-button"><Icon name="ArrowLeft" size={17} />Biblioteca de capacitaciones</a>{remote && <button className="text-button" onClick={() => void signOut()}>Cerrar sesión</button>}</header>
    {!remote && <p className="training-demo-note" role="status">Demostración · Los materiales se guardan solamente en este navegador.</p>}
    <main>{canManage(user) ? <TrainingPage onEdit={material => setEditing(material ?? 'new')} /> : <Empty icon="ShieldCheck" title="Acceso de administración" description="Solo Administración puede cargar o editar materiales. Consultá la biblioteca pública para ver las capacitaciones." />}</main>
    {editing && canManage(user) && <TrainingForm material={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
  </div>;
}
