-- Las nuevas fotos solo se guardan a través del procesador autenticado cer-evidence.
-- No se borran ni transforman evidencias anteriores.
drop policy if exists cer_evidence_upload on storage.objects;
