import { useState, type FormEvent } from 'react';
import { Field, Icon, Modal } from '../../components';
import { modules } from '../../data';
import { initials, uid } from '../../domain';
import { usePersistentSave } from '../../hooks/usePersistentSave';
import { useApp } from '../../store';
import type { TeamUser } from '../../types';
import {supabase} from '../../infrastructure/supabase/client';

export function UserForm({ member, onClose }: { member?: TeamUser; onClose: () => void }) {
  const { data, user, toast,remote,refresh } = useApp();
  const [inviting,setInviting]=useState(false);
  const [error, setError] = useState('');
  const { save, submitting, saveError } = usePersistentSave();
  const [draft, setDraft] = useState<TeamUser>(member ?? { id: uid('user'), name: '', email: '', role: 'Enfermería', modules: [], initials: '', active: true });
  const own = member?.id === user.id;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = draft.name.trim();
    const email = draft.email.trim().toLowerCase();
    if (!draft.modules.length && draft.role !== 'Administrador') { setError('Asigná al menos un módulo.'); return; }
    if (data.users.some(item => item.id !== draft.id && item.email.trim().toLowerCase() === email)) { setError('Este correo ya está registrado.'); return; }
    setError('');
    if(remote && !member){
      if(inviting)return;
      setInviting(true);
      try {
        const {error:inviteError}=await supabase!.functions.invoke('cer-invite',{body:{name,email,role:draft.role,modules:draft.modules}});
        if(inviteError){
          let detail='No se pudo completar la invitación. Revisá el correo y la configuración de invitaciones del centro.';
          if(inviteError.context instanceof Response){const body=await inviteError.context.json().catch(()=>null);if(typeof body?.message==='string')detail=body.message;}
          setError(detail);return;
        }
        await refresh();toast('Invitación enviada y perfil creado.');onClose();return;
      } catch { setError('No se pudo contactar al servicio de invitaciones. Conservá los datos y verificá tu conexión.');return; }
      finally {setInviting(false);}
    }
    const next = { ...draft, name, email, initials: initials(name), modules: draft.role === 'Administrador' ? modules.map(module => module.id) : draft.modules };
    if (!await save(workspace => ({ ...workspace, users: member ? workspace.users.map(item => item.id === member.id ? next : item) : [...workspace.users, next] }))) return;
    toast(remote?'Perfil actualizado.':'Perfil guardado en la vista previa.');
    onClose();
  }

  return <Modal title={member ? 'Editar perfil' : 'Agregar integrante'} subtitle="Configurá el rol y los módulos a los que tendrá acceso." onClose={onClose}><form onSubmit={submit}><div className="modal-body"><Field label="Nombre y apellido" required><input required value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></Field><Field label="Correo electrónico" required hint={remote && member ? 'El correo de acceso se administra desde Supabase Auth.' : undefined}><input type="email" required disabled={remote && Boolean(member)} value={draft.email} onChange={event => setDraft(current => ({ ...current, email: event.target.value }))} placeholder="nombre@centro.com" /></Field><Field label="Rol" hint={own ? 'Tu propio rol no puede modificarse desde esta sesión.' : undefined}><select disabled={own} value={draft.role} onChange={event => setDraft(current => ({ ...current, role: event.target.value as TeamUser['role'] }))}><option>Administrador</option>{!remote && <option>Supervisor</option>}<option>Enfermería</option></select></Field><div className="form-subtitle">Módulos habilitados</div><div className="permissions-grid">{modules.map(module => <label key={module.id} className="checkbox-line"><input type="checkbox" checked={draft.role === 'Administrador' || draft.modules.includes(module.id)} disabled={draft.role === 'Administrador'} onChange={event => setDraft(current => ({ ...current, modules: event.target.checked ? [...current.modules, module.id] : current.modules.filter(item => item !== module.id) }))} />{module.name}</label>)}</div>{member && !own && <label className="checkbox-line mt"><input type="checkbox" checked={draft.active} onChange={event => setDraft(current => ({ ...current, active: event.target.checked }))} />Perfil activo</label>}<div className="inline-notice"><Icon name="Monitor" /><span>{remote ? 'Los permisos se verifican en el servidor. Cada integrante usa su propia cuenta.' : 'Los perfiles permiten probar la interfaz. Las invitaciones se conectarán con el backend.'}</span></div>{(error || saveError) && <p className="form-error" role="alert">{error || saveError}</p>}</div><footer className="modal-footer"><button type="button" className="button secondary" disabled={submitting || inviting} onClick={onClose}>Cancelar</button><button type="submit" className="button primary" disabled={submitting || inviting}>{submitting || inviting ? 'Guardando…' : remote && !member ? 'Invitar integrante' : 'Guardar perfil'}<Icon name="Check" size={16} /></button></footer></form></Modal>;
}

