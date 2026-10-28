export function rotationCandidates(files,now=new Date()) {
 const valid=files.filter(f=>/^CER-\d{8}T\d{6}Z\.tar\.gz\.age$/.test(f.name) && f.verified===true && f.size>0 && Number.isFinite(Date.parse(f.createdAt)));
 valid.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
 if(valid.length<2 || now-Date.parse(valid[0].createdAt)>36*3600000)throw new Error('No hay una copia nueva verificada: no se permite rotar.');
 return valid.slice(30);
}
export function staleBackup(files,now=new Date()) {
 const dates=files.filter(f=>f.verified===true && f.size>0).map(f=>Date.parse(f.createdAt)).filter(date=>Number.isFinite(date) && date<=+now+300000);
 return !dates.length || now-Math.max(...dates)>36*3600000;
}
export function validateManifest(value,filename,{storage=false,source,now=new Date()}={}) {
 const pattern=storage?/^CER-STORAGE-\d{8}T\d{6}Z\.tar\.gz\.age$/:/^CER-\d{8}T\d{6}Z\.tar\.gz\.age$/;
 const expected=storage?`${value?.name}.json`:value?.name?.replace(/\.tar\.gz\.age$/,'.json');
 if(!value || !pattern.test(value.name) || filename!==expected || value.verified!==true || !Number.isSafeInteger(value.size) || value.size<=0 || !/^[a-f0-9]{64}$/.test(value.sha256) || !Number.isFinite(Date.parse(value.createdAt)) || Date.parse(value.createdAt)>+now+300000 || !source || value.source!==source)throw new Error('Manifiesto de respaldo inválido o de otro proyecto. No se eliminaron copias.');
 return value;
}
export function assertRecoveryCounts(actual,expected) {
 if(!expected || !Object.keys(expected).length)throw new Error('El respaldo no incluye conteos de referencia para verificar recuperación.');
 for(const [key,value] of Object.entries(expected))if(actual[key]!==value)throw new Error(`La recuperación no coincide en ${key}.`);
 if(actual.orphan_records || actual.orphan_authors || actual.orphan_tasks)throw new Error('La recuperación contiene referencias incompletas.');
}
export function assertRestoreTarget(target,source,approvedHost,sourceProject) {
 const t=new URL(target),s=new URL(source);
 if(!approvedHost || t.hostname!==approvedHost || t.hostname===s.hostname && t.pathname===s.pathname)throw new Error('El destino debe ser una base de pruebas distinta y expresamente identificada.');
 if(!['postgres:','postgresql:'].includes(t.protocol))throw new Error('URL de PostgreSQL inválida.');
 if(sourceProject && (t.hostname===`db.${sourceProject}.supabase.co` || decodeURIComponent(t.username)===`postgres.${sourceProject}`))throw new Error('El destino apunta al proyecto origen, aunque use otro hostname.');
}
