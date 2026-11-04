import { useState, type FormEvent } from 'react';
import { Field, Icon, PageHeader } from '../../components';
import { canManage } from '../../domain';
import { usePersistentSave } from '../../hooks/usePersistentSave';
import { useApp } from '../../store';

export function SettingsPage({ embedded = false }: { embedded?: boolean }) {
  const { data, user, toast,remote } = useApp();
  const { save, submitting, saveError } = usePersistentSave();
  const [draft, setDraft] = useState(data.settings);
  const admin = canManage(user);
  const dirty = draft.organization !== data.settings.organization || draft.location !== data.settings.location || draft.advanceDays !== data.settings.advanceDays;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!admin || !dirty) return;
    if (!await save(workspace => ({ ...workspace, settings: draft }))) return;
    toast(remote ? 'Preferencias confirmadas en el servidor.' : 'Preferencias actualizadas y confirmadas en este navegador.');
  }

  return <>
    {!embedded && <PageHeader title="Preferencias del centro" description="Nombre del centro y anticipación de próximos controles." />}
    <div className="settings-grid unified-settings">
      <section className="panel">
        <div className="panel-heading"><div><h2>Información del centro</h2><p>Identidad y preferencias generales.</p></div><Icon name="Building2" /></div>
        <form onSubmit={submit}>
          <div className="settings-body">
            <Field label="Nombre del centro"><input disabled={!admin || submitting} required value={draft.organization} onChange={event => setDraft(current => ({ ...current, organization: event.target.value }))} /></Field>
            <Field label="Anticipación de próximos vencimientos" hint="Define cuántos días antes aparece el estado “Próximo” en Planificación."><select disabled={!admin || submitting} value={draft.advanceDays} onChange={event => setDraft(current => ({ ...current, advanceDays: Number(event.target.value) }))}>{[3, 7, 14, 30].map(days => <option key={days} value={days}>{days} días</option>)}</select></Field>
            {saveError && <p className="form-error" role="alert">{saveError}</p>}
          </div>
          {admin && <div className="settings-footer"><button type="submit" className="button primary" disabled={!dirty || submitting}><Icon name="Check" size={16} />{submitting ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Sin cambios pendientes'}</button></div>}
        </form>
      </section>


    </div>
  </>;
}
