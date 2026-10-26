import { createClient } from '@supabase/supabase-js';
const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
export const backendMode = env.VITE_DATA_MODE ?? 'demo';
if (!['demo','supabase'].includes(backendMode)) throw new Error('VITE_DATA_MODE debe ser demo o supabase.');
const url=env.VITE_SUPABASE_URL, key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(backendMode==='supabase' && (!url || !key))throw new Error('Falta configurar Supabase. No se habilitarán datos de demostración.');
if(key && !key.startsWith('sb_publishable_'))throw new Error('Usá una clave publishable para el navegador.');
export const supabase=backendMode==='supabase' && url && key ? createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}}) : null;
export function backendMessage(error:unknown):string {
 const message=error && typeof error==='object' && 'message' in error ? String(error.message) : '';
 const code=error && typeof error==='object' && 'code' in error ? String(error.code) : '';
 if(/VERSION_CONFLICT/.test(message))return 'Otra persona modificó la información. Recargá los datos antes de volver a guardar.';
 if(/RECURRENCE_RULE_REQUIRED/.test(message))return 'Administración debe confirmar la regla de próxima fecha de esta tarea antes de completarla.';
 if(/DUPLICATE_CONFIRMATION_REQUIRED/.test(message))return 'Ya existe un control para este equipo y fecha. Revisá el historial y confirmá si es independiente.';
 if(code==='42501' || /AUTH_REQUIRED|ADMIN_REQUIRED|MODULE_FORBIDDEN/.test(message))return 'Tu sesión o tus permisos no permiten esta operación.';
 if(/REQUIRED_FIELD|INVALID_|NOTES_REQUIRED|FUTURE_RECORD|IDENTITY_LOCKED/.test(message))return 'Revisá los datos del formulario. La operación fue rechazada sin modificar los registros.';
 return 'No se pudo confirmar la operación con el servidor. Conservá el formulario y verificá tu conexión.';
}
