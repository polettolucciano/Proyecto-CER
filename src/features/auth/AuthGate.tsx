import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../infrastructure/supabase/client';
import { Field, Icon } from '../../components';

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const subscription = supabase!.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase!.auth.getUser().then(({ data }) => {
      if (active) { setUser(data.user); setLoading(false); }
    }).catch(() => {
      if (active) { setLoading(false); setError('No se pudo verificar la sesión. Revisá tu conexión.'); }
    });
    return () => { active = false; subscription.data.subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (user) {
        const { error } = await supabase!.auth.updateUser({ password: newPassword, data: { must_change_password: false } });
        if (error) { setError('No se pudo actualizar la contraseña. Usá al menos 12 caracteres y revisá los requisitos de tu cuenta.'); return; }
        await supabase!.auth.refreshSession();
        setNewPassword('');
        setRecovery(false);
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setError('No pudimos iniciar sesión. Revisá tu correo y contraseña o contactá a Administración.');
      }
    } catch {
      setError('No se pudo contactar al servidor. Revisá tu conexión y volvé a intentar.');
    } finally {
      setPassword('');
      setBusy(false);
    }
  }

  if (loading) return <div className="app-loading"><span className="spinner" /><p>Verificando sesión…</p></div>;
  // Este metadato orienta la incorporación; los permisos se verifican siempre en PostgreSQL.
  if (user && !user.user_metadata?.must_change_password && !recovery) return <div key={user.id}>{children}</div>;

  return <main className="auth-page"><section className="auth-card">
    <img src="/cer-logo.png" width="70" height="60" alt="CER" />
    <h1>{user ? 'Configurá tu contraseña' : 'Ingresar a CER'}</h1>
    <p>Gestión de mantenimiento del centro.</p>
    <form onSubmit={submit}>
      {!user && <>
        <Field label="Correo electrónico" required><input type="email" name="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Contraseña" required><input type="password" name="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></Field>
      </>}
      {user && <Field label="Nueva contraseña" required hint="Usá al menos 12 caracteres."><input type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={e => setNewPassword(e.target.value)} /></Field>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <button type="submit" className="button primary" disabled={busy}><Icon name="ShieldCheck" />{busy ? 'Verificando…' : user ? 'Guardar contraseña' : 'Ingresar'}</button>
    </form>
    {user && <button type="button" className="text-button" disabled={busy} onClick={() => void supabase!.auth.signOut()}>Cerrar sesión</button>}
    <p className="auth-help">Si necesitás acceso o recuperar tu cuenta, contactá a Administración.</p>
    <a className="text-button" href="#public-training">Biblioteca pública de capacitaciones</a>
  </section></main>;
}
