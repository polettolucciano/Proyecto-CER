-- Reject forged/malformed outcomes before they can be recorded as "ok".
-- Keep the existing transaction, revision lock, grants and historical records.
do $migration$
declare definition text; marker text := '  elsif kind=''record'' then';
begin
 select pg_get_functiondef('cer_private.apply_changes(uuid,bigint,jsonb)'::regprocedure) into definition;
 if position(marker in definition)=0 then raise exception 'Expected CER record implementation was not found'; end if;
 definition := replace(definition,marker,marker || E'\n' || $guard$
   if jsonb_typeof(d->'result') is distinct from 'string' or (d->>'result') not in ('ok','attention') then raise exception 'INVALID_RESULT'; end if;
   if jsonb_typeof(coalesce(d->'photos','[]'::jsonb)) is distinct from 'array' then raise exception 'INVALID_ATTACHMENTS'; end if;
   if jsonb_array_length(coalesce(d->'photos','[]'::jsonb))>6 then raise exception 'TOO_MANY_PHOTOS'; end if;
   if c ? 'duplicateApproved' and jsonb_typeof(c->'duplicateApproved') is distinct from 'boolean' then raise exception 'INVALID_DUPLICATE_CONFIRMATION'; end if;
 $guard$);
 marker := '  if kind=''equipment'' then';
 if position(marker in definition)=0 then raise exception 'Expected CER equipment implementation was not found'; end if;
 definition := replace(definition,marker,marker || E'\n' || $guard$
   if jsonb_typeof(d->'name') is distinct from 'string' or jsonb_typeof(d->'location') is distinct from 'string' or jsonb_typeof(d->'code') is distinct from 'string' or (d ? 'model' and jsonb_typeof(d->'model') is distinct from 'string') or (d ? 'serial' and jsonb_typeof(d->'serial') is distinct from 'string') then raise exception 'INVALID_EQUIPMENT'; end if;
 $guard$);
 marker := '  elsif kind=''task'' then';
 if position(marker in definition)=0 then raise exception 'Expected CER task implementation was not found'; end if;
 definition := replace(definition,marker,marker || E'\n' || $guard$
   if jsonb_typeof(d->'title') is distinct from 'string' or (d ? 'notes' and jsonb_typeof(d->'notes') is distinct from 'string') then raise exception 'INVALID_TASK'; end if;
 $guard$);
 marker := '  elsif kind=''training'' then';
 if position(marker in definition)=0 then raise exception 'Expected CER training implementation was not found'; end if;
 definition := replace(definition,marker,marker || E'\n' || $guard$
   if jsonb_typeof(d->'title') is distinct from 'string' or jsonb_typeof(d->'url') is distinct from 'string' or jsonb_typeof(d->'type') is distinct from 'string' or jsonb_typeof(d->'published') is distinct from 'boolean' then raise exception 'INVALID_TRAINING'; end if;
 $guard$);
 execute definition;
end
$migration$;

-- A browser must not race DELETE against linking the same photograph to a
-- record. Unlinked objects require a deliberate server-side cleanup instead.
drop policy if exists cer_evidence_cleanup on storage.objects;

-- The existing platform helper is an event-trigger function, not an app RPC.
-- Keep the helper and its owner privileges; remove unnecessary API-role grants.
do $privileges$
begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  if (select prorettype from pg_proc where oid=to_regprocedure('public.rls_auto_enable()')) <> 'event_trigger'::regtype then
   raise exception 'Unexpected rls_auto_enable signature; review before changing privileges';
  end if;
  revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
 end if;
end
$privileges$;
