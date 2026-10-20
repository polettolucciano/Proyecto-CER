import { useState } from 'react';
import type { AppActions } from '../../app/actions';
import { Avatar, Badge, Empty, Icon, PageHeader } from '../../components';
import { canManage } from '../../domain';
import { SearchField } from '../../shared/ui/filters';
import { useApp } from '../../store';

const roleDescriptions = [
  ['Administrador', 'Control de perfiles, activos y configuración.', 'ShieldCheck'],
  ['Supervisor', 'Consulta, planificación y registro de controles.', 'Users'],
  ['Enfermería', 'Realización y consulta de mantenimientos en sus módulos asignados.', 'Wrench'],
] as const;

export function UsersPage({ actions }: { actions: AppActions }) {
  const { data, user } = useApp();
  const [query, setQuery] = useState('');
  const users = data.users.filter(member => `${member.name} ${member.email}`.toLowerCase().includes(query.toLowerCase()));

  if (!canManage(user)) return <Empty icon="ShieldCheck" title="Acceso de administración" description="La gestión de integrantes está disponible para el perfil administrador." />;

  return <><PageHeader eyebrow="EQUIPO CER" title="Personas y permisos" description="Las herramientas adecuadas, para cada integrante del equipo."><button className="button primary" onClick={() => actions.editUser()}><Icon name="Plus" size={17} />Agregar integrante</button></PageHeader><div className="role-cards">{roleDescriptions.map(([role, description, icon]) => <div className="role-card" key={role}><Icon name={icon} /><h3>{role}</h3><p>{description}</p><span>{data.users.filter(member => member.role === role && member.active).length} perfiles activos</span></div>)}</div><section className="panel"><div className="filter-bar"><SearchField value={query} onChange={setQuery} placeholder="Buscar integrante o correo…" /><span className="muted">{users.length} integrantes</span></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Integrante</th><th>Rol</th><th>Acceso a módulos</th><th>Estado</th><th /></tr></thead><tbody>{users.map(member => <tr key={member.id}><td><span className="user-cell"><Avatar initials={member.initials} /><span><strong>{member.name}{member.id === user.id && <small className="you-label">Vos</small>}</strong><small>{member.email}</small></span></span></td><td><span className="role-pill">{member.role}</span></td><td><span className="muted">{member.role === 'Administrador' ? 'Todos los módulos' : `${member.modules.length} módulos asignados`}</span></td><td><Badge>{member.active ? 'Activo' : 'Inactivo'}</Badge></td><td><button className="icon-button" aria-label={`Editar ${member.name}`} onClick={() => actions.editUser(member)}><Icon name="Pencil" size={16} /></button></td></tr>)}</tbody></table></div><div className="panel-bottom"><Icon name="Monitor" size={15} /><span>Perfiles de demostración. Podés probarlos desde el menú de tu perfil.</span></div></section></>;
}

