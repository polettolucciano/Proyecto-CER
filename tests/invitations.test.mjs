import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync('supabase/functions/cer-invite/index.ts','utf8').replace(/^import .*;\n/,'');
const javascript=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const origin='https://cer-preview.example.test';
const input={name:'Enfermería de prueba',email:'nurse@example.test',role:'Enfermería',modules:['generator']};
function service({signedIn=true,role='Administrador',active=true,conflicts=0,inviteFails=false,saveFails=false}={}){
 let handler,invitations=0,saves=0;
 const caller={auth:{getUser:async()=>({data:{user:signedIn?{id:'admin-id'}:null},error:signedIn?null:{}})},from:table=>({select:()=>({eq:()=>({single:async()=>({data:{role,active}})}),single:async()=>({data:{revision:1}})})}),rpc:async()=>{saves++;return {error:conflicts-- >0?{code:'PT409'}:saveFails?{code:'42501'}:null};}};
 const admin={auth:{admin:{inviteUserByEmail:async()=>{invitations++;return inviteFails?{error:{},data:{}}:{data:{user:{id:'nurse-id'}}};}}}};
 vm.runInNewContext(javascript,{Deno:{env:{get:key=>key==='APP_ORIGIN'?origin:key==='SUPABASE_SERVICE_ROLE_KEY'?'server-only':'public'},serve:fn=>{handler=fn;}},createClient:(_url,key)=>key==='server-only'?admin:caller,Request,Response,crypto});
 return {invoke:(body=input,extra={})=>handler(new Request(origin,{method:'POST',headers:{origin,...extra.headers},body:typeof body==='string'?body:JSON.stringify(body)})),counts:()=>({invitations,saves})};
}
test('invitaciones: exige identidad activa y rol administrador',async()=>{
 for(const config of [{signedIn:false},{role:'Enfermería'},{active:false}]){
  const s=service(config);assert.ok([401,403].includes((await s.invoke()).status));assert.equal(s.counts().invitations,0);
 }
});
test('invitaciones: valida JSON, módulos, correo y origen antes de enviar',async()=>{
 const s=service();
 for(const body of ['{', {...input,email:'invalid'}, {...input,modules:['unknown']}, {...input,name:'x'}])assert.equal((await s.invoke(body)).status,400);
 assert.equal((await s.invoke(input,{headers:{origin:'https://other.example'}})).status,403);
 assert.equal(s.counts().invitations,0);
});
test('invitaciones: un conflicto de revisión no vuelve a enviar el correo',async()=>{
 const s=service({conflicts:1});assert.equal((await s.invoke()).status,200);assert.deepEqual(s.counts(),{invitations:1,saves:2});
});
test('invitaciones: informa perfil incompleto sin simular éxito ni reinvitar',async()=>{
 const s=service({saveFails:true}),response=await s.invoke();assert.equal(response.status,409);assert.match((await response.json()).message,/perfil requiere completar/);assert.deepEqual(s.counts(),{invitations:1,saves:1});
});
