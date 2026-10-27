// Prueba remota explícita: solo cuenta, perfil y objetos sintéticos temporales.
// Nunca imprime credenciales; las claves de servidor permanecen en memoria.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {loadEnv} from 'vite';
import {createClient} from '@supabase/supabase-js';
import {ImageMagick,MagickColors,MagickFormat,NoiseType} from '@imagemagick/magick-wasm';
import {initializeImageEngine} from '../../supabase/functions/_shared/imageOptimization.ts';

if(process.argv[2]!=='--run')throw Error('Requiere --run: crea y limpia datos técnicos temporales en CER.');
const project='pnqsvmtmkceznoswpgfz',cli='./node_modules/.bin/supabase';
const env=loadEnv('development',process.cwd(),'VITE_');
if(new URL(env.VITE_SUPABASE_URL).hostname!==project+'.supabase.co' || readFileSync('supabase/.temp/project-ref','utf8').trim()!==project)throw Error('El destino no coincide con Proyecto-CER.');
const run=args=>execFileSync(cli,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000});
const keys=JSON.parse(run(['projects','api-keys','--project-ref',project,'--reveal','--output','json']));
const secret=(keys.find(k=>k.type==='secret')??keys.find(k=>k.name==='service_role'))?.api_key;
if(!secret)throw Error('No hay credencial de servidor disponible.');
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(30000)})}};
const admin=createClient(env.VITE_SUPABASE_URL,secret,options);
const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,options);
const query=sql=>run(['db','query','--linked',sql]);
const nonce=randomUUID(),email='cer-photo-qa-'+nonce+'@example.com',password=randomUUID()+randomUUID();
let id,path,stage='cuenta técnica';
const check=(condition,message)=>{if(!condition)throw Error(message);};
try{
  console.log('QA: preparar cuenta y perfil temporal.');
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});
  check(!created.error&&created.data.user,'No se pudo crear la cuenta técnica.');
  id=created.data.user.id;
  check(/^[0-9a-f-]{36}$/.test(id),'UUID inesperado.');
  stage='perfil técnico';
  query(`insert into public.cer_profiles(id,name,email,role,modules,active) values('${id}','Prueba técnica temporal de fotos','${email}','Enfermería',array['generator'],true)`);
  const login=await client.auth.signInWithPassword({email,password});
  check(!login.error&&login.data.session,'No se pudo iniciar la sesión técnica.');
  await initializeImageEngine(readFileSync(new URL(import.meta.resolve('@imagemagick/magick-wasm/magick.wasm'))));
  const source=ImageMagick.read(MagickColors.SteelBlue,3200,2400,image=>{
    image.addNoise(NoiseType.Gaussian,0.025);image.quality=78;
    return image.write(MagickFormat.Jpeg,data=>Uint8Array.from(data));
  });
  check(source.length<=5*1024*1024,'La imagen sintética supera el límite admitido.');
  console.log(JSON.stringify({fixtureBytes:source.length}));
  const body=(module='generator',bytes=source)=>{
    const form=new FormData();form.set('module',module);form.set('operationId',nonce);form.set('photoId','qa-fixture');
    form.set('file',new Blob([bytes],{type:'image/jpeg'}),'qa-fixture.jpg');return form;
  };
  const invoke=async form=>{
    const response=await fetch(env.VITE_SUPABASE_URL+'/functions/v1/cer-evidence',{
      method:'POST',body:form,headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+login.data.session.access_token},signal:AbortSignal.timeout(90000),
    });
    return {status:response.status,data:await response.json().catch(()=>({}))};
  };
  stage='optimización remota';console.log('QA: enviar imagen sintética al procesador.');
  const first=await invoke(body());
  if(first.status!==200){console.log(JSON.stringify({estadoHTTP:first.status,respuesta:first.data}));throw Error('La carga no fue confirmada.');}
  const data=first.data;
  check(data?.path?.startsWith('generator/'+id+'/'+nonce+'/'),'Ruta inesperada.');path=data.path;
  check(data.mime==='image/webp'&&data.storedBytes<source.length&&data.width===2048&&data.height===1536,'Resultado de compresión inesperado.');
  stage='lectura privada';
  const download=await client.storage.from('cer-evidence').download(path);
  check(!download.error&&download.data,'No se pudo leer el resultado privado.');
  const bytes=new Uint8Array(await download.data.arrayBuffer());
  check(bytes.length===data.storedBytes,'Tamaño de archivo remoto distinto.');
  ImageMagick.read(bytes,image=>check(!image.profileNames.includes('exif'),'EXIF conservado.'));
  const metrics={originalBytes:source.length,storedBytes:data.storedBytes,width:data.width,height:data.height,ahorroPorcentaje:Math.round((1-data.storedBytes/source.length)*100)};
  console.log(JSON.stringify({compresionRemota:'OK',lecturaPrivada:true,...metrics}));
  const tiny=ImageMagick.read(MagickColors.White,20,20,image=>image.write(MagickFormat.Jpeg,data=>Uint8Array.from(data)));
  stage='reintento sin duplicado';console.log('QA: comprobar reintento sin duplicado.');
  const retry=await invoke(body());check(retry.status===200&&retry.data.path===path&&retry.data.reused,'Reintento no idempotente.');
  stage='módulo ajeno';console.log('QA: comprobar módulo ajeno.');
  check((await invoke(body('loop',tiny))).status===403,'No bloqueó módulo ajeno.');
  stage='contenido falso';
  check((await invoke(body('generator',new TextEncoder().encode('<svg/>')))).status===400,'No rechazó contenido falso.');
  stage='subida directa';console.log('QA: comprobar bloqueo de subida directa.');
  const bypass=await client.storage.from('cer-evidence').upload('generator/'+id+'/'+nonce+'/bypass.jpg',tiny,{contentType:'image/jpeg'});
  check(bypass.error,'No bloqueó subida directa.');
  stage='anónimo';console.log('QA: comprobar acceso anónimo.');
  const noauth=await fetch(env.VITE_SUPABASE_URL+'/functions/v1/cer-evidence',{method:'POST',headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY},body:body('generator',tiny),signal:AbortSignal.timeout(15000)});
  check(noauth.status===401,'No bloqueó al anónimo.');
  console.log(JSON.stringify({resultado:'OK',originalBytes:source.length,storedBytes:data.storedBytes,width:data.width,height:data.height,ahorroPorcentaje:Math.round((1-data.storedBytes/source.length)*100),lecturaPrivada:true,reintentoSinDuplicado:true,moduloAjenoBloqueado:true,contenidoFalsoBloqueado:true,subidaDirectaBloqueada:true,anonimoBloqueado:true}));
}catch(error){console.log(JSON.stringify({resultado:'FALLO',fase:stage,mensaje:error.message}));process.exitCode=1;}
finally{
  let cleanup=true;
  await client.auth.signOut().catch(()=>{});
  if(path){const removed=await admin.storage.from('cer-evidence').remove([path]);cleanup&&=!removed.error;}
  if(id){try{query(`delete from public.cer_profiles where id='${id}'`);}catch{cleanup=false;}const removed=await admin.auth.admin.deleteUser(id);cleanup&&=!removed.error;}
  console.log(JSON.stringify({limpiezaDeDatosTecnicos:cleanup}));if(!cleanup){console.log(JSON.stringify({perfilTecnicoPendiente:id}));process.exitCode=1;}
}
