import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Workspace, TeamUser } from './types';
import { createSeed } from './data';
import { repository } from './repository';
import { normalizeWorkspace } from './workspace';

interface Store { data: Workspace; user: TeamUser; userId: string; setUserId: (id: string) => void; update: (action: (data: Workspace) => Workspace) => Promise<boolean>; toast: (message: string) => void; saving: boolean; storageError: string; }
const Context = createContext<Store | null>(null);
export const useApp = () => useContext(Context)!;
export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Workspace | null>(null);
  const [userId, setUserId] = useState('user-admin');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [storageError, setStorageError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef(Promise.resolve());
  const latest = useRef(0);
  const dataRef = useRef<Workspace | null>(null);
  useEffect(() => {
    let active = true;
    repository.load().then(async value => {
      const restored = normalizeWorkspace(value);
      if (value != null && !restored) {
        if (active) {
          const initial = createSeed();
          dataRef.current = initial;
          setStorageError('Los datos guardados no tienen un formato compatible. No fueron sobrescritos y esta sesión será temporal.');
          setData(initial);
        }
        return;
      }
      const initial = restored ?? createSeed();
      if (value == null) await repository.save(initial);
      if (active) { dataRef.current = initial; setData(initial); }
    }).catch(() => {
      if (active) {
        const initial = createSeed();
        dataRef.current = initial;
        setStorageError('El navegador no permite guardar los datos. Esta sesión será temporal.');
        setData(initial);
      }
    });
    return () => { active = false; };
  }, []);
  function update(action: (workspace: Workspace) => Workspace) {
    const current = dataRef.current;
    if (!current) return Promise.resolve(false);
    const next = action(current);
    dataRef.current = next;
    setData(next);
    const revision = ++latest.current;
    setSaving(true);
    const result = queue.current.then(() => repository.save(next)).then(() => {
      if (revision === latest.current) { setSaving(false); setStorageError(''); }
      return true;
    }).catch(() => {
      if (revision === latest.current) {
        dataRef.current = current;
        setData(current);
        setSaving(false);
        setStorageError('No se pudieron guardar los últimos cambios. Revisá el espacio disponible en el navegador.');
      }
      return false;
    });
    queue.current = result.then(() => undefined);
    return result;
  }
  function toast(text: string) { setMessage(text); clearTimeout(timer.current); timer.current = setTimeout(() => setMessage(''), 4500); }
  if (!data) return <div className="app-loading"><img src="/cer-logo.png" width={80} height={68} alt="CER" /><span className="spinner" /><p>Preparando tu espacio de trabajo…</p></div>;
  const user = data.users.find(x => x.id === userId && x.active) ?? data.users.find(x => x.active && x.role === 'Administrador')!;
  return <Context.Provider value={{ data, user, userId: user.id, setUserId, update, toast, saving, storageError }}>{children}{message && <div className="toast" role="status"><span className="toast-check">✓</span>{message}<button aria-label="Cerrar notificación" onClick={() => setMessage('')}>×</button></div>}</Context.Provider>;
}
