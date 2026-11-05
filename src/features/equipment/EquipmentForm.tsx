import { useState, type FormEvent } from 'react';
import { Field, Icon, Modal } from '../../components';
import { workspaceModules } from '../../data';
import { uid, allowed } from '../../domain';
import { usePersistentSave } from '../../hooks/usePersistentSave';
import { useApp } from '../../store';
import { ModuleForm } from '../modules/ModuleForm';
import { moduleById } from '../../data';
import { responsibleName } from '../modules/moduleResponsibility';
import type { Equipment, ModuleId } from '../../types';

export function EquipmentForm({ equipment, onClose }: { equipment?: Equipment; onClose: () => void }) {
  const { data, toast } = useApp();
  const catalog = workspaceModules(data);
  const [addingModule, setAddingModule] = useState(false);
  const [error, setError] = useState('');
  const { save, submitting, saveError, reportError } = usePersistentSave();
  const [draft, setDraft] = useState<Equipment>(equipment ?? { id: uid('equipment'), name: '', code: '', module: 'generator', location: '', model: '', serial: '', status: 'Operativo' });
  const set = <K extends keyof Equipment>(key: K, value: Equipment[K]) => setDraft(current => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const code = draft.code.trim().toUpperCase();
    if (data.equipment.some(item => item.id !== draft.id && item.code.trim().toLowerCase() === code.toLowerCase())) {
      setError('Ya existe un equipo con ese código.');
      return;
    }
    if (equipment && data.records.some(record => record.equipmentId === equipment.id) && draft.module !== equipment.module) {
      reportError('No se puede cambiar el módulo de un equipo que ya tiene controles asociados. Creá una ficha nueva para conservar la trazabilidad.');
      return;
    }
    setError('');
    if (draft.responsibleId && !data.users.some(member => member.id === draft.responsibleId && allowed(member, draft.module))) { setError('Elegí un responsable activo con acceso al módulo.'); return; }
    const normalized = { ...draft, code, name: draft.name.trim(), location: draft.location.trim(), model: draft.model.trim(), serial: draft.serial.trim() };
    if (!await save(workspace => ({ ...workspace, equipment: equipment ? workspace.equipment.map(item => item.id === equipment.id ? normalized : item) : [...workspace.equipment, normalized] }))) return;
    toast(equipment ? 'Equipo actualizado.' : 'Equipo incorporado al inventario.');
    onClose();
  }

  if (addingModule) return <ModuleForm onSaved={module => setDraft(current => ({ ...current, module: module.id, responsibleId: undefined }))} onClose={() => setAddingModule(false)} />;
  return <Modal title={equipment ? 'Editar equipo o sector' : 'Agregar equipo o sector'} subtitle="Nombre, ubicación y datos del equipo o sector." onClose={onClose}><form onSubmit={submit}><div className="modal-body"><Field label="Nombre" required><input required value={draft.name} onChange={event => set('name', event.target.value)} placeholder="Ej. Grupo electrógeno de respaldo" /></Field><div className="form-grid"><Field label="Código interno" required><input required maxLength={30} value={draft.code} onChange={event => set('code', event.target.value)} placeholder="GE-002" /></Field><Field label="Módulo"><select value={draft.module} onChange={event => setDraft(current => ({ ...current, module: event.target.value as ModuleId, responsibleId: undefined }))}>{catalog.map(module => <option value={module.id} key={module.id}>{module.name}</option>)}</select></Field><button type="button" className="text-button module-create-inline" onClick={() => setAddingModule(true)}><Icon name="Plus" size={15} />Agregar módulo</button><Field label="Responsable del equipo" hint={`Predeterminado del módulo: ${responsibleName(data, moduleById(draft.module, data.modules).responsibleId)}`}><select value={draft.responsibleId ?? ''} onChange={event => set('responsibleId', event.target.value || undefined)}><option value="">Usar responsable del módulo</option>{data.users.filter(member => allowed(member, draft.module)).map(member => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}</select></Field><Field label="Ubicación" required><input required value={draft.location} onChange={event => set('location', event.target.value)} placeholder="Sector / piso" /></Field><Field label="Estado"><select value={draft.status} onChange={event => set('status', event.target.value as Equipment['status'])}><option>Operativo</option><option>En mantenimiento</option><option>Fuera de servicio</option></select></Field><Field label="Modelo"><input value={draft.model} onChange={event => set('model', event.target.value)} /></Field><Field label="Número de serie"><input value={draft.serial} onChange={event => set('serial', event.target.value)} /></Field></div>{(error || saveError) && <p className="form-error" role="alert">{error || saveError}</p>}</div><footer className="modal-footer"><button type="button" className="button secondary" disabled={submitting} onClick={onClose}>Cancelar</button><button type="submit" className="button primary" disabled={submitting}><Icon name="Check" size={16} />{submitting ? 'Guardando…' : 'Guardar equipo'}</button></footer></form></Modal>;
}

