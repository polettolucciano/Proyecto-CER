import {mkdtemp,writeFile,readFile,readdir,stat,mkdir,rm} from 'node:fs/promises';
import {createReadStream} from 'node:fs';import {createHash} from 'node:crypto';import {spawn} from 'node:child_process';import {tmpdir} from 'node:os';import {join,relative,resolve} from 'node:path';
import {rotationCandidates,staleBackup} from './policy.mjs';
const need=k=>{if(!process.env[k])throw new Error(`Falta ${k}`);return process.env[k];};
const run=(cmd,args,capture=false)=>new Promise((ok,fail)=>{const child=spawn(cmd,args,{stdio:['ignore',capture?'pipe':'ignore','ignore']});let out='';if(capture)child.stdout.on('data',b=>out+=b);child.on('error',()=>fail(new Error(`No se pudo ejecutar ${cmd}.`)));child.on('exit',c=>c===0?ok(out):fail(new Error(`Falló ${cmd}.`)));});
async function hash(path){const h=createHash('sha256');for await(const b of createReadStream(path))h.update(b);return h.digest('hex');}
async function inventory(root,dir=root){let files=[];for(const f of await readdir(dir,{withFileTypes:true})){const path=join(dir,f.name);if(f.isDirectory())files.push(...await inventory(root,path));else if(f.isFile())files.push({path:relative(root,path),sha256:await hash(path),size:(await stat(path)).size});else throw new Error('Objeto de archivo no permitido.');}return files;}
const destination=(name,folder='Diarios')=>`${need('CER_BACKUP_REMOTE').replace(/\/$/,'')}/Archivos/${folder}/${name}`;
async function list(folder='Diarios'){const files=JSON.parse(await run('rclone',['lsjson',destination('',folder)],true));const reports=[];for(const f of files.filter(f=>/^CER-STORAGE-\d{8}T\d{6}Z\.tar\.gz\.age\.json$/.test(f.Name))){const report=JSON.parse(await run('rclone',['cat',destination(f.Name,folder)],true));if(`${report.name}.json`!==f.Name)throw new Error('Manifiesto inconsistente.');reports.push({...report,manifest:f.Name});}return reports;}
let temporaryDirectory;
try{
 const mode=process.argv[2]??'generate',dir=await mkdtemp(join(tmpdir(),'cer-storage-'));
 temporaryDirectory=dir;
 if(mode==='generate'){
  await mkdir(join(dir,'objects'),{mode:0o700});
  await run('rclone',['copy',need('CER_STORAGE_REMOTE'),join(dir,'objects'),'--immutable']);
  const files=await inventory(join(dir,'objects'));await writeFile(join(dir,'inventory.json'),JSON.stringify(files));
  const archive=join(dir,'storage.tar.gz');await run('tar',['-czf',archive,'-C',dir,'objects','inventory.json']);
  const createdAt=new Date().toISOString(),stamp=createdAt.replace(/[-:]/g,'').slice(0,15)+'Z',name=`CER-STORAGE-${stamp}.tar.gz.age`,file=join(dir,name);
  await run('age',['-r',need('CER_BACKUP_AGE_RECIPIENT'),'-o',file,archive]);const checksum=await hash(file);
  await run('rclone',['copyto',file,destination(name),'--immutable']);
  // Comparar los bytes remotos mediante una descarga temporal cifrada.
  const verify=join(dir,'verify.age');await run('rclone',['copyto',destination(name),verify]);if(await hash(verify)!==checksum)throw new Error('Hash remoto incorrecto.');
  const report={name,createdAt,sha256:checksum,verified:true,size:(await stat(file)).size,objects:files.length,source:need('CER_SOURCE_PROJECT_REF')};
  const manifest=join(dir,`${name}.json`);await writeFile(manifest,JSON.stringify(report));await run('rclone',['copyto',manifest,destination(`${name}.json`),'--immutable']);console.log(JSON.stringify(report));
  if(createdAt.slice(8,10)==='01'){await run('rclone',['copyto',file,destination(name,'Mensuales'),'--immutable']);await run('rclone',['copyto',destination(name,'Mensuales'),verify]);if(await hash(verify)!==checksum)throw new Error('Hash mensual de archivos incorrecto.');await run('rclone',['copyto',manifest,destination(`${name}.json`,'Mensuales'),'--immutable']);}
 }else if(mode==='monitor'){
  if(staleBackup(await list()))throw new Error('No hay un respaldo reciente de fotografías.');console.log('Respaldo de archivos reciente.');
 }else if(mode==='rotate'){
  const reports=await list();const canonical=reports.map(f=>({...f,originalName:f.name,name:f.name.replace('CER-STORAGE-','CER-')}));
  const candidates=rotationCandidates(canonical),newest=reports.filter(f=>f.verified===true).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];
  const verify=join(dir,'verify.age');await run('rclone',['copyto',destination(newest.name),verify]);if(await hash(verify)!==newest.sha256)throw new Error('No se verificó la nueva copia de archivos.');
  for(const f of candidates){await run('rclone',['deletefile',destination(f.originalName)]);await run('rclone',['deletefile',destination(f.manifest)]);}
  const monthly=(await list('Mensuales')).filter(f=>f.verified===true).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  if(monthly.length>12){await run('rclone',['copyto',destination(monthly[0].name,'Mensuales'),verify]);if(await hash(verify)!==monthly[0].sha256)throw new Error('La copia mensual de archivos no es válida.');for(const f of monthly.slice(12)){await run('rclone',['deletefile',destination(f.name,'Mensuales')]);await run('rclone',['deletefile',destination(f.manifest,'Mensuales')]);}}
  console.log('Rotación de archivos completada.');
 }else if(mode==='restore'){
  const target=need('CER_STORAGE_RESTORE_REMOTE');if(target!==need('CER_STORAGE_RESTORE_APPROVED') || target===need('CER_STORAGE_REMOTE') || need('CER_RESTORE_CONFIRM')!=='cer-test-only')throw new Error('Destino de pruebas no aprobado.');
  const existing=JSON.parse(await run('rclone',['lsjson',target],true));if(existing.length)throw new Error('El destino de Storage no está vacío.');
  const file=resolve(need('CER_STORAGE_RESTORE_FILE')),manifest=JSON.parse(await readFile(need('CER_STORAGE_RESTORE_MANIFEST'),'utf8'));if(await hash(file)!==manifest.sha256)throw new Error('Checksum exterior incorrecto.');
  const archive=join(dir,'storage.tar.gz');await run('age',['--decrypt','-i',need('CER_RESTORE_AGE_IDENTITY'),'-o',archive,file]);
  const names=(await run('tar',['-tzf',archive],true)).trim().split('\n');if(names.some(n=>n!=='inventory.json' && !(n.startsWith('objects/') && !n.split('/').includes('..') && !n.startsWith('/'))))throw new Error('Ruta no válida.');
  const types=(await run('tar',['-tvzf',archive],true)).trim().split('\n');if(types.some(line=>!['-','d'].includes(line[0])))throw new Error('El respaldo contiene enlaces o dispositivos.');
  await run('tar',['-xzf',archive,'-C',dir]);const files=JSON.parse(await readFile(join(dir,'inventory.json'),'utf8'));
  for(const item of files){if(typeof item.path!=='string' || item.path.startsWith('/') || item.path.split('/').includes('..') || await hash(join(dir,'objects',item.path))!==item.sha256)throw new Error('Inventario inválido.');}
  await run('rclone',['copy',join(dir,'objects'),target,'--immutable']);await run('rclone',['check',join(dir,'objects'),target,'--download']);console.log(JSON.stringify({storageRestored:true,objects:files.length}));
 }else throw new Error('Modo de Storage no válido.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{if(temporaryDirectory){try{await rm(temporaryDirectory,{recursive:true,force:true});}catch{console.error('No se pudo limpiar el directorio temporal privado.');process.exitCode=1;}}}
