import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Avatar, Field, Icon, Modal, ModuleIcon, Photo } from '../../components';
import { moduleById, modules } from '../../data';
import { allowed, formatDate, today, uid } from '../../domain';
import { controlOptions, evidenceCategories, recordModuleMeta } from '../../modules/recordModules';
import { useApp } from '../../store';
import type { Attachment, Field as ControlField, FormSection, MaintenanceRecord, ModuleId, Task, Values } from '../../types';
import { createMaintenanceRecord, registerRecordInWorkspace } from './application/registerRecord';
import { findMissingRequiredField, selectValidEvidence, validateClosure, validateIdentification } from './domain/recordValidation';
import { findPotentialDuplicates } from './recordIntegrity';

function NumberControl({ field, value, onChange }: { field: ControlField; value: string; onChange: (value: string) => void }) {
  function adjust(amount: number) {
    const current = Number(value || 0);
    onChange(String(Math.max(0, Number((current + amount).toFixed(2)))));
  }
  return <div className="operational-number">
    <button type="button" aria-label={`Disminuir ${field.label}`} onClick={() => adjust(-1)}><Icon name="Minus" size={17} /></button>
    <div><input id={`field-${field.id}`} aria-label={field.label} type="number" min="0" step="any" required={!field.optional} value={value} placeholder="0,00" onChange={event => onChange(event.target.value)} />{field.unit && <span>{field.unit}</span>}</div>
    <button type="button" aria-label={`Aumentar ${field.label}`} onClick={() => adjust(1)}><Icon name="Plus" size={17} /></button>
  </div>;
}

function ChoiceControl({ field, moduleId, value, onChange }: { field: ControlField; moduleId: ModuleId; value: string; onChange: (value: string) => void }) {
  const options = controlOptions(field, moduleId);
  return <div className={`operational-choice ${options.length === 3 ? 'three' : ''}`} role="group" aria-label={field.label}>
    {options.map(option => <button type="button" key={option} aria-pressed={value === option} className={`${value === option ? 'selected' : ''} ${option === 'MAL' ? 'negative' : ''}`} onClick={() => onChange(option)}>{value === option && <Icon name="Check" size={14} />}{option}</button>)}
  </div>;
}

function VerificationField({ field, moduleId, value, onChange }: { field: ControlField; moduleId: ModuleId; value: string; onChange: (value: string) => void }) {
  const complete = Boolean(value.trim());
  return <div className={`verification-row ${complete ? 'complete' : ''}`} id={`control-${field.id}`}>
    <div className="verification-copy"><span className="verification-state"><Icon name={complete ? 'Check' : 'Circle'} size={13} /></span><div><label htmlFor={`field-${field.id}`}>{field.label}{!field.optional && <b className="required"> *</b>}</label>{field.hint && <small><Icon name="CircleHelp" size={12} />{field.hint}</small>}</div></div>
    {['check', 'switch', 'yesno'].includes(field.type)
      ? <ChoiceControl field={field} moduleId={moduleId} value={value} onChange={onChange} />
      : field.type === 'number'
        ? <NumberControl field={field} value={value} onChange={onChange} />
        : <textarea id={`field-${field.id}`} required={!field.optional} rows={2} value={value} onChange={event => onChange(event.target.value)} placeholder="Describí lo realizado…" />}
  </div>;
}

function VerificationSection({ section, moduleId, values, onChange }: { section: FormSection; moduleId: ModuleId; values: Values; onChange: (id: string, value: string) => void }) {
  const additional = section.fields.every(field => field.optional);
  const completed = section.fields.filter(field => values[field.id]?.trim()).length;
  const header = <><div><h3>{section.title}</h3>{section.description && <p>{section.description}</p>}</div><small>{completed}/{section.fields.length}{additional ? ' · Si corresponde' : ''}</small></>;
  const fields = section.fields.map(field => <VerificationField key={field.id} field={field} moduleId={moduleId} value={values[field.id] ?? ''} onChange={value => onChange(field.id, value)} />);
  return additional
    ? <details className="verification-section optional-verifications" open={completed > 0 || undefined}><summary>{header}<Icon name="ChevronDown" size={16} /></summary><div>{fields}</div></details>
    : <section className="verification-section"><header>{header}</header><div>{fields}</div></section>;
}

function EvidenceUpload({ label, category, photos, onAdd, onRemove }: { label: string; category: string; photos: Attachment[]; onAdd: (files: FileList | null, category: string) => void; onRemove: (id: string) => void }) {
  const selected = photos.filter(photo => photo.category === category);
  return <div className="evidence-slot"><div className="evidence-slot-heading"><span><Icon name="Camera" size={18} /></span><div><strong>{label}</strong><small>JPG, PNG o WebP · máximo 5 MB</small></div><label className="button secondary small">Agregar<input type="file" aria-label={`Agregar ${label.toLowerCase()}`} accept="image/jpeg,image/png,image/webp" multiple onChange={event => { onAdd(event.target.files, category); event.target.value = ''; }} /></label></div>{selected.length > 0 && <div className="evidence-thumbnails">{selected.map(photo => <div key={photo.id}><Photo attachment={photo} /><button type="button" aria-label={`Quitar ${photo.name}`} onClick={() => onRemove(photo.id)}><Icon name="X" size={13} /></button></div>)}</div>}</div>;
}

export function OperationalRecordForm({ initialModule, initialEquipment, task, sourceRecord, onClose }: { initialModule?: ModuleId; initialEquipment?: string; task?: Task; sourceRecord?: MaintenanceRecord; onClose: () => void }) {
  const { data, user, update, toast,remote } = useApp();
  const available = modules.filter(module => allowed(user, module.id));
  const initialModuleId = sourceRecord?.module ?? task?.module ?? initialModule ?? available[0]?.id ?? 'generator';
  const initialEquipmentId = sourceRecord?.equipmentId ?? task?.equipmentId ?? initialEquipment ?? data.equipment.find(item => item.module === initialModuleId)?.id ?? '';
  const initialTaskId = sourceRecord?.taskId ?? task?.id ?? '';
  const initialDate = sourceRecord?.date ?? today();
  const [moduleId, setModuleId] = useState<ModuleId>(initialModuleId);
  const [pendingModule, setPendingModule] = useState<ModuleId | null>(null);
  const module = sourceRecord?.formDefinition ?? moduleById(moduleId);
  const meta = recordModuleMeta[moduleId] ?? { form: 'Registro de control', title: module.name, cadence: module.frequency, guidance: module.description };
  const [equipmentId, setEquipmentId] = useState(initialEquipmentId);
  const [taskId, setTaskId] = useState(initialTaskId);
  const [date, setDate] = useState(initialDate);
  const [values, setValues] = useState<Values>(sourceRecord?.values ?? {});
  const [notes, setNotes] = useState(sourceRecord?.notes ?? '');
  const [result, setResult] = useState<'Conforme' | 'Con observaciones'>(sourceRecord?.result === 'attention' ? 'Con observaciones' : 'Conforme');
  const [photos, setPhotos] = useState<Attachment[]>(sourceRecord?.photos ?? []);
  const [duplicateApproved, setDuplicateApproved] = useState(false);
  const [identificationOpen, setIdentificationOpen] = useState(!task && !sourceRecord && !initialEquipment);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const submitLock = useRef(false);
  const recordId = useRef(`CER-${new Date().getFullYear()}-${crypto.randomUUID()}`);
  const equipment = data.equipment.find(item => item.id === equipmentId);
  const requiredFields = useMemo(() => module.sections.flatMap(section => section.fields).filter(field => !field.optional), [module]);
  const completedRequired = requiredFields.filter(field => values[field.id]?.trim()).length;
  const hasIssue = Object.values(values).includes('MAL') || result === 'Con observaciones';
  const duplicates = findPotentialDuplicates(data.records, { module: moduleId, equipmentId, date, taskId: taskId || undefined, excludeRecordId: sourceRecord?.id });
  const dirty = moduleId !== initialModuleId || equipmentId !== initialEquipmentId || taskId !== initialTaskId || date !== initialDate || notes !== (sourceRecord?.notes ?? '') || result !== (sourceRecord?.result === 'attention' ? 'Con observaciones' : 'Conforme') || JSON.stringify(values) !== JSON.stringify(sourceRecord?.values ?? {}) || photos.length !== (sourceRecord?.photos.length ?? 0) || photos.some((photo, index) => photo.id !== sourceRecord?.photos[index]?.id);

  useEffect(() => {
    if (!dirty) return;
    const protectDraft = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protectDraft);
    return () => window.removeEventListener('beforeunload', protectDraft);
  }, [dirty]);

  useEffect(() => {
    if (!confirmClose) return;
    const previous = document.activeElement as HTMLElement | null;
    confirmationRef.current?.focus();
    const trapConfirmation = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setConfirmClose(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(confirmationRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []);
      if (!buttons.length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.shiftKey ? (current <= 0 ? buttons.length - 1 : current - 1) : (current >= buttons.length - 1 ? 0 : current + 1);
      buttons[next].focus();
    };
    document.addEventListener('keydown', trapConfirmation, true);
    return () => { document.removeEventListener('keydown', trapConfirmation, true); previous?.focus(); };
  }, [confirmClose]);

  function requestClose() {
    if (submitting) return;
    if (dirty && !submitting) setConfirmClose(true);
    else onClose();
  }

  function changeModule(value: ModuleId) {
    if (value === moduleId) return;
    if (Object.values(values).some(Boolean) || photos.length || notes.trim()) {
      setPendingModule(value);
      return;
    }
    applyModule(value);
  }

  function applyModule(value: ModuleId) {
    setModuleId(value);
    setEquipmentId(data.equipment.find(item => item.module === value)?.id ?? '');
    setTaskId('');
    setValues({});
    setPhotos([]);
    setNotes('');
    setResult('Conforme');
    setDuplicateApproved(false);
    setPendingModule(null);
    setError('');
  }

  function validateForm() {
    const identificationError = validateIdentification(equipmentId, date, today());
    if (identificationError) {
      setIdentificationOpen(true);
      setError(identificationError);
      return false;
    }
      const missing = findMissingRequiredField(module, values);
      if (missing) {
        setError(`Falta completar “${missing.label}”.`);
        document.getElementById(`control-${missing.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const row = document.getElementById(`control-${missing.id}`);
        row?.querySelector<HTMLElement>('input, textarea, button')?.focus({ preventScroll: true });
        return false;
      }
      if (!formRef.current?.reportValidity()) return false;
    setError('');
    return true;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pendingModule) { setError('Confirmá o cancelá el cambio de formulario antes de guardar.'); return; }
    if (submitting || submitLock.current) return;
    if (!validateForm()) return;
    const closureError = validateClosure(hasIssue, notes);
    if (closureError) {
      setError(closureError);
      return;
    }
    if (!allowed(user, moduleId)) {
      setError('Tu perfil no tiene acceso a este módulo.');
      return;
    }
    if (duplicates.length > 0 && !duplicateApproved) {
      setError('Confirmá que este control es independiente de los registros existentes para la misma fecha.');
      return;
    }
    if (sourceRecord && sourceRecord.status !== 'active') {
      setError('Este registro ya no es la versión vigente y no puede rectificarse nuevamente.');
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    const record = {...createMaintenanceRecord({ module: moduleId, equipmentId, taskId: taskId || undefined, date, userId: user.id, hasIssue, values, notes, photos }, sourceRecord,new Date(),recordId.current),duplicateApproved};
    const saved = await update(workspace => registerRecordInWorkspace(workspace, record, sourceRecord));
    if (!saved) {
      submitLock.current = false;
      setSubmitting(false);
      setError('No se pudo confirmar el guardado. El formulario continúa abierto para que no pierdas la información.');
      return;
    }
    toast(sourceRecord ? 'Rectificación guardada. La versión anterior quedó preservada.' : 'Control registrado. El historial y la planificación se actualizaron.');
    onClose();
  }

  function addPhotos(files: FileList | null, category: string) {
    if (!files) return;
    const incoming = Array.from(files);
    const { accepted, rejected, exceedsLimit } = selectValidEvidence(incoming, photos);
    if (rejected) setError('Usá imágenes JPG, PNG o WebP de hasta 5 MB cada una.');
    if (exceedsLimit) {
      setError('Podés adjuntar hasta 6 fotografías por control.');
      return;
    }
    setPhotos(current => [...current, ...accepted.map(file => ({ id: uid('photo'), name: file.name, type: file.type, data: file, category }))]);
  }

  return <Modal title={sourceRecord ? `Rectificar · ${meta.title}` : meta.title} subtitle={`${meta.form} · ${meta.cadence}`} onClose={requestClose} wide>
    <div className="operational-form-shell simplified-record">
      <form ref={formRef} noValidate onSubmit={submit}>
        <div className="modal-body operational-body">
          <aside className="operational-context">
            <div className="form-document"><ModuleIcon module={moduleId} /><div><small>{meta.form}</small><strong>{module.name}</strong></div></div>
            <p>{meta.guidance}</p>
            <div className="closing-summary"><span><Icon name="ClipboardCheck" size={17} />Resumen del control</span><dl><div><dt>Fecha</dt><dd>{formatDate(date)}</dd></div><div><dt>Equipo</dt><dd>{equipment?.code ?? '—'}</dd></div><div><dt>Responsable</dt><dd>{user.name}</dd></div><div><dt>Verificaciones</dt><dd>{completedRequired}/{requiredFields.length}</dd></div></dl></div>
            <div className="form-safety-note"><Icon name="ShieldCheck" size={16} /><span>{remote?'El registro conservará tu autoría y fecha.':'Prototipo frontend. Los datos se guardan únicamente en este navegador.'}</span></div>
          </aside>

          <div className="operational-workspace">
            <div className="record-context-strip"><ModuleIcon module={moduleId} small /><div><strong>{task?.title ?? equipment?.name ?? module.name}</strong><small>{formatDate(date)} · {user.name}</small></div><button type="button" className="text-button" aria-expanded={identificationOpen} onClick={() => setIdentificationOpen(value => !value)}>{identificationOpen ? 'Ocultar datos' : 'Ver datos'}</button></div>
            {task?.notes && <p className="task-instructions preserve-lines">{task.notes}</p>}
            <div className="record-identification" hidden={!identificationOpen}>
              {pendingModule && <div className="module-change-confirmation" role="alert"><strong>¿Cambiar a {moduleById(pendingModule).name}?</strong><p>Las verificaciones, observaciones y fotos de este borrador se descartarán. Los registros guardados se conservan.</p><div><button type="button" className="button secondary small" onClick={() => setPendingModule(null)}>Seguir con este control</button><button type="button" className="button secondary small" onClick={() => applyModule(pendingModule)}>Cambiar formulario</button></div></div>}
              <div className="form-grid operational-grid"><Field label="Módulo" required><select value={moduleId} disabled={Boolean(task || sourceRecord)} onChange={event => changeModule(event.target.value as ModuleId)}>{available.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Fecha del control" required><input type="date" required max={today()} disabled={Boolean(sourceRecord)} value={date} onChange={event => { setDate(event.target.value); setDuplicateApproved(false); }} /></Field><Field label="Equipo o sector" required><select required value={equipmentId} disabled={Boolean(task || sourceRecord)} onChange={event => { setEquipmentId(event.target.value); setTaskId(''); setDuplicateApproved(false); }}><option value="">Seleccionar equipo</option>{data.equipment.filter(item => item.module === moduleId).map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></Field><Field label="Tarea programada" hint={sourceRecord ? 'La rectificación conserva la vinculación original.' : 'Si la vinculás, su próxima fecha se actualizará al guardar.'}><select value={taskId} disabled={Boolean(sourceRecord)} onChange={event => { setTaskId(event.target.value); setDuplicateApproved(false); }}><option value="">Control fuera de programación</option>{data.tasks.filter(item => item.active && item.module === moduleId && item.equipmentId === equipmentId).map(item => <option key={item.id} value={item.id}>{item.title} · {formatDate(item.due)}</option>)}</select></Field></div>
              {equipment && <div className="equipment-identity"><div><Icon name="Wrench" size={18} /><span><small>Equipo seleccionado</small><strong>{equipment.name}</strong></span></div><dl><div><dt>Código</dt><dd>{equipment.code}</dd></div><div><dt>Modelo</dt><dd>{equipment.model || 'Pendiente'}</dd></div><div><dt>Número</dt><dd>{equipment.serial || 'Pendiente'}</dd></div><div><dt>Ubicación</dt><dd>{equipment.location}</dd></div></dl></div>}
              <div className="responsible-card"><Avatar initials={user.initials} /><div><small>Quedará identificado como responsable del registro</small><strong>{user.name}</strong><span>{user.role}</span></div><Icon name="ShieldCheck" /></div>
              {sourceRecord && <div className="inline-notice soft"><Icon name="History" /><span>Estás creando la revisión {sourceRecord.revision + 1}. El registro original {sourceRecord.id} quedará preservado y marcado como rectificado.</span></div>}
              {!module.defined && <div className="inline-notice"><Icon name="CircleHelp" /><span>Este módulo conserva una ficha inicial. Su checklist definitivo todavía depende de la planilla específica de CER.</span></div>}
            </div>

              <div className="workspace-heading"><div><h3>Completá el control</h3><p>{moduleId === 'loop' ? 'Indicá el estado final observado en cada bomba.' : 'Completá cada verificación con el valor observado.'}</p></div><strong aria-live="polite">{completedRequired}/{requiredFields.length}</strong></div>
              <div className="operational-sections">{module.sections.map(section => <VerificationSection key={`${moduleId}-${section.title}`} section={section} moduleId={moduleId} values={values} onChange={(id, value) => setValues(current => ({ ...current, [id]: value }))} />)}</div>

            <section className="record-closure" aria-label="Resultado y observaciones">
              <div className="result-selector"><span><Icon name={hasIssue ? 'TriangleAlert' : 'CheckCircle2'} /><div><small>Resultado general</small><strong>{hasIssue ? 'Con observaciones' : 'Conforme'}</strong></div></span><select aria-label="Resultado general" value={Object.values(values).includes('MAL') ? 'Con observaciones' : result} disabled={Object.values(values).includes('MAL')} onChange={event => setResult(event.target.value as typeof result)}><option>Conforme</option><option>Con observaciones</option></select></div>
              <Field label="Observaciones" hint={hasIssue ? 'Obligatorio porque el control contiene una observación.' : 'Describí hallazgos, acciones realizadas o información para el próximo control.'}><textarea rows={4} placeholder="Escribí una observación clara para el equipo…" value={notes} onChange={event => setNotes(event.target.value)} /></Field>
              {duplicates.length > 0 && <div className="duplicate-warning" role="alert"><Icon name="Copy" size={20} /><div><strong>Ya existe {duplicates.length === 1 ? 'un control' : `${duplicates.length} controles`} para este equipo y fecha</strong><span>{duplicates.map(item => item.id).join(' · ')}</span><label><input type="checkbox" checked={duplicateApproved} onChange={event => setDuplicateApproved(event.target.checked)} />Confirmo que este es un control independiente y deseo conservar ambos.</label></div></div>}
              <details className="evidence-section compact-evidence" open={photos.length > 0 || undefined}><summary><Icon name="Camera" size={18} />Fotos del control{photos.length > 0 ? ` (${photos.length})` : ' · Si corresponde'}<Icon name="ChevronDown" size={16} /></summary>{evidenceCategories(moduleId).map(item => <EvidenceUpload key={item.category} {...item} photos={photos} onAdd={addPhotos} onRemove={id => setPhotos(current => current.filter(photo => photo.id !== id))} />)}</details>
              <p className="record-save-note">{taskId ? 'El control quedará vinculado a la tarea y actualizará su próxima fecha.' : 'Se guardará en el historial como control fuera de programación.'}</p>
            </section>
            {error && <p className="form-error operational-error" role="alert"><Icon name="TriangleAlert" size={16} />{error}</p>}
          </div>
        </div>
        <footer className="modal-footer operational-footer"><button type="button" className="button secondary" disabled={submitting} onClick={requestClose}>Cancelar</button><span>{completedRequired}/{requiredFields.length} verificaciones obligatorias</span><button type="submit" className="button primary" disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar control'}<Icon name="Check" size={16} /></button></footer>
      </form>
      {confirmClose && <div ref={confirmationRef} className="discard-confirmation" role="dialog" aria-modal="true" aria-labelledby="discard-title" tabIndex={-1}><div><span className="discard-icon"><Icon name="TriangleAlert" /></span><h3 id="discard-title">¿Salir sin guardar?</h3><p>Los cambios realizados en este control se perderán.</p><div><button className="button secondary" type="button" onClick={() => setConfirmClose(false)}>Continuar completando</button><button className="button danger" type="button" onClick={onClose}>Descartar cambios</button></div></div></div>}
    </div>
  </Modal>;
}
