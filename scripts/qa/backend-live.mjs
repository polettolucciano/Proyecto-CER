// Explicit integration test, restricted to the known empty CER project.
// Credentials remain in memory. No email is sent and all fixtures are removed.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {loadEnv} from 'vite';
import {createClient} from '@supabase/supabase-js';

if(process.argv[2]!=='--run')throw Error('Usar --run para crear y limpiar datos técnicos en CER vacío.');
const project='pnqsvmtmkceznoswpgfz',cli='./node_modules/.bin/supabase';
const env=loadEnv('development',process.cwd(),'VITE_');
assert.equal(new URL(env.VITE_SUPABASE_URL).hostname,project+'.supabase.co');
assert.equal(readFileSync('supabase/.temp/project-ref','utf8').trim(),project);
const run=args=>execFileSync(cli,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:45000});
function query(sql){const result=JSON.parse(run(['db','query','--linked',sql]));return result.rows;}
assert.equal(Number(query('select count(*)::int n from public.cer_profiles')[0].n),0,'Se requiere un proyecto sin perfiles operativos; no probar sobre datos reales.');
const keys=JSON.parse(run(['projects','api-keys','--project-ref',project,'--reveal','--output','json']));
const secret=(keys.find(k=>k.type==='secret')??keys.find(k=>k.name==='service_role'))?.api_key;
assert.ok(secret,'Falta acceso administrativo a la infraestructura.');
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(45000)})}};
const client=()=>createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,options);
const infrastructure=createClient(env.VITE_SUPABASE_URL,secret,options);
const nonce=randomUUID(),prefix='qa-'+nonce,accounts=[],clients=[];
const report={project,executedAt:new Date().toISOString(),environment:'real-supabase-synthetic-fixtures',checks:{}};
let stage='setup';
const checks=report.checks;
const fields={radiator:'OK',oil:'OK',fuel:'OK',filters:'OK',battery:'OK',leaks:'OK',board:'OK',transfer:'OK',hours:'1',voltage:'13',pressure:'60',frequency:'50',tension:'220'};
const equipment=(suffix,module)=>({kind:'equipment',data:{id:prefix+suffix,module,code:'QA-'+nonce.slice(0,8)+suffix,name:'Equipo técnico temporal',location:'Pruebas',model:'Sintético',serial:'',status:'Operativo'}});
async function workspace(c){const result=await c.rpc('cer_workspace');assert.ifError(result.error);return result.data;}
async function apply(c,commands,revision,op=randomUUID()){
 return c.rpc('cer_apply_changes',{p_operation_id:op,p_expected_revision:revision??(await workspace(c)).serverRevision,p_commands:commands});
}
const record=(id,extra={})=>({kind:'record',data:{id:prefix+id,module:'generator',equipmentId:prefix+'-ge',date:'2026-01-31',values:fields,result:'ok',notes:'Fixture técnica, sin datos clínicos.',photos:[],...extra}});
try{
 for(const [role,modules] of [['Administrador',[]],['Enfermería',['generator','osmosis','loop','crash','fumigation','electrical','rooms','general']],['Enfermería',['loop']]]){
  const email=`cer-backend-qa-${randomUUID()}@example.com`,password=randomUUID()+randomUUID();
  const created=await infrastructure.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(created.error);
  const id=created.data.user.id;assert.match(id,/^[0-9a-f-]{36}$/);accounts.push(id);
  query(`insert into public.cer_profiles(id,name,email,role,modules,active) values('${id}','Prueba técnica CER','${email}','${role}',array[${modules.map(m=>`'${m}'`).join(',')}]::text[],true)`);
  const c=client();clients.push(c);assert.ifError((await c.auth.signInWithPassword({email,password})).error);
 }
 const [admin,nurse,restricted]=clients;
 checks.login=true;
 stage='equipos y permisos';
 assert.ifError((await apply(admin,[equipment('-ge','generator'),equipment('-lp','loop')])).error);
 assert.equal((await workspace(nurse)).equipment.length,2);
 assert.equal((await workspace(restricted)).equipment.length,1);
 assert.match((await apply(nurse,[equipment('-forbidden','generator')])).error?.message??'',/ADMIN_REQUIRED/);
 const escalation=await nurse.from('cer_profiles').update({role:'Administrador'}).eq('id',accounts[1]);assert.ok(escalation.error);
 checks.equipmentPersistence=true;checks.rlsAndAdministrativePermissions=true;
 if(process.argv.includes('--security')){
  stage='validación adversarial remota';
  for(const result of ['unknown',null,false])assert.match((await apply(nurse,[record('-invalid-result-'+String(result),{result,date:'2026-03-01'})])).error?.message??'',/INVALID_RESULT/);
  assert.match((await apply(admin,[{kind:'equipment',data:{...equipment('-poison','generator').data,name:{formula:'1+1'}}}])).error?.message??'',/INVALID_EQUIPMENT/);
  assert.match((await apply(nurse,[record('-invalid-photo',{photos:{},date:'2026-03-02'})])).error?.message??'',/INVALID_ATTACHMENTS/);
  const [permissions]=query("select not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='cer_evidence_cleanup') cleanup_blocked, not has_function_privilege('anon','public.rls_auto_enable()','EXECUTE') helper_anon_blocked, not has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE') helper_user_blocked");
  assert.equal(permissions.cleanup_blocked,true);assert.equal(permissions.helper_anon_blocked,true);assert.equal(permissions.helper_user_blocked,true);
  checks.adversarialInputValidation=true;checks.storageCleanupRestricted=true;checks.platformHelperPrivilegesRestricted=true;
 }
 stage='tarea y autoría';
 const task={kind:'task',data:{id:prefix+'-task',module:'generator',equipmentId:prefix+'-ge',assignedTo:accounts[1],frequency:'Mensual',due:'2026-01-31',scheduleBasis:'planned',title:'Prueba mensual',active:true,notes:''}};
 assert.ifError((await apply(admin,[task])).error);
 assert.match((await apply(nurse,[record('-invalid',{values:{}})])).error?.message??'',/REQUIRED_FIELD/);
 assert.equal((await workspace(nurse)).records.length,0);
 const done=record('-r1',{taskId:task.data.id,userId:accounts[0],createdAt:'1999-01-01T00:00:00Z'}),op=randomUUID(),rev=(await workspace(nurse)).serverRevision;
 const saved=await apply(nurse,[done],rev,op);assert.ifError(saved.error);
 assert.ifError((await apply(nurse,[done],rev,op)).error);
 let current=await workspace(nurse);
 assert.equal(current.records.length,1);assert.equal(current.records[0].userId,accounts[1]);assert.ok(current.records[0].createdAt>'2026-01-01');
 assert.equal(current.tasks[0].due,'2026-02-28');
 assert.equal((await workspace(restricted)).records.length,0);
 const auth=await nurse.auth.getSession();const second=client();clients.push(second);
 assert.ifError((await second.auth.setSession({access_token:auth.data.session.access_token,refresh_token:auth.data.session.refresh_token})).error);
 assert.equal((await workspace(second)).records[0].id,done.data.id);
 checks.serverOwnedAuthorshipAndTime=true;checks.crossSessionPersistence=true;checks.requiredFieldsAndRollback=true;checks.monthlyDueDate=true;checks.idempotency=true;
 stage='concurrencia';
 if(process.argv.includes('--skip-concurrency'))checks.concurrentWrites='PENDING_REMOTE_MIGRATION';
 else {
 const sameRevision=current.serverRevision;
 // Exercise two HTTP requests directly, independently of auth client locks.
 // Both carry the exact same expected revision; only one may commit.
 const race=async suffix=>{
  const started=Date.now();
  const response=await fetch(env.VITE_SUPABASE_URL+'/rest/v1/rpc/cer_apply_changes',{method:'POST',headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+auth.data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({p_operation_id:randomUUID(),p_expected_revision:sameRevision,p_commands:[record(suffix,{date:suffix.endsWith('1')?'2026-02-02':'2026-02-03'})]}),signal:AbortSignal.timeout(30000)});
  const body=await response.json();console.log(JSON.stringify({stage:'concurrency',status:response.status,code:response.ok?undefined:body.code,durationMs:Date.now()-started}));
  return {error:response.ok?null:body};
 };
 const [a,b]=await Promise.all([race('-race1'),race('-race2')]);
 assert.equal([a,b].filter(x=>!x.error).length,1);
 assert.match([a,b].find(x=>x.error).error.message,/VERSION_CONFLICT/);
 checks.concurrentWritesNoOverwrite=true;
 }
 stage='historial y rectificación';
 assert.ifError((await apply(admin,[{...task,data:{...task.data,title:'Planificación actualizada',due:'2026-03-31'}}])).error);
 assert.ok((await workspace(nurse)).records.some(r=>r.id===done.data.id));
 const correction={...record('-r2',{taskId:task.data.id,supersedesId:done.data.id}),duplicateApproved:true};
 assert.match((await apply(nurse,[correction])).error?.message??'',/ADMIN_REQUIRED/);
 assert.ifError((await apply(admin,[correction])).error);
 assert.ifError((await apply(admin,[{kind:'void',data:{id:correction.data.id,voidReason:'Anulación de prueba técnica con historial.'}}])).error);
 current=await workspace(admin);
 assert.equal(current.records.find(r=>r.id===done.data.id).status,'superseded');
 assert.equal(current.records.find(r=>r.id===correction.data.id).status,'voided');
 assert.ok(current.auditEvents.some(e=>e.action==='record.corrected'));
 assert.ok((await nurse.from('cer_records').delete().eq('id',done.data.id)).error);
 checks.historySurvivesPlanningEdits=true;checks.correctionsAndVoidsPreserveOriginals=true;checks.noDirectDeletion=true;checks.auditTrail=true;
 stage='revocación y cierre';
 assert.ifError((await apply(admin,[{kind:'profile',data:{id:accounts[2],name:'Prueba desactivada',role:'Enfermería',modules:['loop'],active:false}}])).error);
 assert.equal((await workspace(restricted)),null);
 assert.ifError((await nurse.auth.signOut()).error);
 assert.ok((await nurse.rpc('cer_workspace')).error);
 checks.deactivatedProfileBlocked=true;checks.logoutAndAnonymousBlocked=true;
 report.result=process.argv.includes('--skip-concurrency')?'PARTIAL':'OK';
}catch(error){report.result='FAIL';report.failedStage=stage;report.message=error.message;process.exitCode=1;}
finally{
 // Only fixture IDs, never a bulk reset. Delete in dependency order and revoke
 // the technical sessions before removing their temporary infrastructure rows.
 let clean=true;
 for(const c of clients)await c.auth.signOut().catch(()=>{});
 if(accounts.length){
  const ids=accounts.map(id=>`'${id}'`).join(',');
  try{query(`begin; delete from public.cer_attachments where record_id like '${prefix}%'; update public.cer_records set supersedes_id=null,superseded_by_id=null where id like '${prefix}%'; delete from public.cer_records where id like '${prefix}%'; delete from public.cer_tasks where id like '${prefix}%'; delete from public.cer_equipment where id like '${prefix}%'; delete from public.cer_audit_events where actor_id in (${ids}); delete from cer_private.operations where actor_id in (${ids}); delete from public.cer_profiles where id in (${ids}); commit;`);}catch{clean=false;}
  for(const id of accounts){const removed=await infrastructure.auth.admin.deleteUser(id);if(removed.error)clean=false;}
 }
 checks.temporaryDataCleaned=clean;if(!clean){process.exitCode=1;report.result='FAIL';}
 writeFileSync(process.argv.includes('--security')?'docs/evidence/backend-security-live.json':'docs/evidence/backend-live.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
