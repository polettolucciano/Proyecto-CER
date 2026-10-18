import { useState, type FormEvent } from 'react';
import { Field, Icon, Modal } from '../../components';
import { safeHttpsUrl, today, uid } from '../../domain';
import { usePersistentSave } from '../../hooks/usePersistentSave';
import { useApp } from '../../store';
import type { Training } from '../../types';

export function TrainingForm({ material, onClose }: { material?: Training; onClose: () => void }) {
  const { toast } = useApp();
  const [error, setError] = useState('');
  const { save, submitting, saveError } = usePersistentSave();
  const [draft, setDraft] = useState<Training>(material ?? { id: uid('training'), title: '', description: '', category: 'Mantenimiento', type: 'Video', url: '', published: false, date: today() });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const safeUrl = safeHttpsUrl(draft.url);
    if (!safeUrl) { setError('Ingresá un enlace válido que empiece con https://.'); return; }
    setError('');
    const safeDraft = { ...draft, title: draft.title.trim(), description: draft.description.trim(), url: safeUrl };
    if (!await save(workspace => ({ ...workspace, training: material ? workspace.training.map(item => item.id === material.id ? safeDraft : item) : [...workspace.training, safeDraft] }))) return;
    toast('Material guardado en la biblioteca local.');
    onClose();
  }

  return <Modal title={material ? 'Editar material' : 'Agregar material de capacitación'} subtitle="Organizá videos, documentos y presentaciones por tema." onClose={onClose}><form onSubmit={submit}><div className="modal-body"><Field label="Título" required><input required value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} /></Field><div className="form-grid"><Field label="Tipo"><select value={draft.type} onChange={event => setDraft(current => ({ ...current, type: event.target.value as Training['type'] }))}><option>Video</option><option>Documento</option><option>Presentación</option></select></Field><Field label="Categoría"><select value={draft.category} onChange={event => setDraft(current => ({ ...current, category: event.target.value }))}><option>Mantenimiento</option><option>Tratamiento de agua</option><option>Seguridad</option><option>Institucional</option></select></Field></div><Field label="Enlace al material" required hint="YouTube, Vimeo, Drive u otro enlace HTTPS."><input type="url" required placeholder="https://" value={draft.url} onChange={event => setDraft(current => ({ ...current, url: event.target.value }))} /></Field><Field label="Descripción"><textarea rows={3} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} /></Field><label className="checkbox-line"><input type="checkbox" checked={draft.published} onChange={event => setDraft(current => ({ ...current, published: event.target.checked }))} />Mostrar en la biblioteca</label><p className="muted small-text">La publicación pública estará disponible al conectar el sitio con su backend.</p>{(error || saveError) && <p className="form-error" role="alert">{error || saveError}</p>}</div><footer className="modal-footer"><button type="button" className="button secondary" disabled={submitting} onClick={onClose}>Cancelar</button><button type="submit" className="button primary" disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar material'}<Icon name="Check" size={16} /></button></footer></form></Modal>;
}

