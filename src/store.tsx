import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Workspace, TeamUser } from './types';
import { createSeed } from './data';
import { repository } from './repository';
import { normalizeWorkspace } from './workspace';

interface Store { data: Workspace; user: TeamUser; userId: string; setUserId: (id: string) => void; update: (action: (data: Workspace) => Workspace) => void; toast: (message: string) => void; saving: boolean; storageError: string; }
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
  useEffect(() => { let active = true; repository.load().then(async value => { const restored = normalizeWorkspace(value); const initial = restored ?? createSeed(); if (!restored) await repository.save(initial); if (active) setData(initial); }).catch(() => { if (active) { setStorageError('El navegador no permite guardar los datos. Esta sesión será temporal.'); setData(createSeed()); } }); return () => { active = false; }; }, []);
  useEffect(() => { if (!data) return; const revision = ++latest.current; setSaving(true); queue.current = queue.current.then(() => repository.save(data)).then(() => { if (revision === latest.current) { setSaving(false); setStorageError(''); } }).catch(() => { if (revision === latest.current) { setSaving(false); setStorageError('No se pudieron guardar los últimos cambios. Revisá el espacio disponible en el navegador.'); } }); }, [data]);
  function toast(text: string) { setMessage(text); clearTimeout(timer.current); timer.current = setTimeout(() => setMessage(''), 4500); }
  if (!data) return <div className="app-loading"><img src="/cer-logo.png" width={80} height={68} alt="CER" /><span className="spinner" /><p>Preparando tu espacio de trabajo…</p></div>;
  const user = data.users.find(x => x.id === userId && x.active) ?? data.users.find(x => x.active && x.role === 'Administrador')!;
  return <Context.Provider value={{ data, user, userId: user.id, setUserId, update: action => setData(prev => action(prev!)), toast, saving, storageError }}>{children}{message && <div className="toast" role="status"><span className="toast-check">✓</span>{message}<button aria-label="Cerrar notificación" onClick={() => setMessage('')}>×</button></div>}</Context.Provider>;
}
