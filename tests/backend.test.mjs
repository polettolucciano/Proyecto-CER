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
 await db.exec(await readFile(new URL('../supabase/migrations/20261028231130_conflict_http_status.sql',import.meta.url),'utf8'));
 await db.exec("create function public.rls_auto_enable() returns event_trigger language plpgsql security definer as $$begin end$$;");
 await db.exec(await readFile(new URL('../supabase/migrations/20261102194118_security_validation.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261105174159_maintenance_administration.sql',import.meta.url),'utf8'));
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
 await assert.rejects(()=>apply(admin,[equipment('CONFLICT','generator')],{revision:rev}),error=>error.code==='PT409' && /VERSION_CONFLICT/.test(error.message));
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

test('rechaza resultados desconocidos en lugar de convertirlos silenciosamente en Conforme',async()=>{
 for(const result of ['inventado',null,'',false])await assert.rejects(()=>apply(nurse,[record('invalid-result-'+String(result),{date:'2026-03-01',result})]),/INVALID_RESULT/);
});
test('nadie puede borrar directamente una foto propia que puede estar vinculándose a un registro',async()=>{
 const path=`generator/${nurse}/pending/photo.webp`;
 await db.query('insert into storage.objects values($1,$2)',['cer-evidence',path]);
 const rows=await asUser(nurse,'delete from storage.objects where name=$1 returning name',[path]);
 assert.equal(rows.length,0);
});
test('una operación inválida revierte también los cambios anteriores del mismo lote',async()=>{
 const revision=(await db.query('select revision from cer_settings')).rows[0].revision;
 await assert.rejects(()=>apply(admin,[equipment('ROLLBACK-ME','generator'),record('bad-batch',{values:{}})]),/REQUIRED_FIELD/);
 assert.equal((await db.query("select count(*)::int n from cer_equipment where id='ROLLBACK-ME'")).rows[0].n,0);
 assert.equal((await db.query('select revision from cer_settings')).rows[0].revision,revision);
});
test('no permite reutilizar una operación para cambiar su contenido',async()=>{
 const op=crypto.randomUUID();
 await apply(admin,[equipment('IDEMPOTENT','generator')],{op});
 await assert.rejects(()=>apply(admin,[equipment('OTHER','generator')],{op}),/IDEMPOTENCY_MISMATCH/);
});
test('rechaza evidencia ajena y no permite falsificar ni borrar la auditoría',async()=>{
 const path=`generator/${admin}/foreign/photo.webp`;
 await db.query('insert into storage.objects values($1,$2)',['cer-evidence',path]);
 await assert.rejects(()=>apply(nurse,[record('stolen-photo',{date:'2026-04-01',photos:[{storagePath:path,name:'photo.webp',type:'image/webp'}]})]),/INVALID_ATTACHMENT/);
 for(const sql of ["insert into cer_audit_events(actor_id,action,entity_id,entity_type,summary) values('"+nurse+"','fake','fake','fake','fake')",'delete from cer_audit_events',"update cer_audit_events set summary='fake'"])await assert.rejects(()=>asUser(nurse,sql),/permission denied/);
});
test('revocar el perfil bloquea también escrituras con una sesión previamente válida',async()=>{
 await db.query('update cer_profiles set active=false where id=$1',[nurse]);
 await assert.rejects(()=>apply(nurse,[record('after-revocation',{date:'2026-04-02'})]),/AUTH_REQUIRED/);
 assert.equal((await asUser(nurse,'select * from cer_records')).length,0);
 await db.query('update cer_profiles set active=true where id=$1',[nurse]);
});
test('rechaza lotes excesivos, comandos nulos y adjuntos mal formados sin escribir',async()=>{
 for(const commands of [[],Array(51).fill(record('too-many')),[null],[{kind:'unknown',data:{id:'bad'}}]])await assert.rejects(()=>apply(nurse,commands),/INVALID_/);
 await assert.rejects(()=>apply(nurse,[record('bad-photos',{date:'2026-04-03',photos:{}})]));
});
test('los metadatos de equipos y tareas no admiten objetos que puedan convertirse en fórmulas o romper la interfaz',async()=>{
 const poisoned={formula:'HYPERLINK("https://attacker.example","abrir")'};
 for(const key of ['name','location','model','serial','code'])await assert.rejects(()=>apply(admin,[{kind:'equipment',data:{...equipment('POISON-'+key,'generator').data,[key]:poisoned}}]),/INVALID_EQUIPMENT/);
 const task={kind:'task',data:{id:'poison-task',module:'generator',equipmentId:'GE',assignedTo:nurse,frequency:'Única',due:'2026-05-01',active:true,title:poisoned,notes:''}};
 await assert.rejects(()=>apply(admin,[task]),/INVALID_TASK/);
 await assert.rejects(()=>apply(admin,[{...task,data:{...task.data,title:'Título válido',notes:poisoned}}]),/INVALID_TASK/);
 await assert.rejects(()=>apply(admin,[{kind:'training',data:{id:'poison-training',title:poisoned,url:'https://example.test',type:'Documento',published:true}}]),/INVALID_TRAINING/);
});
test('la función automática de RLS conserva su dueño pero no se ofrece como RPC a usuarios',async()=>{
 const [permissions]=(await db.query("select has_function_privilege('anon','public.rls_auto_enable()','EXECUTE') anonymous,has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE') signedin,has_function_privilege(current_user,'public.rls_auto_enable()','EXECUTE') owner")).rows;
 assert.equal(permissions.anonymous,false);assert.equal(permissions.signedin,false);assert.equal(permissions.owner,true);
});
const customModule='custom-00000000-0000-4000-8000-000000000004';
const operator='00000000-0000-4000-8000-000000000004';
test('módulos: solo admin crea, plantilla validada y responsable con acceso al módulo',async()=>{
 const command={kind:'module',data:{id:customModule,name:'Climatización de prueba',description:'Mantenimiento general',frequency:'Mensual',sections:[],responsibleId:admin}};
 await assert.rejects(()=>apply(nurse,[command]),/ADMIN_REQUIRED/);
 await apply(admin,[command]);
 const saved=(await db.query('select definition from cer_modules where id=$1',[customModule])).rows[0].definition;
 assert.equal(saved.name,command.data.name);assert.ok(saved.sections.flatMap(section=>section.fields).some(field=>field.id==='work' && !field.optional));
 await assert.rejects(()=>apply(admin,[{...command,data:{...command.data,responsibleId:nurse}}]),/INVALID_ASSIGNEE/);
 const workspace=(await asUser(admin,'select cer_workspace() data'))[0].data;assert.ok(workspace.modules.some(module=>module.id===customModule));
 await db.query('insert into auth.users values($1,$2)',[operator,'operator@example.test']);
 await apply(admin,[{kind:'profile',data:{id:operator,name:'Técnico nombrado',role:'Operador',modules:[customModule],active:true}}]);
 await apply(admin,[{...command,data:{...command.data,responsibleId:operator}},{kind:'equipment',data:{...equipment('CUSTOM-EQ',customModule).data,responsibleId:operator}}]);
 assert.equal((await asUser(operator,'select id from cer_equipment')).length,1);
 await assert.rejects(()=>apply(admin,[{kind:'profile',data:{id:operator,name:'Técnico nombrado',role:'Operador',modules:['unknown'],active:true}}]),/INVALID_MODULE/);
});
test('cancelaciones: una fecha mantiene recurrencia, autoría, idempotencia y registros previos',async()=>{
 const task={id:'cancel-monthly',title:'Control custom mensual',module:customModule,equipmentId:'CUSTOM-EQ',assignedTo:operator,frequency:'Mensual',due:'2026-01-31',scheduleBasis:'planned',active:true,notes:''};
 await apply(admin,[{kind:'task',data:task}]);
 const cancellation={kind:'cancel-task',data:{id:task.id,date:'2026-01-31',scope:'date',reason:'Equipo fuera de servicio'}};
 await assert.rejects(()=>apply(operator,[cancellation]),/ADMIN_REQUIRED/);
 const op=crypto.randomUUID(),revision=(await db.query('select revision from cer_settings')).rows[0].revision;
 await apply(admin,[cancellation],{op,revision});await apply(admin,[cancellation],{op,revision});
 let saved=(await db.query('select due::text due,data from cer_tasks where id=$1',[task.id])).rows[0];
 assert.equal(saved.due,'2026-02-28');assert.equal(saved.data.cancellations.length,1);assert.equal(saved.data.cancellations[0].cancelledBy,admin);
 await apply(admin,[{kind:'cancel-task',data:{id:task.id,date:'2026-03-31',scope:'date',reason:'Servicio no disponible ese día'}}]);
 const genericRecord=(id,date)=>record(id,{module:customModule,equipmentId:'CUSTOM-EQ',taskId:task.id,date,values:{work:'Control realizado'},userId:admin});
 await assert.rejects(()=>apply(operator,[genericRecord('cancelled-date-record','2026-01-31')]),/CONTROL_CANCELLED/);
 await apply(operator,[genericRecord('custom-completed','2026-02-28')]);
 saved=(await db.query('select due::text due,data from cer_tasks where id=$1',[task.id])).rows[0];assert.equal(saved.due,'2026-04-30');
 assert.equal((await db.query("select user_id from cer_records where id='custom-completed'")).rows[0].user_id,operator);
 await assert.rejects(()=>apply(admin,[{kind:'task',data:{...task,due:saved.due,cancellations:[]}}]),/INVALID_CANCELLATION_HISTORY/);
 await apply(admin,[{kind:'cancel-task',data:{id:task.id,date:'2026-04-30',scope:'series',reason:'Retiro definitivo de la programación'}}]);
 saved=(await db.query('select data from cer_tasks where id=$1',[task.id])).rows[0];assert.equal(saved.data.active,false);
 assert.equal((await db.query("select count(*)::int n from cer_records where id='custom-completed'")).rows[0].n,1);
 assert.equal((await db.query("select count(*)::int n from cer_audit_events where entity_id=$1 and action='task.cancelled'",[task.id])).rows[0].n,3);
});
