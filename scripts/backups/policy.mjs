export function rotationCandidates(files,now=new Date()) {
 const valid=files.filter(f=>/^CER-\d{8}T\d{6}Z\.tar\.gz\.age$/.test(f.name) && f.verified===true && f.size>0 && Number.isFinite(Date.parse(f.createdAt)));
 valid.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
 if(valid.length<2 || now-Date.parse(valid[0].createdAt)>36*3600000)throw new Error('No hay una copia nueva verificada: no se permite rotar.');
 return valid.slice(30);
}
export function staleBackup(files,now=new Date()) {
 const dates=files.filter(f=>f.verified===true && f.size>0).map(f=>Date.parse(f.createdAt)).filter(Number.isFinite);
 return !dates.length || now-Math.max(...dates)>36*3600000;
}
export function assertRestoreTarget(target,source,approvedHost) {
 const t=new URL(target),s=new URL(source);
 if(!approvedHost || t.hostname!==approvedHost || t.hostname===s.hostname && t.pathname===s.pathname)throw new Error('El destino debe ser una base de pruebas distinta y expresamente identificada.');
 if(!['postgres:','postgresql:'].includes(t.protocol))throw new Error('URL de PostgreSQL inválida.');
}
