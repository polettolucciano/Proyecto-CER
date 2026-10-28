-- VERSION_CONFLICT is an expected optimistic concurrency rejection, not a
-- PostgreSQL serialization failure (40xxx maps to HTTP 500 in PostgREST).
-- Preserve the implementation and privileges; only change its public status.
do $migration$
declare definition text;
begin
 select pg_get_functiondef('cer_private.apply_changes(uuid,bigint,jsonb)'::regprocedure) into definition;
 if position('errcode=''40001''' in definition)=0 then
  raise exception 'Expected CER conflict implementation was not found';
 end if;
 execute replace(definition,'errcode=''40001''','errcode=''PT409''');
end
$migration$;
