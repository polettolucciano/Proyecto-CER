import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import type {Workspace,TeamUser} from './types';
import {createSeed} from './data';
import {workspaceRepository,type WorkspaceRepository} from './infrastructure/persistence';
import {normalizeWorkspace} from './workspace';
import {supabase} from './infrastructure/supabase/client';
interface Store {data:Workspace;user:TeamUser;userId:string;setUserId:(id:string)=>void;update:(action:(data:Workspace)=>Workspace)=>Promise<boolean>;toast:(message:string)=>void;saving:boolean;storageError:string;remote:boolean;refresh:()=>Promise<void>;signOut:()=>Promise<void>;}
const Context=createContext<Store|null>(null);
export const useApp=()=>useContext(Context)!;
export function AppProvider({children,repository=workspaceRepository}:{children:ReactNode;repository?:WorkspaceRepository}){
 const remote=repository.remote===true;
 const [data,setData]=useState<Workspace|null>(null),[userId,setUser]=useState('user-admin'),[message,setMessage]=useState(''),[saving,setSaving]=useState(false),[storageError,setStorageError]=useState(''),[fatal,setFatal]=useState('');
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),queue=useRef(Promise.resolve()),dataRef=useRef<Workspace|null>(null);
 function accept(value:Workspace){dataRef.current=value;setData(value);}
 async function refresh(){try{const value=await repository.load() as Workspace;accept(value);setStorageError('');setFatal('');}catch(error){setStorageError(error instanceof Error?error.message:'No se pudieron actualizar los datos.');}}
 useEffect(()=>{let active=true;(async()=>{
  try{
   const value=await repository.load();
   if(remote){const {data:identity,error}=await supabase!.auth.getUser();if(error || !identity.user)throw new Error('Tu sesión venció. Volvé a ingresar.');const workspace=value as Workspace;if(!workspace.users.some(user=>user.id===identity.user!.id && user.active))throw new Error('Tu perfil no está habilitado. Contactá a Administración.');if(active){setUser(identity.user.id);accept(workspace);}return;}
   const restored=normalizeWorkspace(value);
   if(value!=null && !restored){if(active){accept(createSeed());setStorageError('Los datos locales son incompatibles. No se sobrescribieron.');}return;}
   const initial=restored??createSeed();if(value==null)await repository.save(initial);if(active)accept(initial);
  }catch(error){if(!active)return;if(remote){setFatal(error instanceof Error?error.message:'No se pudo conectar con CER.');return;}accept(createSeed());setStorageError('El navegador no permite guardar. Esta sesión es temporal.');}
 })();return()=>{active=false;};},[repository,remote]);
 function update(action:(workspace:Workspace)=>Workspace){
  setSaving(true);
  const result=queue.current.then(async()=>{
   const current=dataRef.current;if(!current)return false;
   try{const next=action(current);await repository.save(next);let confirmed=next;
    if(remote){try{confirmed=await repository.load() as Workspace;}catch{accept(next);setStorageError('Guardado confirmado. No se pudo actualizar la vista; recargá los datos.');return true;}}
    accept(confirmed);setStorageError('');return true;
   }catch(error){setStorageError(error instanceof Error?error.message:'No se pudieron guardar los cambios.');return false;}
  }).finally(()=>setSaving(false));queue.current=result.then(()=>undefined);return result;
 }
 function toast(text:string){setMessage(text);clearTimeout(timer.current);timer.current=setTimeout(()=>setMessage(''),4500);}
 if(fatal)return <main className="auth-page"><section className="auth-card"><h1>No se pudo abrir CER</h1><p role="alert">{fatal}</p><button className="button primary" onClick={()=>location.reload()}>Volver a intentar</button><button className="button secondary" onClick={()=>void supabase?.auth.signOut()}>Cerrar sesión</button></section></main>;
 if(!data)return <div className="app-loading"><img src="/cer-logo.png" width={80} height={68} alt="CER"/><span className="spinner"/><p>Preparando tu espacio de trabajo…</p></div>;
 const user=data.users.find(x=>x.id===userId && x.active)??(!remote?data.users.find(x=>x.active && x.role==='Administrador'):undefined);
 if(!user)return <main className="auth-page"><section className="auth-card"><h1>Acceso no habilitado</h1><p>Contactá a Administración.</p><button className="button secondary" onClick={()=>void supabase?.auth.signOut()}>Cerrar sesión</button></section></main>;
 return <Context.Provider value={{data,user,userId:user.id,setUserId:id=>{if(!remote)setUser(id);},update,toast,saving,storageError,remote,refresh,signOut:async()=>{await supabase?.auth.signOut();}}}>{children}{message && <div className="toast" role="status"><span className="toast-check">✓</span>{message}<button aria-label="Cerrar notificación" onClick={()=>setMessage('')}>×</button></div>}</Context.Provider>;
}
