import { useState, type FormEvent } from 'react';
import { Field, Icon, Modal } from '../../components';
import { frequencies, workspaceModules } from '../../data';
import { allowed, parseDate, today, uid } from '../../domain';
import { usePersistentSave } from '../../hooks/usePersistentSave';
import { useApp } from '../../store';
import type { ModuleId, Task } from '../../types';
import { defaultResponsible } from '../modules/moduleResponsibility';

export function TaskForm({ task, onClose }: { task?: Task; onClose: () => void }) {
  const { data, toast, user, remote } = useApp();
  const { save, submitting, saveError, reportError } = usePersistentSave();
  const catalog = workspaceModules(data);
  const first = catalog.find(module => allowed(user, module.id))?.id ?? 'generator';
  const firstEquipment = data.equipment.find(item => item.module === first)?.id ?? '';
  const [draft, setDraft] = useState<Task>(task ?? { id: uid('task'), title: '', module: first, equipmentId: firstEquipment, assignedTo: defaultResponsible(data, first, firstEquipment), frequency: 'Mensual', due: today(), notes: '', active: true });
  const set = <K extends keyof Task>(key: K, value: Task[K]) => setDraft(current => ({ ...current, [key]: value }));
  const eligible = data.users.filter(member => allowed(member, draft.module));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.equipmentId) { reportError('Completá el nombre y el equipo del control.'); return; }
    if (!eligible.some(member => member.id === draft.assignedTo)) { reportError('Elegí un responsable activo con acceso al módulo. Podés habilitarlo en Personas y permisos.'); return; }
    if (task && data.records.some(record => record.taskId === task.id) && (draft.module !== task.module || draft.equipmentId !== task.equipmentId)) { reportError('No se puede cambiar el módulo o equipo de una programación con controles realizados. Creá otra para conservar su historial.'); return; }
    const normalized = { ...draft, startsOn: task?.startsOn ?? (!task ? draft.due : undefined), anchorDay: !task || draft.due !== task.due ? parseDate(draft.due).getDate() : task.anchorDay, title: draft.title.trim(), notes: draft.notes.trim() };
    if (!await save(workspace => ({ ...workspace, tasks: task ? workspace.tasks.map(item => item.id === task.id ? normalized : item) : [...workspace.tasks, normalized] }))) return;
    toast(task ? 'Planificación actualizada.' : 'Control programado.'); onClose();
  }
  function changeModule(module: ModuleId) {
    const equipmentId = data.equipment.find(item => item.module === module)?.id ?? '';
    setDraft(current => ({ ...current, module, equipmentId, assignedTo: defaultResponsible(data, module, equipmentId), frequency: catalog.find(item => item.id === module)?.frequency ?? 'Mensual' }));
  }
  return <Modal title={task ? 'Editar control programado' : 'Programar control'} subtitle="Elegí el equipo, la fecha y la persona responsable." onClose={onClose}><form onSubmit={submit}><div className="modal-body">
    <Field label="Nombre del control" required><input required maxLength={120} value={draft.title} onChange={event => set('title', event.target.value)} placeholder="Ej. Control mensual del grupo electrógeno" /></Field>
    <div className="form-grid">
      <Field label="Módulo" required><select value={draft.module} onChange={event => changeModule(event.target.value as ModuleId)}>{catalog.filter(module => allowed(user, module.id)).map(module => <option key={module.id} value={module.id}>{module.name}</option>)}</select></Field>
      <Field label="Equipo / sector" required><select required value={draft.equipmentId} onChange={event => setDraft(current => ({ ...current, equipmentId: event.target.value, assignedTo: defaultResponsible(data, current.module, event.target.value) }))}><option value="">Seleccionar</option>{data.equipment.filter(item => item.module === draft.module).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Responsable del control" required hint="La asignación no reemplaza los permisos. El registro identificará a quien lo realice."><select required value={draft.assignedTo} onChange={event => set('assignedTo', event.target.value)}><option value="">Elegir responsable</option>{draft.assignedTo && !eligible.some(member => member.id === draft.assignedTo) && <option value={draft.assignedTo}>Responsable anterior sin acceso activo</option>}{eligible.map(member => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}</select></Field>
      <Field label="Periodicidad" required><select value={draft.frequency} onChange={event => set('frequency', event.target.value as Task['frequency'])}>{frequencies.map(frequency => <option key={frequency}>{frequency}</option>)}</select></Field>
      <Field label="Próxima fecha" required><input type="date" required value={draft.due} onChange={event => set('due', event.target.value)} /></Field>
    </div>
    {remote && draft.frequency !== 'Única' && <Field label="Regla de próxima fecha confirmada por CER" required hint="Quincenal equivale a cada 15 días. Si CER usa fechas fijas, no confirmar esta regla."><select required value={draft.scheduleBasis ?? ''} onChange={event => set('scheduleBasis', event.target.value as Task['scheduleBasis'])}><option value="">Elegir regla confirmada</option><option value="planned">Desde la fecha prevista</option><option value="completion">Desde la fecha realizada</option></select></Field>}
    <Field label="Indicaciones"><textarea rows={3} value={draft.notes} onChange={event => set('notes', event.target.value)} /></Field>
    {task?.cancelledFrom && <p className="inline-notice">Programación cancelada desde {task.cancelledFrom}. Sus registros anteriores se conservan.</p>}
    {saveError && <p className="form-error" role="alert">{saveError}</p>}
  </div><footer className="modal-footer"><button type="button" className="button secondary" disabled={submitting} onClick={onClose}>Cancelar</button><button className="button primary" disabled={submitting}><Icon name="CalendarDays" size={16} />{submitting ? 'Guardando…' : task ? 'Guardar cambios' : 'Programar control'}</button></footer></form></Modal>;
}
