// Counts are derived from the actual COPY dump, not a second live query that
// could see a different transaction snapshot while the clinic is working.
export const recoveryTables={
 'public.cer_equipment':'equipment','public.cer_tasks':'tasks',
 'public.cer_records':'records','public.cer_profiles':'profiles',
 'public.cer_audit_events':'audit','public.cer_attachments':'attachments',
 'public.cer_training':'training','auth.users':'authUsers',
};
export function dumpCounts(sql){
 const counts={};let table;
 for(const line of sql.split('\n')){
  if(line==='\\.'){table=undefined;continue;}
  if(table){counts[table]++;continue;}
  const match=/^COPY\s+([\w".]+)\s*\(.*\)\s+FROM stdin;$/.exec(line);
  const key=match&&recoveryTables[match[1].replaceAll('"','')];
  if(key){table=key;counts[key]=0;}
 }
 if(Object.values(recoveryTables).some(key=>!(key in counts)))throw new Error('El dump no contiene todos los datos CER y Auth esperados.');
 return counts;
}
export const recoveryQuery=`select json_build_object(
 'equipment',(select count(*) from public.cer_equipment),
 'tasks',(select count(*) from public.cer_tasks),
 'records',(select count(*) from public.cer_records),
 'profiles',(select count(*) from public.cer_profiles),
 'audit',(select count(*) from public.cer_audit_events),
 'attachments',(select count(*) from public.cer_attachments),
 'training',(select count(*) from public.cer_training),
 'authUsers',(select count(*) from auth.users),
 'orphan_records',(select count(*) from public.cer_records r left join public.cer_equipment e on e.id=r.equipment_id where e.id is null),
 'orphan_authors',(select count(*) from public.cer_profiles p left join auth.users u on u.id=p.id where u.id is null),
 'orphan_tasks',(select count(*) from public.cer_tasks t left join public.cer_equipment e on e.id=t.equipment_id where e.id is null))`;
