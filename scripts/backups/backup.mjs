import {mkdtemp,writeFile,readFile,stat,copyFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {rotationCandidates,staleBackup,assertRestoreTarget} from './policy.mjs';
const mode=process.argv[2]??'generate';
const temporaryDirectories=[];
const required=name=>{const value=process.env[name];if(!value)throw new Error(`Falta ${name}`);return value;};
// Nunca imprimir argumentos: pueden incluir la URL con contraseña.
function run(command,args,{capture=false,cwd}={}) {return new Promise((ok,fail)=>{const child=spawn(command,args,{cwd,env:process.env,stdio:['ignore',capture?'pipe':'ignore','ignore']});let text='';if(capture)child.stdout.on('data',b=>text+=b);child.on('error',()=>fail(new Error(`No se pudo ejecutar ${command}.`)));child.on('exit',code=>code===0?ok(text):fail(new Error(`Falló ${command}. Revisá la configuración; no se eliminaron respaldos.`)));});}
async function hash(file){const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');}
const remotePath=(folder,name)=>`${required('CER_BACKUP_REMOTE').replace(/\/$/,'')}/${folder}/${name}`;
async function remoteHash(path){return new Promise((ok,fail)=>{const h=createHash('sha256'),child=spawn('rclone',['cat',path],{stdio:['ignore','pipe','ignore']});child.stdout.on('data',b=>h.update(b));child.on('error',()=>fail(new Error('No se pudo verificar el objeto remoto.')));child.on('exit',code=>code===0?ok(h.digest('hex')):fail(new Error('Falló la verificación remota.')));});}
async function manifests(folder='Diarios'){
 let files;try{files=JSON.parse(await run('rclone',['lsjson',remotePath(folder,'')],{capture:true}));}catch{throw new Error('No se pudo listar el destino.');}
 const result=[];for(const f of files.filter(f=>/^CER-\d{8}T\d{6}Z\.json$/.test(f.Name))){const m=JSON.parse(await run('rclone',['cat',remotePath(folder,f.Name)],{capture:true}));result.push({...m,manifest:f.Name});}return result;
}
async function generate(){
 const db=required('CER_BACKUP_DATABASE_URL'),recipient=required('CER_BACKUP_AGE_RECIPIENT');
 const dir=await mkdtemp(join(tmpdir(),'cer-backup-')),createdAt=new Date().toISOString(),stamp=createdAt.replace(/[-:]/g,'').slice(0,15)+'Z';
 temporaryDirectories.push(dir);
 const cli=resolve('node_modules/.bin/supabase');
 await run(cli,['db','dump','--db-url',db,'--role-only','-f',join(dir,'roles.sql')]);
 await run(cli,['db','dump','--db-url',db,'-f',join(dir,'schema.sql')]);
 await run(cli,['db','dump','--db-url',db,'--data-only','--use-copy','-x','storage.buckets_vectors,storage.vector_indexes','-f',join(dir,'data.sql')]);
 await run(cli,['db','dump','--db-url',db,'--schema','supabase_migrations','-f',join(dir,'history_schema.sql')]);
 await run(cli,['db','dump','--db-url',db,'--schema','supabase_migrations','--data-only','--use-copy','-f',join(dir,'history_data.sql')]);
 await copyFile('supabase/migrations/20261026194621_cer_storage.sql',join(dir,'storage_policies.sql'));
 const checks={};for(const name of await readdir(dir)){if((await stat(join(dir,name))).size<10)throw new Error('Dump vacío o incompleto.');checks[name]=await hash(join(dir,name));}
 await writeFile(join(dir,'checksums.json'),JSON.stringify(checks));
 const archive=join(dir,'backup.tar.gz');await run('tar',['-czf',archive,'-C',dir,...Object.keys(checks),'checksums.json']);await run('tar',['-tzf',archive],{capture:true});
 const name=`CER-${stamp}.tar.gz.age`,file=join(dir,name);await run('age',['-r',recipient,'-o',file,archive]);
 const encryptedHash=await hash(file),size=(await stat(file)).size;
 const destination=remotePath('Diarios',name);await run('rclone',['copyto',file,destination,'--immutable']);
 if(await remoteHash(destination)!==encryptedHash)throw new Error('El respaldo remoto no coincide. No se rotarán copias.');
 const report={name,createdAt,size,sha256:encryptedHash,verified:true,verification:'archive-structure-and-remote-hash',source:required('CER_SOURCE_PROJECT_REF'),storageIncluded:false};
 const manifest=`CER-${stamp}.json`,manifestFile=join(dir,manifest);await writeFile(manifestFile,JSON.stringify(report,null,2));
 await run('rclone',['copyto',manifestFile,remotePath('Diarios',manifest),'--immutable']);
 if(createdAt.slice(8,10)==='01'){await run('rclone',['copyto',file,remotePath('Mensuales',name),'--immutable']);if(await remoteHash(remotePath('Mensuales',name))!==encryptedHash)throw new Error('No se pudo verificar la copia mensual.');await run('rclone',['copyto',manifestFile,remotePath('Mensuales',manifest),'--immutable']);}
 console.log(JSON.stringify(report));
}
async function rotate(){
 const daily=await manifests();const candidates=rotationCandidates(daily);
 // Borrado separado, con precondiciones: solo nombres generados y copia nueva re-verificada.
 const newest=daily.filter(f=>f.verified===true && /^CER-\d{8}T\d{6}Z\.tar\.gz\.age$/.test(f.name)).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];
 if(await remoteHash(remotePath('Diarios',newest.name))!==newest.sha256)throw new Error('La última copia dejó de estar íntegra.');
 for(const f of candidates){await run('rclone',['deletefile',remotePath('Diarios',f.name)]);await run('rclone',['deletefile',remotePath('Diarios',f.manifest)]);}
 const monthly=(await manifests('Mensuales')).filter(m=>m.verified===true).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
 if(monthly.length>12 && await remoteHash(remotePath('Mensuales',monthly[0].name))===monthly[0].sha256){for(const f of monthly.slice(12)){if(!/^CER-\d{8}T\d{6}Z\.tar\.gz\.age$/.test(f.name))throw new Error('Nombre mensual no válido.');await run('rclone',['deletefile',remotePath('Mensuales',f.name)]);await run('rclone',['deletefile',remotePath('Mensuales',f.manifest)]);}}
 console.log('Rotación completada.');
}
async function restore(){
 const target=required('CER_RESTORE_DATABASE_URL');assertRestoreTarget(target,required('CER_BACKUP_DATABASE_URL'),required('CER_RESTORE_TEST_HOST'));
 if(required('CER_RESTORE_CONFIRM')!=='cer-test-only')throw new Error('Confirmación de entorno de pruebas requerida.');
 const file=resolve(required('CER_RESTORE_FILE')),manifest=JSON.parse(await readFile(required('CER_RESTORE_MANIFEST'),'utf8'));
 if(await hash(file)!==manifest.sha256)throw new Error('El archivo no coincide con su manifiesto.');
 const dir=await mkdtemp(join(tmpdir(),'cer-restore-')),archive=join(dir,'backup.tar.gz');
 temporaryDirectories.push(dir);
 await run('age',['--decrypt','-i',required('CER_RESTORE_AGE_IDENTITY'),'-o',archive,file]);
 const names=(await run('tar',['-tzf',archive],{capture:true})).trim().split('\n');
 const allowed=['roles.sql','schema.sql','data.sql','history_schema.sql','history_data.sql','storage_policies.sql','checksums.json'];
 if(names.some(n=>!allowed.includes(n)) || !allowed.every(n=>names.includes(n)))throw new Error('Contenido de archivo inesperado.');
 const types=(await run('tar',['-tvzf',archive],{capture:true})).trim().split('\n');if(types.some(line=>line[0]!=='-'))throw new Error('El archivo contiene enlaces o tipos no permitidos.');
 await run('tar',['-xzf',archive,'-C',dir]);const checks=JSON.parse(await readFile(join(dir,'checksums.json'),'utf8'));
 for(const name of allowed.filter(n=>n!=='checksums.json'))if(checks[name]!==await hash(join(dir,name)))throw new Error('Checksum interior inválido.');
 const existing=await run('psql',[target,'-At','-c',"select coalesce(to_regclass('public.cer_records')::text,'')"],{capture:true});if(existing.trim())throw new Error('El destino ya tiene datos CER. Se requiere otro entorno vacío.');
 await run('psql',[target,'--single-transaction','--set','ON_ERROR_STOP=1','-f',join(dir,'roles.sql'),'-f',join(dir,'schema.sql'),'-c','SET session_replication_role = replica','-f',join(dir,'data.sql'),'-f',join(dir,'history_schema.sql'),'-f',join(dir,'history_data.sql'),'-f',join(dir,'storage_policies.sql')]);
 const counts=await run('psql',[target,'-At','-c',"select json_build_object('equipment',(select count(*) from cer_equipment),'records',(select count(*) from cer_records),'profiles',(select count(*) from cer_profiles),'audit',(select count(*) from cer_audit_events),'orphan_records',(select count(*) from cer_records r left join cer_equipment e on e.id=r.equipment_id where e.id is null))"],{capture:true});
 console.log(JSON.stringify({restored:true,targetHost:required('CER_RESTORE_TEST_HOST'),counts:JSON.parse(counts),storageRestored:false}));
}
try{if(mode==='generate')await generate();else if(mode==='rotate')await rotate();else if(mode==='monitor'){const files=await manifests();if(staleBackup(files))throw new Error('No hay una copia correcta en las últimas 36 horas.');console.log('Backup reciente verificado.');}else if(mode==='list')console.log(JSON.stringify(await manifests(),null,2));else if(mode==='restore')await restore();else throw new Error('Comando desconocido.');}catch(error){console.error(error.message);process.exitCode=1;}finally{for(const dir of temporaryDirectories){try{await rm(dir,{recursive:true,force:true});}catch{console.error('No se pudo limpiar el directorio temporal privado.');process.exitCode=1;}}}
