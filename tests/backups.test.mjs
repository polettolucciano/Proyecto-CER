import {test} from 'node:test';import assert from 'node:assert/strict';
import {rotationCandidates,staleBackup,assertRestoreTarget,validateManifest,assertRecoveryCounts} from '../scripts/backups/policy.mjs';
import {dumpCounts,recoveryTables} from '../scripts/backups/recovery.mjs';
const now=new Date('2026-10-26T12:00:00Z');
const copies=Array.from({length:34},(_,i)=>({name:`CER-202610${String(26-i).padStart(2,'0')}T120000Z.tar.gz.age`,createdAt:new Date(+now-i*86400000).toISOString(),verified:true,size:100}));
test('no rota sin una copia nueva válida',()=>{assert.throws(()=>rotationCandidates([],now));assert.throws(()=>rotationCandidates(copies.slice(3,7),now));});
test('conserva las últimas 30 copias y nunca acepta nombres externos',()=>{const files=Array.from({length:34},(_,i)=>({...copies[0],name:`CER-202609${String(i%28+1).padStart(2,'0')}T${String(i).padStart(6,'0')}Z.tar.gz.age`,createdAt:new Date(+now-i*86400000).toISOString()}));assert.equal(rotationCandidates(files,now).length,4);assert.equal(rotationCandidates([...files,{name:'otro-archivo',verified:true,size:1,createdAt:now.toISOString()}],now).length,4);});
test('detecta respaldo antiguo y prohíbe restaurar en origen',()=>{assert.equal(staleBackup([],now),true);assert.equal(staleBackup([copies[0]],now),false);assert.throws(()=>assertRestoreTarget('postgresql://u:p@production/db','postgresql://u:p@production/db','production'));assert.doesNotThrow(()=>assertRestoreTarget('postgresql://u:p@test/db','postgresql://u:p@production/db','test'));});
test('un manifiesto no puede dirigir borrados a otro archivo ni proyecto',()=>{
 const manifest={name:'CER-20261026T120000Z.tar.gz.age',createdAt:now.toISOString(),verified:true,size:100,sha256:'a'.repeat(64),source:'cer-project'};
 const options={source:'cer-project',now};
 assert.equal(validateManifest(manifest,'CER-20261026T120000Z.json',options),manifest);
 assert.throws(()=>validateManifest({...manifest,name:'../otro'},'CER-20261026T120000Z.json',options));
 assert.throws(()=>validateManifest({...manifest,source:'other'},'CER-20261026T120000Z.json',options));
 assert.throws(()=>validateManifest(manifest,'CER-20261025T120000Z.json',options));
 assert.throws(()=>validateManifest({...manifest,createdAt:'2099-01-01'},'CER-20261026T120000Z.json',options));
 assert.equal(staleBackup([{...manifest,createdAt:'2099-01-01'}],now),true);
});
test('la recuperación compara conteos y detecta referencias huérfanas',()=>{
 assert.doesNotThrow(()=>assertRecoveryCounts({equipment:2,records:4,orphan_records:0},{equipment:2,records:4}));
 assert.throws(()=>assertRecoveryCounts({equipment:1},{equipment:2}));
 assert.throws(()=>assertRecoveryCounts({equipment:2,orphan_authors:1},{equipment:2}));
 assert.throws(()=>assertRecoveryCounts({},undefined));
});
test('rechaza restaurar en el origen usando otro alias de Supabase',()=>{
 assert.throws(()=>assertRestoreTarget('postgresql://postgres.source:p@pooler.supabase.com/postgres','postgresql://postgres:p@db.source.supabase.co/postgres','pooler.supabase.com','source'));
});
test('cuenta las filas del snapshot SQL incluyendo Auth, tareas e históricos',()=>{
 const sql=Object.keys(recoveryTables).map(name=>`COPY ${name.split('.').map(part=>'"'+part+'"').join('.')} (id) FROM stdin;\nrow-1\nrow-2\n\\.\n`).join('');
 const counts=dumpCounts(sql);assert.equal(counts.authUsers,2);assert.equal(counts.records,2);assert.equal(counts.tasks,2);
 assert.throws(()=>dumpCounts('COPY public.cer_equipment (id) FROM stdin;\n\\.\n'));
});
