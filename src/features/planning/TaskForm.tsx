import { useState, type FormEvent } from 'react';
import { Field, Icon, Modal } from '../../components';
import { frequencies, modules } from '../../data';
import { allowed, today, uid } from '../../domain';
import { usePersistentSave } from '../../hooks/usePersistentSave';
import { useApp } from '../../store';
import type { ModuleId, Task } from '../../types';

export function TaskForm({ task, onClose }: { task?: Task; onClose: () => void }) {
  const { data, toast, user } = useApp();
  const { save, submitting, saveError, reportError } = usePersistentSave();
  const first = modules.find(module => allowed(user, module.id))!.id;
  const [draft, setDraft] = useState<Task>(task ?? { id: uid('task'), title: '', module: first, equipmentId: data.equipment.find(item => item.module === first)?.id ?? '', assignedTo: '', frequency: 'Mensual', due: today(), notes: '', active: true });
  const set = <K extends keyof Task>(key: K, value: Task[K]) => setDraft(current => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (task && data.records.some(record => record.taskId === task.id) && (draft.module !== task.module || draft.equipmentId !== task.equipmentId)) {
      reportError('No se puede cambiar el módulo o equipo de una tarea que ya tiene controles asociados. Podés crear una tarea nueva para conservar la trazabilidad.');
      return;
    }
    const normalized = { ...draft, title: draft.title.trim(), notes: draft.notes.trim() };
    if (!await save(workspace => ({ ...workspace, tasks: task ? workspace.tasks.map(item => item.id === task.id ? normalized : item) : [...workspace.tasks, normalized] }))) return;
    toast(task ? 'Planificación actualizada.' : 'Nueva tarea programada.');
    onClose();
  }

  return <Modal title={task ? 'Editar tarea programada' : 'Programar mantenimiento'} subtitle="Definí el control, su responsable y cuándo debe realizarse." onClose={onClose}><form onSubmit={submit}><div className="modal-body"><Field label="Nombre de la tarea" required><input required maxLength={120} value={draft.title} onChange={event => set('title', event.target.value)} placeholder="Ej. Control mensual del grupo electrógeno" /></Field><div className="form-grid"><Field label="Módulo" required><select value={draft.module} onChange={event => { const module = event.target.value as ModuleId; setDraft(current => ({ ...current, module, equipmentId: data.equipment.find(item => item.module === module)?.id ?? '', assignedTo: '' })); }}>{modules.filter(module => allowed(user, module.id)).map(module => <option key={module.id} value={module.id}>{module.name}</option>)}</select></Field><Field label="Equipo / sector" required><select required value={draft.equipmentId} onChange={event => set('equipmentId', event.target.value)}><option value="">Seleccionar</option>{data.equipment.filter(item => item.module === draft.module).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Periodicidad" required><select value={draft.frequency} onChange={event => set('frequency', event.target.value as Task['frequency'])}>{frequencies.map(frequency => <option key={frequency}>{frequency}</option>)}</select></Field><Field label="Próxima fecha" required><input type="date" required value={draft.due} onChange={event => set('due', event.target.value)} /></Field></div><Field label="Responsable" required><select required value={draft.assignedTo} onChange={event => set('assignedTo', event.target.value)}><option value="">Asignar responsable</option>{data.users.filter(member => allowed(member, draft.module)).map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></Field><Field label="Indicaciones"><textarea rows={3} value={draft.notes} onChange={event => set('notes', event.target.value)} placeholder="Información útil para realizar la tarea…" /></Field>{task && <label className="checkbox-line"><input type="checkbox" checked={draft.active} onChange={event => set('active', event.target.checked)} />Tarea activa en el calendario</label>}{saveError && <p className="form-error" role="alert">{saveError}</p>}</div><footer className="modal-footer"><button type="button" className="button secondary" disabled={submitting} onClick={onClose}>Cancelar</button><button className="button primary" type="submit" disabled={submitting}><Icon name="CalendarDays" size={16} />{submitting ? 'Guardando…' : task ? 'Guardar cambios' : 'Programar tarea'}</button></footer></form></Modal>;
}

