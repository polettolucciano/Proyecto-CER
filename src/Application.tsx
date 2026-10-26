import { useEffect,useState } from 'react';
import App from './App';
import { AppProvider } from './store';
import { AuthGate } from './features/auth/AuthGate';
import { PublicTrainingContent } from './features/training/PublicTrainingPage';
import { supabase } from './infrastructure/supabase/client';
import type { Training } from './types';

function RemoteLibrary(){
 const [materials,setMaterials]=useState<Training[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;supabase!.from('cer_training').select('id,published,data').eq('published',true).then(({data,error})=>{if(!active)return;if(error)setError('No se pudo cargar la biblioteca. Volvé a intentarlo más tarde.');else setMaterials((data??[]).map(row=>({...row.data,id:row.id,published:row.published}) as Training));setLoading(false);});return()=>{active=false;};},[]);
 if(loading)return <div className="app-loading"><span className="spinner"/><p>Cargando biblioteca…</p></div>;
 if(error)return <main className="auth-page"><p role="alert">{error}</p></main>;
 return <PublicTrainingContent materials={materials} remote/>;
}
export function Application(){
 const [publicPage,setPublicPage]=useState(location.hash==='#public-training');
 useEffect(()=>{const change=()=>setPublicPage(location.hash==='#public-training');window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[]);
 if(supabase && publicPage)return <RemoteLibrary/>;
 const app=<AppProvider><App/></AppProvider>;
 return supabase?<AuthGate>{app}</AuthGate>:app;
}
