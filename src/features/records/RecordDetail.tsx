import { useState, type FormEvent } from 'react';
import { Badge, Field, Icon, Modal, ModuleIcon, Photo } from '../../components';
import { moduleById } from '../../data';
import { canManage, formatDate } from '../../domain';
import { useApp } from '../../store';
import type { MaintenanceRecord } from '../../types';
import { auditEvent } from '../../workspace';

const statusLabel = (record: MaintenanceRecord) => record.status === 'active' ? (record.result === 'ok' ? 'Conforme' : 'Con observaciones') : record.status === 'superseded' ? 'Rectificado' : 'Anulado';

export function RecordDetail({ record, onClose, onCorrect }: { record: MaintenanceRecord; onClose: () => void; onCorrect: () => void }) {
  const { data, user, update, toast } = useApp();
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const module = moduleById(record.module);
  const equipment = data.equipment.find(item => item.id === record.equipmentId);
  const owner = data.users.find(item => item.id === record.userId);
  const events = data.auditEvents.filter(event => event.entityId === record.id || event.relatedEntityId === record.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const mutable = canManage(user) && record.status === 'active';

  function voidRecord(event: FormEvent) {
    event.preventDefault();
    const cleanReason = reason.trim();
    if (cleanReason.length < 10) {
      setError('Explicá el motivo de la anulación con al menos 10 caracteres.');
      return;
    }
    const occurredAt = new Date().toISOString();
    update(workspace => ({
      ...workspace,
      records: workspace.records.map(item => item.id === record.id ? { ...item, status: 'voided', voidedAt: occurredAt, voidedBy: user.id, voidReason: cleanReason } : item),
      auditEvents: [auditEvent(user.id, 'record.voided', record.id, `Anuló el registro. Motivo: ${cleanReason}`), ...workspace.auditEvents],
    }));
    toast('Registro anulado sin eliminar su historial.');
    onClose();
  }

  return <Modal title="Detalle del registro" subtitle={`${record.id} · Revisión ${record.revision}`} onClose={onClose} wide>
    <div className="modal-body">
      <div className="detail-summary"><div className="form-intro"><ModuleIcon module={record.module} /><div><h3>{module.name}</h3><p>{equipment?.name}</p></div></div><Badge>{statusLabel(record)}</Badge></div>
      {record.status !== 'active' && <div className={`record-lifecycle-banner ${record.status}`}><Icon name={record.status === 'voided' ? 'Ban' : 'History'} /><div><strong>{record.status === 'voided' ? 'Este registro fue anulado' : 'Existe una rectificación posterior'}</strong><span>{record.status === 'voided' ? record.voidReason : `Nueva versión: ${record.supersededById ?? 'consultar historial'}`}</span></div></div>}
      <div className="detail-metadata"><div><span>Fecha del control</span><strong>{formatDate(record.date)}</strong></div><div><span>Responsable</span><strong>{owner?.name ?? 'Sin asignar'}</strong></div><div><span>Equipo</span><strong>{equipment?.code ?? '—'}</strong></div></div>
      {module.sections.map(section => <section className="detail-section" key={section.title}><h3>{section.title}</h3>{section.fields.map(field => <div className="detail-row" key={field.id}><span>{field.label}</span><strong className={record.values[field.id] === 'MAL' ? 'text-red' : ''}>{record.values[field.id] || 'Sin registrar'} {record.values[field.id] && field.unit}</strong></div>)}</section>)}
      <section className="detail-section"><h3>Observaciones</h3><p className="preserve-lines">{record.notes || 'Sin observaciones adicionales.'}</p></section>
      {record.photos.length > 0 && <section className="detail-section"><h3>Evidencia fotográfica</h3><div className="photo-grid categorized">{record.photos.map(photo => <figure key={photo.id}><Photo attachment={photo} />{photo.category && <figcaption>{photo.category}</figcaption>}</figure>)}</div></section>}
      <section className="detail-section audit-section"><h3>Trazabilidad del registro</h3><div className="audit-timeline"><div><span><Icon name="FilePlus2" size={14} /></span><p><strong>Registro creado</strong><small>{new Date(record.createdAt).toLocaleString('es-AR')} · {owner?.name ?? 'Sin asignar'}</small></p></div>{events.map(item => { const actor = data.users.find(member => member.id === item.actorId); return <div key={item.id}><span><Icon name={item.action === 'record.voided' ? 'Ban' : item.action === 'record.corrected' ? 'History' : 'Check'} size={14} /></span><p><strong>{item.summary}</strong><small>{new Date(item.occurredAt).toLocaleString('es-AR')} · {actor?.name ?? 'Usuario no disponible'}</small></p></div>; })}</div></section>
      {voiding && <form className="void-record-panel" onSubmit={voidRecord}><div><Icon name="TriangleAlert" /><span><strong>Anular sin borrar</strong><small>El registro seguirá visible en el historial y en la auditoría.</small></span></div><Field label="Motivo de la anulación" required hint="Indicá por qué el registro no debe considerarse vigente."><textarea autoFocus required minLength={10} rows={3} value={reason} onChange={event => setReason(event.target.value)} /></Field>{error && <p className="form-error" role="alert">{error}</p>}<div><button className="button secondary" type="button" onClick={() => { setVoiding(false); setError(''); }}>Cancelar</button><button className="button danger" type="submit"><Icon name="Ban" size={16} />Confirmar anulación</button></div></form>}
    </div>
    <footer className="modal-footer"><span className="muted">Registrado el {formatDate(record.createdAt.slice(0, 10))}</span><div className="record-detail-actions">{mutable && !voiding && <><button className="button secondary" onClick={onCorrect}><Icon name="History" size={16} />Rectificar</button><button className="button danger-ghost" onClick={() => setVoiding(true)}><Icon name="Ban" size={16} />Anular</button></>}<button className="button primary" onClick={onClose}>Listo<Icon name="Check" size={16} /></button></div></footer>
  </Modal>;
}
