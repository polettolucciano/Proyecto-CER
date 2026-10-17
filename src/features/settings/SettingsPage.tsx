import { useState, type FormEvent } from 'react';
import { Field, Icon, PageHeader } from '../../components';
import { canManage } from '../../domain';
import { usePersistentSave } from '../../hooks/usePersistentSave';
import { useApp } from '../../store';

export function SettingsPage() {
  const { data, user, toast, saving, storageError } = useApp();
  const { save, submitting, saveError } = usePersistentSave();
  const [draft, setDraft] = useState(data.settings);
  const admin = canManage(user);
  const dirty = draft.organization !== data.settings.organization || draft.location !== data.settings.location || draft.advanceDays !== data.settings.advanceDays;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!admin || !dirty) return;
    if (!await save(workspace => ({ ...workspace, settings: draft }))) return;
    toast('Preferencias actualizadas y confirmadas en este navegador.');
  }

  return <>
    <PageHeader eyebrow="TU ESPACIO DE TRABAJO" title="Configuración" description="Ajustá los detalles que hacen que CER Gestión sea tuyo." />
    <div className="settings-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Información del centro</h2><p>Identidad y preferencias generales.</p></div><Icon name="Building2" /></div>
        <form onSubmit={submit}>
          <div className="settings-body">
            <Field label="Nombre del centro"><input disabled={!admin || submitting} required value={draft.organization} onChange={event => setDraft(current => ({ ...current, organization: event.target.value }))} /></Field>
            <Field label="Sede"><input disabled={!admin || submitting} required value={draft.location} onChange={event => setDraft(current => ({ ...current, location: event.target.value }))} /></Field>
            <Field label="Anticipación de próximos vencimientos" hint="Define cuántos días antes aparece el estado “Próximo” en el tablero."><select disabled={!admin || submitting} value={draft.advanceDays} onChange={event => setDraft(current => ({ ...current, advanceDays: Number(event.target.value) }))}>{[3, 7, 14, 30].map(days => <option key={days} value={days}>{days} días</option>)}</select></Field>
            {saveError && <p className="form-error" role="alert">{saveError}</p>}
          </div>
          {admin && <div className="settings-footer"><button type="submit" className="button primary" disabled={!dirty || submitting}><Icon name="Check" size={16} />{submitting ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Sin cambios pendientes'}</button></div>}
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><h2>Estado de esta versión</h2><p>Frontend de presentación.</p></div><span className="module-icon teal small"><Icon name="Monitor" /></span></div>
        <div className="settings-body">
          <div className="connection-state"><span className="live-dot" /><strong>{storageError ? 'Almacenamiento no disponible' : saving ? 'Guardando cambios…' : 'Datos guardados en este navegador'}</strong></div>
          <p className="muted">Los registros, fotos y preferencias se conservan al recargar en este mismo navegador. Todavía no se comparten entre dispositivos.</p>
          <div className="connection-list">
            <div><Icon name="CheckCircle2" /><span>Interfaz y formularios conectados</span></div>
            <div><Icon name="CheckCircle2" /><span>Exportación de registros a Excel</span></div>
            <div className="pending"><Icon name="Clock3" /><span>Inicio de sesión y permisos de servidor</span></div>
            <div className="pending"><Icon name="Clock3" /><span>Base de datos compartida y copias de seguridad</span></div>
            <div className="pending"><Icon name="Clock3" /><span>Alertas por correo y celular</span></div>
          </div>
        </div>
      </section>

      <section className="panel full-width">
        <div className="panel-heading"><div><h2>Notificaciones automáticas</h2><p>El cliente las prevé para una próxima etapa.</p></div><span className="coming-badge">Próxima etapa</span></div>
        <div className="notification-settings"><div><span className="module-icon blue"><Icon name="Bell" /></span><div><strong>Recordatorios de mantenimiento</strong><p>La agenda ya identifica tareas próximas y vencidas. El envío por correo o celular se habilitará al conectar los servicios correspondientes.</p></div><span className="disabled-switch" aria-label="Envío de alertas todavía no disponible" /></div></div>
      </section>
    </div>
  </>;
}
