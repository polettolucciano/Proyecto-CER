import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// The VM stubs the bundled WASM loader; give that loader an explicit module URL
// because import.meta is unavailable in a VM script context.
const source=readFileSync('supabase/functions/cer-evidence/index.ts','utf8').replace(/^import .*;\n/gm,'').replaceAll('import.meta.url',JSON.stringify(new URL('../supabase/functions/cer-evidence/index.ts',import.meta.url).href));
const javascript=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const origin='https://proyecto-cer.vercel.app';
const actor='00000000-0000-4000-8000-000000000002',operation='00000000-0000-4000-8000-000000000005';
function service({signedIn=true,active=true,modules=['generator'],existing=false,catalogModules=[]}={}){
 let handler,decodes=0,uploads=0;
 const caller={auth:{getUser:async()=>({data:{user:signedIn?{id:actor}:null},error:signedIn?null:{}})},from:table=>({select:()=>({eq:(_key,id)=>({single:async()=>table==='cer_modules'?{data:catalogModules.includes(id)?{id}:null,error:null}:{data:{role:'Enfermería',active,modules},error:null}})})})};
 const storage={info:async()=>existing?{data:{size:12},error:null}:{error:{}},upload:async()=>{uploads++;return {error:null};}};
 const admin={storage:{from:()=>storage}};
 vm.runInNewContext(javascript,{Deno:{env:{get:key=>key==='SUPABASE_SERVICE_ROLE_KEY'?'server-only':key==='CER_APP_ORIGINS'?origin:'public'},readFile:async()=>new Uint8Array(),serve:fn=>{handler=fn;}},createClient:(_url,key)=>key==='server-only'?admin:caller,initializeImageEngine:async()=>{},optimizeImage:()=>{decodes++;return {bytes:new Uint8Array([1]),originalBytes:3,storedBytes:1,width:1,height:1};},MAX_INPUT_BYTES:5*1024*1024,TRANSFORM_VERSION:'webp-v1',Request,Response,File,Uint8Array,URL,crypto,console});
 return {invoke:(form,headers={},method='POST')=>handler(new Request(origin,{method,headers:{origin,...headers},...(method==='POST'?{body:form}:{})})),counts:()=>({decodes,uploads})};
}
function form({module='generator',operationId=operation,photoId='photo-1',type='image/jpeg',bytes=new Uint8Array([255,216,255])}={}){
 const data=new FormData();data.set('module',module);data.set('operationId',operationId);data.set('photoId',photoId);data.set('file',new Blob([bytes],{type}),'photo.jpg');return data;
}
test('fotos: rechaza anónimo, perfil desactivado y módulo ajeno antes de decodificar',async()=>{
 for(const options of [{signedIn:false},{active:false},{modules:['loop']}]){
  const s=service(options);assert.ok([401,403].includes((await s.invoke(form())).status));assert.deepEqual(s.counts(),{decodes:0,uploads:0});
 }
});
test('fotos: bloquea origen, método, MIME, ruta e identificadores manipulados',async()=>{
 const s=service();
 assert.equal((await s.invoke(form(),{origin:'https://attacker.example'})).status,403);
 assert.equal((await s.invoke(null,{},'GET')).status,405);
 for(const input of [{type:'image/svg+xml'},{photoId:'../../photo'},{operationId:'../operation'},{module:'unknown'}])assert.equal((await s.invoke(form(input))).status,400);
 assert.deepEqual(s.counts(),{decodes:0,uploads:0});
});
test('fotos: corta una carga mayor al límite antes de procesarla',async()=>{
 const s=service();assert.equal((await s.invoke(form({bytes:new Uint8Array(5*1024*1024+1)}))).status,400);assert.deepEqual(s.counts(),{decodes:0,uploads:0});
});
test('fotos: servidor define la ruta del actor; un reintento reutiliza el objeto',async()=>{
 const first=service(),response=await first.invoke(form());assert.equal(response.status,200);const result=await response.json();assert.ok(result.path.startsWith(`generator/${actor}/${operation}/photo-1-webp-v1-`));assert.deepEqual(first.counts(),{decodes:1,uploads:1});
 const retry=service({existing:true}),retried=await retry.invoke(form());assert.equal(retried.status,200);const reused=await retried.json();assert.equal(reused.path,result.path);assert.equal(reused.reused,true);assert.deepEqual(retry.counts(),{decodes:0,uploads:0});
});
test('fotos: módulos nuevos requieren acceso de perfil y existencia en catálogo antes de procesar',async()=>{
 const module='custom-00000000-0000-4000-8000-000000000004';
 const allowed=service({modules:[module],catalogModules:[module]});assert.equal((await allowed.invoke(form({module}))).status,200);
 const missing=service({modules:[module]});assert.equal((await missing.invoke(form({module}))).status,400);assert.equal(missing.counts().decodes,0);
 const forbidden=service({catalogModules:[module]});assert.equal((await forbidden.invoke(form({module}))).status,403);assert.equal(forbidden.counts().decodes,0);
});
