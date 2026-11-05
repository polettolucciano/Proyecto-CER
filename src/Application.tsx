import { useEffect,useState } from 'react';
import App from './App';
import { AppProvider } from './store';
import { AuthGate } from './features/auth/AuthGate';
import { PublicTrainingPage, PublicTrainingContent } from './features/training/PublicTrainingPage';
import { TrainingWorkspace } from './features/training/TrainingWorkspace';
import { supabase } from './infrastructure/supabase/client';
import type { Training } from './types';

function RemoteLibrary(){
 const [materials,setMaterials]=useState<Training[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;supabase!.from('cer_training').select('id,published,data').eq('published',true).then(({data,error})=>{if(!active)return;if(error)setError('No se pudo cargar la biblioteca. Volvé a intentarlo más tarde.');else setMaterials((data??[]).map(row=>({...row.data,id:row.id,published:row.published}) as Training));setLoading(false);});return()=>{active=false;};},[]);
 if(loading)return <div className="app-loading"><span className="spinner"/><p>Cargando biblioteca…</p></div>;
 if(error)return <main className="auth-page"><p role="alert">{error}</p></main>;
 return <PublicTrainingContent materials={materials} remote/>;
}
function readMode() {
 const path = location.pathname.replace(/\/$/, '');
 if (path === '/capacitaciones/administrar' || location.hash === '#training') return 'training-admin';
 if (path === '/capacitaciones' || location.hash === '#public-training') return 'public';
 return 'maintenance';
}
export function Application(){
 const [mode,setMode]=useState(readMode);
 useEffect(()=>{const change=()=>setMode(readMode());window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[]);
 useEffect(()=>{if(mode==='training-admin' && location.pathname.replace(/\/$/,'')!=='/capacitaciones/administrar')location.replace('/capacitaciones/administrar');},[mode]);
 if(mode==='public')return supabase ? <RemoteLibrary/> : <AppProvider><PublicTrainingPage/></AppProvider>;
 const app=<AppProvider>{mode==='training-admin'?<TrainingWorkspace/>:<App/>}</AppProvider>;
 return supabase?<AuthGate>{app}</AuthGate>:app;
}
