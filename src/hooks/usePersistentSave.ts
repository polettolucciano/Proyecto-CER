import { useRef, useState } from 'react';
import { useApp } from '../store';
import type { Workspace } from '../types';

export function usePersistentSave() {
  const { update } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const lock = useRef(false);

  async function save(action: (workspace: Workspace) => Workspace) {
    if (lock.current) return false;
    lock.current = true;
    setSubmitting(true);
    setSaveError('');
    const saved = await update(action);
    lock.current = false;
    setSubmitting(false);
    if (!saved) setSaveError('No se pudo confirmar el guardado. Tus cambios siguen visibles para que puedas intentarlo nuevamente.');
    return saved;
  }

  return { save, submitting, saveError, reportError: setSaveError };
}
