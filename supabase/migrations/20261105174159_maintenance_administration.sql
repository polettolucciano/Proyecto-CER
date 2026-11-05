-- Administration of modules, named assignees and non-destructive cancellations.
-- No existing record or module is deleted. Apply in a reviewed environment.
alter table public.cer_profiles drop constraint cer_profiles_modules_check;
alter table public.cer_profiles drop constraint cer_profiles_role_check;
alter table public.cer_profiles add constraint cer_profiles_role_check check (role in ('Administrador','Supervisor','Enfermería','Operador'));
create unique index cer_module_name_unique on public.cer_modules (lower(trim(definition->>'name')));

create function cer_private.validate_profile_modules() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if cardinality(new.modules)>300 or exists(select 1 from unnest(new.modules) m where not exists(select 1 from public.cer_modules c where c.id=m)) then raise exception 'INVALID_MODULE'; end if;
 return new;
end $$;
revoke all on function cer_private.validate_profile_modules() from public,anon,authenticated;
create trigger cer_profile_module_integrity before insert or update on public.cer_profiles for each row execute function cer_private.validate_profile_modules();

create function cer_private.valid_responsible(person text,m text) returns boolean language sql stable security invoker set search_path='' as $$
 select person is null or person='' or exists(select 1 from public.cer_profiles p where p.id::text=person and p.active and (p.role='Administrador' or m=any(p.modules)))
$$;
revoke all on function cer_private.valid_responsible(text,text) from public,anon,authenticated;

do $migration$
declare definition text; marker text; replacement text;
begin
 select pg_get_functiondef('cer_private.apply_changes(uuid,bigint,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'n integer; entity text;', 'n integer; entity text; requested date; scope text; reason text; saved_module jsonb; history jsonb;');
 definition:=replace(definition,'kind in (''equipment'',''task'',''profile'',''training'',''settings'',''void'')', 'kind in (''equipment'',''task'',''profile'',''training'',''settings'',''void'',''module'',''cancel-task'')');
 marker:='  if kind=''equipment'' then';
 if position(marker in definition)=0 then raise exception 'Expected equipment branch missing'; end if;
 replacement:=$branch$
  if kind='module' then
   if jsonb_typeof(d->'name') is distinct from 'string' or length(trim(d->>'name')) not between 2 and 100 or jsonb_typeof(d->'description') is distinct from 'string' or length(d->>'description')>500 or coalesce(d->>'frequency','') not in ('Diaria','Semanal','Quincenal','Mensual','Bimestral','Trimestral','Semestral','Anual','Única') then raise exception 'INVALID_MODULE'; end if;
   if not cer_private.valid_responsible(d->>'responsibleId',entity) then raise exception 'INVALID_ASSIGNEE'; end if;
   select definition into saved_module from public.cer_modules where id=entity;
   if saved_module is null then
    if entity !~ '^custom-[a-f0-9-]{36}$' or (select count(*) from public.cer_modules)>=300 then raise exception 'INVALID_MODULE'; end if;
    select definition || jsonb_build_object('id',entity,'custom',true) into saved_module from public.cer_modules where id='general';
   end if;
   saved_module:=saved_module || jsonb_build_object('name',trim(d->>'name'),'short',trim(d->>'name'),'description',trim(d->>'description'),'frequency',d->>'frequency','responsibleId',nullif(d->>'responsibleId',''));
   insert into public.cer_modules(id,definition) values(entity,saved_module) on conflict(id) do update set definition=excluded.definition;
   m:=entity;
  elsif kind='cancel-task' then
   select * into t from public.cer_tasks where id=entity for update;
   if t.id is null or not coalesce((t.data->>'active')::boolean,false) then raise exception 'TASK_INACTIVE'; end if;
   scope:=d->>'scope'; reason:=trim(d->>'reason');
   if scope is null or scope not in ('date','series') or jsonb_typeof(d->'reason') is distinct from 'string' or length(reason) not between 10 and 1000 or coalesce(d->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'INVALID_CANCELLATION'; end if;
   requested:=(d->>'date')::date;
   if requested<t.due or (nullif(t.data->>'cancelledFrom','') is not null and requested>=(t.data->>'cancelledFrom')::date) then raise exception 'INVALID_SCHEDULE'; end if;
   history:=coalesce(t.data->'cancellations','[]'::jsonb);
   if exists(select 1 from jsonb_array_elements(history) x where x->>'date'=requested::text) then raise exception 'ALREADY_CANCELLED'; end if;
   nextdate:=t.due; n:=0;
   while nextdate<requested loop
    if t.frequency='Única' then raise exception 'INVALID_SCHEDULE'; end if;
    nextdate:=cer_private.next_due(nextdate,t.frequency,t.anchor_day); n:=n+1;
    if n>10000 then raise exception 'INVALID_SCHEDULE'; end if;
   end loop;
   if nextdate<>requested then raise exception 'INVALID_SCHEDULE'; end if;
   if exists(select 1 from public.cer_records where task_id=t.id and status='active' and (case scope when 'date' then date=requested else date>=requested end)) then raise exception 'CONTROL_ALREADY_RECORDED'; end if;
   m:=t.module;
   if scope='series' then
    update public.cer_tasks set data=data||jsonb_build_object('active',due<requested,'cancelledFrom',requested,'cancellationReason',reason,'cancelledAt',now(),'cancelledBy',actor) where id=t.id;
   else
    history:=history||jsonb_build_array(jsonb_build_object('date',requested,'reason',reason,'cancelledAt',now(),'cancelledBy',actor));
    nextdate:=t.due;
    if requested=t.due and t.frequency<>'Única' then
     nextdate:=cer_private.next_due(t.due,t.frequency,t.anchor_day);
     while exists(select 1 from jsonb_array_elements(history) x where x->>'date'=nextdate::text) loop nextdate:=cer_private.next_due(nextdate,t.frequency,t.anchor_day); end loop;
    end if;
    update public.cer_tasks set due=nextdate,data=data||jsonb_build_object('cancellations',history,'active',not (t.frequency='Única' and requested=t.due) and (nullif(t.data->>'cancelledFrom','') is null or nextdate<(t.data->>'cancelledFrom')::date)) where id=t.id;
   end if;
  elsif kind='equipment' then
   if not cer_private.valid_responsible(d->>'responsibleId',m) then raise exception 'INVALID_ASSIGNEE'; end if;
$branch$;
 definition:=replace(definition,marker,replacement);
 marker:='  elsif kind=''task'' then';
 if position(marker in definition)=0 then raise exception 'Expected task branch missing'; end if;
 definition:=replace(definition,marker,marker||E'\n'||$guard$
   select * into t from public.cer_tasks where id=entity;
   if t.id is null then d:=d||jsonb_build_object('startsOn',d->>'due'); elsif d ? 'startsOn' and nullif(d->>'startsOn','') is distinct from nullif(t.data->>'startsOn','') then raise exception 'IDENTITY_LOCKED'; elsif not (d ? 'startsOn') and t.data ? 'startsOn' then d:=d||jsonb_build_object('startsOn',t.data->'startsOn'); end if;
   if coalesce(d->'cancellations','[]'::jsonb) is distinct from coalesce(t.data->'cancellations','[]'::jsonb) or nullif(d->>'cancelledFrom','') is distinct from nullif(t.data->>'cancelledFrom','') or nullif(d->>'cancellationReason','') is distinct from nullif(t.data->>'cancellationReason','') or nullif(d->>'cancelledAt','') is distinct from nullif(t.data->>'cancelledAt','') or nullif(d->>'cancelledBy','') is distinct from nullif(t.data->>'cancelledBy','') then raise exception 'INVALID_CANCELLATION_HISTORY'; end if;
   if coalesce((t.data->>'active')::boolean,false) and not coalesce((d->>'active')::boolean,false) then raise exception 'USE_CANCELLATION_ACTION'; end if;
   if t.data ? 'cancelledFrom' and (d->>'active')::boolean and (d->>'due')::date >= (t.data->>'cancelledFrom')::date then raise exception 'TASK_INACTIVE'; end if;
$guard$);
 definition:=replace(definition,'while nextdate<=r.date loop', 'while nextdate<=r.date or exists(select 1 from jsonb_array_elements(coalesce(t.data->''cancellations'',''[]''::jsonb)) x where x->>''date''=nextdate::text) loop');
 definition:=replace(definition,'data=data||jsonb_build_object(''lastCompleted'',r.date)','data=data||jsonb_build_object(''lastCompleted'',r.date,''active'',nullif(t.data->>''cancelledFrom'','''') is null or nextdate<(t.data->>''cancelledFrom'')::date)');
 definition:=replace(definition,'when ''void'' then ''record.voided'' else', 'when ''void'' then ''record.voided'' when ''cancel-task'' then ''task.cancelled'' else');
 definition:=replace(definition,'case when kind in (''record'',''void'') then ''maintenance-record'' else kind end', 'case when kind in (''record'',''void'') then ''maintenance-record'' when kind=''cancel-task'' then ''task'' else kind end');
 definition:=replace(definition,'else ''Guardó ''||kind end', 'when kind=''cancel-task'' then ''Canceló ''||scope||'' desde ''||requested::text||'': ''||reason else ''Guardó ''||kind end');
 marker:='if t.id is null or not coalesce((t.data->>''active'')::boolean,false) then raise exception ''TASK_INACTIVE''; end if;';
 -- Both cancellations and record registration read the locked task. A record can
 -- never be inserted for a date already cancelled by a concurrent transaction.
 definition:=replace(definition,marker,marker||E'\n'||$guard$
   if kind='record' and (exists(select 1 from jsonb_array_elements(coalesce(t.data->'cancellations','[]'::jsonb)) x where x->>'date'=r.date::text) or (nullif(t.data->>'cancelledFrom','') is not null and r.date>=(t.data->>'cancelledFrom')::date)) then raise exception 'CONTROL_CANCELLED'; end if;
 $guard$);
 execute definition;
 select pg_get_functiondef('public.cer_workspace()'::regprocedure) into definition;
 marker:='''version'',2,''serverRevision''';
 if position(marker in definition)=0 then raise exception 'Expected workspace contract missing'; end if;
 definition:=replace(definition,marker,'''version'',2,''modules'',coalesce((select jsonb_agg(definition) from public.cer_modules),''[]''::jsonb),''serverRevision''');
 definition:=replace(definition,'''scheduleBasis'',schedule_basis', '''scheduleBasis'',schedule_basis,''anchorDay'',anchor_day');
 execute definition;
end
$migration$;
