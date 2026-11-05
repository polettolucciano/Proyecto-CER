import { useState, type FormEvent } from 'react';
import { Field, Icon, Modal } from '../../components';
import { formatDate } from '../../domain';
import { usePersistentSave } from '../../hooks/usePersistentSave';
import { useApp } from '../../store';
import type { Task } from '../../types';
import { cancelScheduledControl } from './cancelSchedule';
export function CancelControlForm({ task, date, onClose }: { task: Task; date: string; onClose: () => void }) {
  const { user, toast } = useApp();
  const { save, submitting, saveError } = usePersistentSave();
  const [scope, setScope] = useState<'date' | 'series'>('date');
  const [reason, setReason] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!await save(workspace => cancelScheduledControl(workspace, user, task.id, date, scope, reason))) return;
    toast(scope === 'date' ? 'Control previsto cancelado. El historial se conserva.' : 'Programación cancelada desde la fecha elegida. El historial se conserva.'); onClose();
  }
  return <Modal title="Cancelar control programado" subtitle={task.title} onClose={onClose}><form onSubmit={submit}><div className="modal-body"><p className="cancellation-date">Fecha prevista: <strong>{formatDate(date)}</strong></p>
    <Field label="Qué querés cancelar"><select value={scope} onChange={event => setScope(event.target.value as 'date' | 'series')}><option value="date">Solo este control</option>{task.frequency !== 'Única' && <option value="series">Este control y los siguientes</option>}</select></Field>
    <p className="inline-notice">{scope === 'date' ? 'Se cancela únicamente esta fecha. Las próximas repeticiones continúan.' : 'No se programarán controles desde esta fecha en adelante.'} Los controles realizados y el motivo de cancelación se conservan.</p>
    <Field label="Motivo de la cancelación" required><textarea required minLength={10} maxLength={1000} rows={3} value={reason} onChange={event => setReason(event.target.value)} /></Field>
    {saveError && <p className="form-error" role="alert">{saveError}</p>}
  </div><footer className="modal-footer"><button type="button" className="button secondary" disabled={submitting} onClick={onClose}>Volver sin cancelar</button><button className="button danger" disabled={submitting}><Icon name="X" size={16} />{submitting ? 'Cancelando…' : 'Confirmar cancelación'}</button></footer></form></Modal>;
}
