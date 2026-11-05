import { useState, type FormEvent } from 'react';
import { Field, Icon, Modal } from '../../components';
import { createGeneralModule, frequencies, workspaceModules } from '../../data';
import { allowed, canManage, uid } from '../../domain';
import { usePersistentSave } from '../../hooks/usePersistentSave';
import { useApp } from '../../store';
import type { Module } from '../../types';
import { auditEvent } from '../../workspace';

export function ModuleForm({ module, onClose, onSaved }: { module?: Module; onClose: () => void; onSaved?: (module: Module) => void }) {
  const { data, user, toast } = useApp();
  const { save, submitting, saveError } = usePersistentSave();
  const [draft, setDraft] = useState<Module>(module ?? createGeneralModule(uid('custom') as Module['id'], ''));
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!canManage(user)) return;
    const normalized = { ...draft, name: draft.name.trim(), short: draft.name.trim(), description: draft.description.trim(), responsibleId: draft.responsibleId || undefined };
    if (normalized.name.length < 2) { setError('Ingresá un nombre de al menos dos caracteres.'); return; }
    if (workspaceModules(data).some(item => item.id !== draft.id && item.name.trim().toLocaleLowerCase() === normalized.name.toLocaleLowerCase())) { setError('Ya existe un módulo con ese nombre.'); return; }
    if (normalized.responsibleId && !data.users.some(member => member.id === normalized.responsibleId && allowed(member, draft.id))) { setError('El responsable debe tener acceso a este módulo. Primero guardá el módulo y habilitá su acceso en Personas y permisos.'); return; }
    if (!await save(workspace => ({ ...workspace, modules: [...(workspace.modules ?? []).filter(item => item.id !== normalized.id), normalized], auditEvents: [{ ...auditEvent(user.id, 'module.saved', normalized.id, `Guardó el módulo ${normalized.name}`), entityType: 'module' }, ...workspace.auditEvents] }))) return;
    toast('Módulo guardado.'); onSaved?.(normalized); onClose();
  }
  return <Modal title={module ? 'Editar módulo' : 'Agregar módulo'} subtitle="Los módulos agrupan los equipos y sus controles." onClose={onClose}><form onSubmit={submit}><div className="modal-body">
    <Field label="Nombre del módulo" required><input required minLength={2} maxLength={100} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="Ej. Climatización" /></Field>
    <Field label="Descripción"><textarea maxLength={500} rows={2} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} /></Field>
    <Field label="Periodicidad habitual"><select value={draft.frequency} onChange={event => setDraft(current => ({ ...current, frequency: event.target.value as Module['frequency'] }))}>{frequencies.map(item => <option key={item}>{item}</option>)}</select></Field>
    <Field label="Responsable del módulo" hint="Se propone al programar controles, salvo que el equipo tenga otro responsable."><select value={draft.responsibleId ?? ''} onChange={event => setDraft(current => ({ ...current, responsibleId: event.target.value }))}><option value="">Sin responsable predeterminado</option>{data.users.filter(member => allowed(member, draft.id)).map(member => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}</select></Field>
    {!module && <p className="inline-notice">El módulo nuevo utiliza el registro general: trabajo realizado, técnico interviniente, observaciones y fotos. Los formularios especializados existentes se conservan.</p>}
    {(error || saveError) && <p className="form-error" role="alert">{error || saveError}</p>}
  </div><footer className="modal-footer"><button type="button" className="button secondary" disabled={submitting} onClick={onClose}>Cancelar</button><button className="button primary" disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar módulo'}<Icon name="Check" size={16} /></button></footer></form></Modal>;
}
