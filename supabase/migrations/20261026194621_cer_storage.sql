-- Se ejecuta con el servicio Storage disponible (no con la emulación de pruebas).
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cer-evidence','cer-evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy cer_evidence_upload on storage.objects for insert to authenticated
with check(bucket_id='cer-evidence' and cer_private.module_access(split_part(name,'/',1)) and split_part(name,'/',2)=(select auth.uid())::text);
create policy cer_evidence_read on storage.objects for select to authenticated
using(bucket_id='cer-evidence' and cer_private.module_access(split_part(name,'/',1)) and (split_part(name,'/',2)=(select auth.uid())::text or exists(select 1 from public.cer_attachments a where a.path=storage.objects.name)));
-- Solo pueden limpiarse archivos huérfanos propios; nunca evidencias vinculadas.
create policy cer_evidence_cleanup on storage.objects for delete to authenticated
using(bucket_id='cer-evidence' and cer_private.module_access(split_part(name,'/',1)) and split_part(name,'/',2)=(select auth.uid())::text and not exists(select 1 from public.cer_attachments a where a.path=storage.objects.name));
