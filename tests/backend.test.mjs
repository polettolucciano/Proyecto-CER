import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const admin='00000000-0000-4000-8000-000000000001',nurse='00000000-0000-4000-8000-000000000002',inactive='00000000-0000-4000-8000-000000000003';
let db;
before(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.objects(bucket_id text,name text);create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261026194345_cer_backend.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261026194621_cer_storage.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261027034907_evidence_optimization.sql',import.meta.url),'utf8'));
 await db.query(`insert into auth.users values($1,'admin@example.test'),($2,'nurse@example.test'),($3,'inactive@example.test')`,[admin,nurse,inactive]);
 await db.query(`insert into cer_profiles(id,name,email,role,modules,active) values($1,'Admin','admin@example.test','Administrador','{}',true),($2,'Nurse','nurse@example.test','Enfermería',array['generator'],true),($3,'Inactive','inactive@example.test','Enfermería',array['generator'],false)`,[admin,nurse,inactive]);
});
after(async()=>{await db?.close();});
async function asUser(id,sql,params=[]){await db.exec('begin;set local role authenticated;');try{await db.query(`select set_config('request.jwt.claim.sub',$1,true)`,[id]);const result=await db.query(sql,params);await db.exec('commit');return result.rows;}catch(e){await db.exec('rollback');throw e;}}
async function apply(id,commands,{op=crypto.randomUUID(),revision}={}){if(revision===undefined)revision=(await db.query('select revision from cer_settings')).rows[0].revision;return asUser(id,'select cer_apply_changes($1,$2,$3::jsonb) as revision',[op,revision,JSON.stringify(commands)]);}
const equipment=(id,module)=>({kind:'equipment',data:{id,module,code:id,name:id,location:'Sala',status:'Operativo',model:'',serial:''}});
const values={radiator:'OK',oil:'OK',fuel:'OK',filters:'OK',battery:'OK',leaks:'OK',board:'OK',transfer:'OK',hours:'10',voltage:'13',pressure:'60',frequency:'50',tension:'220'};
const record=(id,extra={})=>({kind:'record',data:{id,module:'generator',equipmentId:'GE',date:'2026-01-31',result:'ok',values,notes:'',photos:[],...extra}});
test('administrador crea equipo; enfermería no puede administrar ni escalar rol',async()=>{
 await apply(admin,[equipment('GE','generator'),equipment('LOOP','loop')]);
 assert.equal((await asUser(nurse,'select * from cer_equipment')).length,1);
 await assert.rejects(()=>apply(nurse,[equipment('BAD','generator')]),/ADMIN_REQUIRED/);
 await assert.rejects(()=>asUser(nurse,`update cer_profiles set role='Administrador' where id=$1`,[nurse]),/permission denied/);
 assert.equal((await asUser(inactive,'select * from cer_equipment')).length,0);
});
test('valida campos y autoría en servidor; conserva valores fuera de referencia',async()=>{
 await assert.rejects(()=>apply(nurse,[record('missing',{values:{}})]),/REQUIRED_FIELD/);
 await assert.rejects(()=>apply(nurse,[record('negative',{values:{...values,voltage:'-1'}})]),/INVALID_NUMBER/);
 await apply(nurse,[record('r1',{userId:admin,values:{...values,voltage:'100'}})]);
 const rows=await asUser(nurse,`select user_id,values->>'voltage' voltage from cer_records where id='r1'`);
 assert.equal(rows[0].user_id,nurse);assert.equal(rows[0].voltage,'100');
 await assert.rejects(()=>apply(nurse,[{...record('forbidden'),data:{...record('forbidden').data,module:'loop',equipmentId:'LOOP'}}]),/MODULE_FORBIDDEN/);
});
test('idempotencia, duplicados y conflicto optimista',async()=>{
 const cmd=[{...record('r2'),duplicateApproved:true}],op=crypto.randomUUID();const rev=(await db.query('select revision from cer_settings')).rows[0].revision;
 const a=await apply(nurse,cmd,{op,revision:rev});const b=await apply(nurse,cmd,{op,revision:rev});assert.deepEqual(a,b);
 await assert.rejects(()=>apply(nurse,[record('r3')]),/DUPLICATE_CONFIRMATION_REQUIRED/);
 await assert.rejects(()=>apply(admin,[equipment('CONFLICT','generator')],{revision:rev}),/VERSION_CONFLICT/);
 assert.equal((await db.query(`select count(*)::int n from cer_records where id='r2'`)).rows[0].n,1);
});
test('rectificar y anular preserva originales; enfermería no puede rectificar',async()=>{
 const correction={...record('r1-rev2',{supersedesId:'r1'}),duplicateApproved:true};
 await assert.rejects(()=>apply(nurse,[correction]),/ADMIN_REQUIRED/);
 // Una revisión conserva el contrato original aunque cambie el catálogo.
 const original=(await db.query(`select definition from cer_modules where id='generator'`)).rows[0].definition;
 const changed=structuredClone(original);changed.sections[0].fields.push({id:'new-field',label:'Nuevo campo',type:'text'});
 await db.query(`update cer_modules set definition=$1 where id='generator'`,[JSON.stringify(changed)]);
 await apply(admin,[correction]);
 assert.deepEqual((await db.query(`select form_definition from cer_records where id='r1-rev2'`)).rows[0].form_definition,original);
 await db.query(`update cer_modules set definition=$1 where id='generator'`,[JSON.stringify(original)]);
 assert.equal((await db.query(`select status from cer_records where id='r1'`)).rows[0].status,'superseded');
 await apply(admin,[{kind:'void',data:{id:'r1-rev2',voidReason:'Prueba de anulación con historial'}}]);
 assert.equal((await db.query(`select count(*)::int n from cer_records where id in ('r1','r1-rev2')`)).rows[0].n,2);
 await assert.rejects(()=>asUser(admin,`delete from cer_records where id='r1'`),/permission denied/);
});
test('rechaza configuraciones incompletas sin modificar la revisión',async()=>{
 const revision=(await db.query('select revision from cer_settings')).rows[0].revision;
 await assert.rejects(()=>apply(admin,[{kind:'settings',data:{}}]),/INVALID_SETTINGS/);
 assert.equal((await db.query('select revision from cer_settings')).rows[0].revision,revision);
});
test('avance mensual, año bisiesto y rollback de regla no confirmada',async()=>{
 const task={id:'t1',module:'generator',equipmentId:'GE',assignedTo:nurse,frequency:'Mensual',due:'2026-01-31',active:true,title:'Mensual',notes:''};
 await apply(admin,[{kind:'task',data:task}]);
 await assert.rejects(()=>apply(nurse,[{...record('unconfirmed',{taskId:'t1',date:'2026-02-01'}),duplicateApproved:true}]),/RECURRENCE_RULE_REQUIRED/);
 assert.equal((await db.query(`select count(*)::int n from cer_records where id='unconfirmed'`)).rows[0].n,0);
 await apply(admin,[{kind:'task',data:{...task,scheduleBasis:'planned'}}]);
 await apply(nurse,[record('completed',{taskId:'t1',date:'2026-02-01'})]);
 assert.equal(String((await db.query(`select due::text d from cer_tasks where id='t1'`)).rows[0].d),'2026-02-28');
 assert.equal((await db.query(`select cer_private.next_due('2028-01-31','Mensual',31)::text d`)).rows[0].d,'2028-02-29');
 assert.equal((await db.query(`select cer_private.next_due('2026-02-28','Mensual',31)::text d`)).rows[0].d,'2026-03-31');
});
test('biblioteca pública solo publica material publicado',async()=>{
 for(const published of [true,false])await apply(admin,[{kind:'training',data:{id:`material-${published}`,title:'CER',url:'https://example.test',type:'Documento',published}}]);
 assert.equal((await asUser(nurse,'select * from cer_training')).length,1);
 assert.equal((await asUser(inactive,'select * from cer_training')).length,1);
 await db.exec('begin;set local role anon;');try{const rows=await db.query('select * from cer_training');assert.equal(rows.rows.length,1);await assert.rejects(()=>db.query('select * from cer_records'),/permission denied/);}finally{await db.exec('rollback');}
});
test('Storage: bucket privado, aislamiento de módulo y sin borrado de evidencia histórica',async()=>{
 const path=`generator/${nurse}/operation/photo.jpg`;
 await assert.rejects(()=>asUser(nurse,'insert into storage.objects values($1,$2)',['cer-evidence',path]),/row-level security/);
 // La función de backend guarda el resultado con credenciales de servidor.
 await db.query('insert into storage.objects values($1,$2)',['cer-evidence',path]);
 await assert.rejects(()=>asUser(nurse,'insert into storage.objects values($1,$2)',['cer-evidence',`loop/${nurse}/photo.jpg`]),/row-level security/);
 await db.query('insert into cer_attachments(record_id,path,name,mime) values($1,$2,$3,$4)',['r1',path,'photo.jpg','image/jpeg']);
 const deleted=await asUser(nurse,'delete from storage.objects where name=$1 returning name',[path]);assert.equal(deleted.length,0);
 const bucket=(await db.query(`select public from storage.buckets where id='cer-evidence'`)).rows[0];assert.equal(bucket.public,false);
});
