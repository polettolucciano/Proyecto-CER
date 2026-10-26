-- CER: no datos de demostración ni borrado de historiales.
create schema if not exists cer_private;
revoke all on schema cer_private from public;
grant usage on schema cer_private to authenticated;

create table public.cer_modules (
  id text primary key,
  definition jsonb not null
);
create table public.cer_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 150),
  email text not null unique,
  role text not null check (role in ('Administrador','Supervisor','Enfermería')),
  modules text[] not null default '{}',
  active boolean not null default true,
  check (modules <@ array['generator','osmosis','loop','crash','fumigation','electrical','rooms','general']::text[]),
  check (role='Administrador' or cardinality(modules)>0)
);
create table public.cer_settings (
  id boolean primary key default true check (id),
  revision bigint not null default 0,
  data jsonb not null default '{"organization":"Centro de Enfermedades Renales","location":"Sede principal","advanceDays":7,"emailAlerts":false,"mobileAlerts":false}'
);
insert into public.cer_settings(id) values(true);
create table public.cer_equipment (
  id text primary key check(length(id) between 1 and 100),
  module text not null references public.cer_modules(id),
  code text not null unique check(length(trim(code)) between 1 and 30),
  data jsonb not null,
  unique(id,module),
  check (coalesce(length(trim(data->>'name')),0) between 1 and 150 and coalesce(length(trim(data->>'location')),0) between 1 and 200),
  check (coalesce(data->>'status','') in ('Operativo','En mantenimiento','Fuera de servicio'))
);
create table public.cer_tasks (
  id text primary key check(length(id) between 1 and 100),
  module text not null references public.cer_modules(id),
  equipment_id text not null,
  assigned_to uuid not null references public.cer_profiles(id) on delete restrict,
  frequency text not null check(frequency in ('Diaria','Semanal','Quincenal','Mensual','Bimestral','Trimestral','Semestral','Anual','Única')),
  due date not null,
  anchor_day integer not null check(anchor_day between 1 and 31),
  schedule_basis text check(schedule_basis in ('planned','completion')),
  data jsonb not null,
  foreign key(equipment_id,module) references public.cer_equipment(id,module) on delete restrict,
  check(coalesce(length(trim(data->>'title')),0) between 1 and 120),
  unique(id,equipment_id,module)
);
create table public.cer_records (
  id text primary key check(length(id) between 1 and 100),
  module text not null references public.cer_modules(id),
  equipment_id text not null,
  task_id text,
  date date not null,
  created_at timestamptz not null default now(),
  user_id uuid not null references public.cer_profiles(id) on delete restrict,
  result text not null check(result in ('ok','attention')),
  values jsonb not null check(jsonb_typeof(values)='object'),
  form_definition jsonb not null,
  notes text not null default '' check(length(notes)<=10000),
  status text not null default 'active' check(status in ('active','superseded','voided')),
  revision integer not null default 1 check(revision>0),
  supersedes_id text unique references public.cer_records(id) on delete restrict,
  superseded_by_id text references public.cer_records(id) on delete restrict,
  voided_at timestamptz,
  voided_by uuid references public.cer_profiles(id) on delete restrict,
  void_reason text,
  foreign key(equipment_id,module) references public.cer_equipment(id,module) on delete restrict,
  foreign key(task_id,equipment_id,module) references public.cer_tasks(id,equipment_id,module) on delete restrict,
  check(result <> 'attention' or length(trim(notes))>0),
  check(status <> 'voided' or (voided_at is not null and voided_by is not null and length(trim(void_reason))>=10))
);
create table public.cer_attachments (
  id uuid primary key default gen_random_uuid(),
  record_id text not null references public.cer_records(id) on delete restrict,
  path text not null,
  name text not null check(length(name) between 1 and 255),
  mime text not null check(mime in ('image/jpeg','image/png','image/webp')),
  category text,
  unique(record_id,path)
);
create table public.cer_audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id uuid not null references public.cer_profiles(id) on delete restrict,
  action text not null,
  entity_id text not null,
  entity_type text not null,
  module text references public.cer_modules(id),
  summary text not null,
  related_entity_id text
);
create table public.cer_training (
  id text primary key,
  published boolean not null default false,
  data jsonb not null,
  check(coalesce(length(trim(data->>'title')),0) between 1 and 200),
  check(coalesce(data->>'url','') ~ '^https://[^[:space:]]+$'),
  check(coalesce(data->>'type','') in ('Video','Documento','Presentación'))
);
create table cer_private.operations (
  actor_id uuid not null references public.cer_profiles(id),
  operation_id uuid not null,
  fingerprint text not null,
  revision bigint not null,
  primary key(actor_id,operation_id)
);
alter table cer_private.operations enable row level security;
create index on public.cer_tasks(module,due);
create index on public.cer_tasks(equipment_id);
create index on public.cer_tasks(assigned_to);
create index on public.cer_records(module,date desc);
create index on public.cer_records(equipment_id,date desc);
create index on public.cer_records(task_id,date);
create index on public.cer_records(user_id);
create index on public.cer_attachments(record_id);
create index on public.cer_audit_events(entity_id,occurred_at desc);
create index on public.cer_audit_events(module);

create function cer_private.is_active() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.cer_profiles where id=(select auth.uid()) and active)
$$;
create function cer_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.cer_profiles where id=(select auth.uid()) and active and role='Administrador')
$$;
create function cer_private.module_access(m text) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.cer_profiles where id=(select auth.uid()) and active and (role='Administrador' or m=any(modules)))
$$;
revoke all on all functions in schema cer_private from public;
grant execute on function cer_private.is_active(),cer_private.is_admin(),cer_private.module_access(text) to authenticated;

alter table public.cer_modules enable row level security;
alter table public.cer_profiles enable row level security;
alter table public.cer_settings enable row level security;
alter table public.cer_equipment enable row level security;
alter table public.cer_tasks enable row level security;
alter table public.cer_records enable row level security;
alter table public.cer_attachments enable row level security;
alter table public.cer_audit_events enable row level security;
alter table public.cer_training enable row level security;
revoke all on public.cer_modules,public.cer_profiles,public.cer_settings,public.cer_equipment,public.cer_tasks,public.cer_records,public.cer_attachments,public.cer_audit_events,public.cer_training from anon,authenticated;
grant select on public.cer_modules,public.cer_profiles,public.cer_settings,public.cer_equipment,public.cer_tasks,public.cer_records,public.cer_attachments,public.cer_audit_events,public.cer_training to authenticated;
grant select on public.cer_training to anon;
create policy modules_read on public.cer_modules for select to authenticated using(cer_private.is_active());
create policy profiles_read on public.cer_profiles for select to authenticated using(cer_private.is_active());
create policy settings_read on public.cer_settings for select to authenticated using(cer_private.is_active());
create policy equipment_read on public.cer_equipment for select to authenticated using(cer_private.module_access(module));
create policy tasks_read on public.cer_tasks for select to authenticated using(cer_private.module_access(module));
create policy records_read on public.cer_records for select to authenticated using(cer_private.module_access(module));
create policy attachments_read on public.cer_attachments for select to authenticated using(exists(select 1 from public.cer_records r where r.id=record_id and cer_private.module_access(r.module)));
create policy audit_read on public.cer_audit_events for select to authenticated using(cer_private.is_admin() or (module is not null and cer_private.module_access(module)));
create policy training_private on public.cer_training for select to authenticated using(cer_private.is_admin());
create policy training_public on public.cer_training for select to anon,authenticated using(published);

-- Una lectura coherente y sin truncado silencioso del límite REST de filas.
create function public.cer_workspace() returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object(
 'version',2,'serverRevision',(select revision from public.cer_settings where id),
 'equipment',coalesce((select jsonb_agg(data || jsonb_build_object('id',id,'module',module,'code',code)) from public.cer_equipment),'[]'),
 'tasks',coalesce((select jsonb_agg(data || jsonb_build_object('id',id,'module',module,'equipmentId',equipment_id,'assignedTo',assigned_to,'frequency',frequency,'due',due,'scheduleBasis',schedule_basis)) from public.cer_tasks),'[]'),
 'users',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'email',email,'role',role,'modules',modules,'active',active,'initials',upper(left(name,1)))) from public.cer_profiles),'[]'),
 'records',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'module',r.module,'equipmentId',r.equipment_id,'taskId',r.task_id,'date',r.date,'createdAt',r.created_at,'userId',r.user_id,'result',r.result,'values',r.values,'formDefinition',r.form_definition,'notes',r.notes,'status',r.status,'revision',r.revision,'supersedesId',r.supersedes_id,'supersededById',r.superseded_by_id,'voidedAt',r.voided_at,'voidedBy',r.voided_by,'voidReason',r.void_reason,'photos',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'type',a.mime,'category',a.category,'storagePath',a.path)) from public.cer_attachments a where a.record_id=r.id),'[]'))) from public.cer_records r),'[]'),
 'auditEvents',coalesce((select jsonb_agg(jsonb_build_object('id',id,'occurredAt',occurred_at,'actorId',actor_id,'action',action,'entityType',entity_type,'entityId',entity_id,'summary',summary,'relatedEntityId',related_entity_id)) from public.cer_audit_events),'[]'),
 'training',coalesce((select jsonb_agg(data || jsonb_build_object('id',id,'published',published)) from public.cer_training),'[]'),
 'settings',(select data from public.cer_settings where id))
where cer_private.is_active()
$$;
revoke all on function public.cer_workspace() from public,anon;
grant execute on function public.cer_workspace() to authenticated;

create function cer_private.next_due(d date,f text,anchor integer) returns date language plpgsql immutable set search_path='' as $$
declare months integer; target date;
begin
 if f='Diaria' then return d+1; elsif f='Semanal' then return d+7; elsif f='Quincenal' then return d+15; end if;
 months := case f when 'Mensual' then 1 when 'Bimestral' then 2 when 'Trimestral' then 3 when 'Semestral' then 6 when 'Anual' then 12 end;
 if months is null then raise exception 'INVALID_FREQUENCY'; end if;
 target := (date_trunc('month',d)+make_interval(months=>months))::date;
 return target + least(anchor,extract(day from (target+interval '1 month - 1 day'))::integer)-1;
end $$;

create function cer_private.apply_changes(op uuid,expected bigint,commands jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); current_revision bigint; previous cer_private.operations%rowtype;
 c jsonb; d jsonb; kind text; m text; source public.cer_records%rowtype; t public.cer_tasks%rowtype;
 r public.cer_records%rowtype; form_definition jsonb; field jsonb; val text; has_issue boolean; a jsonb; nextdate date; basis date; n integer; entity text;
begin
 if actor is null or not cer_private.is_active() then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if op is null or jsonb_typeof(commands) is distinct from 'array' or jsonb_array_length(commands) not between 1 and 50 or octet_length(commands::text)>1048576 then raise exception 'INVALID_COMMANDS'; end if;
 select revision into current_revision from public.cer_settings where id for update;
 select * into previous from cer_private.operations where actor_id=actor and operation_id=op;
 if found then
   if previous.fingerprint<>md5(commands::text) then raise exception 'IDEMPOTENCY_MISMATCH'; end if;
   return previous.revision;
 end if;
 if expected is null or expected<>current_revision then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
 for c in select value from jsonb_array_elements(commands) loop
  kind:=c->>'kind'; d:=c->'data'; entity:=d->>'id'; m:=d->>'module';
  if entity is null and kind<>'settings' then raise exception 'INVALID_ID'; end if;
  if kind in ('equipment','task','profile','training','settings','void') and not cer_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  if kind='equipment' then
   if exists(select 1 from public.cer_equipment e where e.id=entity and e.module<>m) and (exists(select 1 from public.cer_records where equipment_id=entity) or exists(select 1 from public.cer_tasks where equipment_id=entity)) then raise exception 'IDENTITY_LOCKED'; end if;
   insert into public.cer_equipment(id,module,code,data) values(entity,m,upper(trim(d->>'code')),d)
   on conflict(id) do update set module=excluded.module,code=excluded.code,data=excluded.data;
  elsif kind='task' then
   if jsonb_typeof(d->'active') is distinct from 'boolean' then raise exception 'INVALID_TASK'; end if;
   if not exists(select 1 from public.cer_profiles p where p.id=(d->>'assignedTo')::uuid and p.active and (p.role='Administrador' or m=any(p.modules))) then raise exception 'INVALID_ASSIGNEE'; end if;
   if exists(select 1 from public.cer_tasks x where x.id=entity and (x.module<>m or x.equipment_id<>d->>'equipmentId')) and exists(select 1 from public.cer_records where task_id=entity) then raise exception 'IDENTITY_LOCKED'; end if;
   insert into public.cer_tasks(id,module,equipment_id,assigned_to,frequency,due,anchor_day,schedule_basis,data)
   values(entity,m,d->>'equipmentId',(d->>'assignedTo')::uuid,d->>'frequency',(d->>'due')::date,extract(day from (d->>'due')::date),d->>'scheduleBasis',d)
   on conflict(id) do update set module=excluded.module,equipment_id=excluded.equipment_id,assigned_to=excluded.assigned_to,frequency=excluded.frequency,due=excluded.due,anchor_day=case when cer_tasks.due<>excluded.due then excluded.anchor_day else cer_tasks.anchor_day end,schedule_basis=excluded.schedule_basis,data=excluded.data;
  elsif kind='profile' then
   if entity::uuid=actor and (d->>'role'<>'Administrador' or not (d->>'active')::boolean) then raise exception 'CANNOT_DEMOTE_SELF'; end if;
   if not exists(select 1 from auth.users where id=entity::uuid) then raise exception 'INVITE_AUTH_USER_FIRST'; end if;
   insert into public.cer_profiles(id,name,email,role,modules,active)
   values(entity::uuid,trim(d->>'name'),(select email from auth.users where id=entity::uuid),d->>'role',array(select jsonb_array_elements_text(d->'modules')),(d->>'active')::boolean)
   on conflict(id) do update set name=excluded.name,role=excluded.role,modules=excluded.modules,active=excluded.active;
  elsif kind='training' then
   insert into public.cer_training(id,published,data) values(entity,(d->>'published')::boolean,d)
   on conflict(id) do update set published=excluded.published,data=excluded.data;
  elsif kind='settings' then
   if jsonb_typeof(d->'advanceDays') is distinct from 'number' or (d->>'advanceDays')::integer not in (3,7,14,30) or jsonb_typeof(d->'organization') is distinct from 'string' or jsonb_typeof(d->'location') is distinct from 'string' or length(trim(d->>'organization')) not between 2 and 200 or length(trim(d->>'location')) not between 2 and 200 then raise exception 'INVALID_SETTINGS'; end if;
   update public.cer_settings set data=d where id;
  elsif kind='record' then
   if not cer_private.module_access(m) then raise exception 'MODULE_FORBIDDEN' using errcode='42501'; end if;
   select definition into form_definition from public.cer_modules where id=m;
   if form_definition is null then raise exception 'INVALID_MODULE'; end if;
   source:=null;
   if nullif(d->>'supersedesId','') is not null then
    if not cer_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
    select * into source from public.cer_records where id=d->>'supersedesId' for update;
    if source.id is null or source.status<>'active' then raise exception 'RECORD_NOT_CURRENT'; end if;
    if source.module<>m or source.equipment_id<>d->>'equipmentId' or source.task_id is distinct from nullif(d->>'taskId','') or source.date<>(d->>'date')::date then raise exception 'IDENTITY_LOCKED'; end if;
    form_definition:=source.form_definition;
   end if;
   if jsonb_typeof(d->'values') is distinct from 'object' or exists(select 1 from jsonb_each(d->'values') v where jsonb_typeof(v.value)<>'string') then raise exception 'INVALID_VALUES'; end if;
   if (d->>'date')::date > (now() at time zone 'America/Argentina/Cordoba')::date then raise exception 'FUTURE_RECORD'; end if;
   has_issue:=d->>'result'='attention';
   for field in select f.value from jsonb_array_elements(form_definition->'sections') s cross join lateral jsonb_array_elements(s.value->'fields') f loop
    val:=d->'values'->>(field->>'id');
    if coalesce((field->>'optional')::boolean,false)=false and coalesce(trim(val),'')='' then raise exception 'REQUIRED_FIELD:%',field->>'id'; end if;
    if coalesce(val,'')<>'' then
     if field->>'type'='number' and (val !~ '^[0-9]+([.][0-9]+)?$' or length(val)>24) then raise exception 'INVALID_NUMBER'; end if;
     if field->>'type'='check' and val not in ('OK','MAL') then raise exception 'INVALID_CHOICE'; end if;
     if field->>'type'='yesno' and val not in ('Sí','No','SI','NO') then raise exception 'INVALID_CHOICE'; end if;
     if field->>'type'='switch' and val not in ('START','STOP') then raise exception 'INVALID_CHOICE'; end if;
     if val='MAL' then has_issue:=true; end if;
    end if;
   end loop;
   if has_issue and length(trim(coalesce(d->>'notes','')))=0 then raise exception 'NOTES_REQUIRED'; end if;
   if source.id is null and exists(select 1 from public.cer_records where equipment_id=d->>'equipmentId' and date=(d->>'date')::date and status='active' and (nullif(d->>'taskId','') is null or task_id=nullif(d->>'taskId',''))) and not coalesce((c->>'duplicateApproved')::boolean,false) then raise exception 'DUPLICATE_CONFIRMATION_REQUIRED';
   end if;
   insert into public.cer_records(id,module,equipment_id,task_id,date,user_id,result,values,form_definition,notes,revision,supersedes_id)
   values(entity,m,d->>'equipmentId',nullif(d->>'taskId',''),(d->>'date')::date,actor,case when has_issue then 'attention' else 'ok' end,d->'values',form_definition,trim(coalesce(d->>'notes','')),coalesce(source.revision,0)+1,source.id) returning * into r;
   if source.id is not null then update public.cer_records set status='superseded',superseded_by_id=r.id where id=source.id;
   elsif r.task_id is not null then
    select * into t from public.cer_tasks where id=r.task_id for update;
    if t.id is null or not coalesce((t.data->>'active')::boolean,false) then raise exception 'TASK_INACTIVE'; end if;
    if t.frequency='Única' then update public.cer_tasks set data=data||jsonb_build_object('active',false,'lastCompleted',r.date) where id=t.id;
    else
     if t.schedule_basis is null then raise exception 'RECURRENCE_RULE_REQUIRED'; end if;
     basis:=case t.schedule_basis when 'completion' then r.date else t.due end;
     nextdate:=cer_private.next_due(basis,t.frequency,case t.schedule_basis when 'completion' then extract(day from r.date)::integer else t.anchor_day end);
     n:=0;
     while nextdate<=r.date loop
      nextdate:=cer_private.next_due(nextdate,t.frequency,t.anchor_day); n:=n+1;
      if n>10000 then raise exception 'INVALID_SCHEDULE'; end if;
     end loop;
     update public.cer_tasks set due=nextdate,data=data||jsonb_build_object('lastCompleted',r.date) where id=t.id;
    end if;
   end if;
   if jsonb_array_length(coalesce(d->'photos','[]'))>6 then raise exception 'TOO_MANY_PHOTOS'; end if;
   for a in select value from jsonb_array_elements(coalesce(d->'photos','[]')) loop
    if not exists(select 1 from storage.objects o where o.bucket_id='cer-evidence' and o.name=a->>'storagePath' and split_part(o.name,'/',1)=m and (split_part(o.name,'/',2)=actor::text or exists(select 1 from public.cer_attachments x join public.cer_records rr on rr.id=x.record_id where x.path=o.name and rr.id=source.id))) then raise exception 'INVALID_ATTACHMENT'; end if;
    insert into public.cer_attachments(record_id,path,name,mime,category) values(r.id,a->>'storagePath',a->>'name',a->>'type',a->>'category');
   end loop;
  elsif kind='void' then
   select * into r from public.cer_records where id=entity for update;
   if r.id is null or r.status<>'active' then raise exception 'RECORD_NOT_CURRENT'; end if;
   if length(trim(coalesce(d->>'voidReason','')))<10 then raise exception 'VOID_REASON_REQUIRED'; end if;
   update public.cer_records set status='voided',voided_at=now(),voided_by=actor,void_reason=trim(d->>'voidReason') where id=entity;
   m:=r.module;
  else raise exception 'INVALID_COMMAND'; end if;
  insert into public.cer_audit_events(actor_id,action,entity_id,entity_type,module,summary,related_entity_id)
  values(actor,case kind when 'record' then case when source.id is null then 'record.created' else 'record.corrected' end when 'void' then 'record.voided' else kind||'.saved' end,coalesce(entity,'settings'),case when kind in ('record','void') then 'maintenance-record' else kind end,m,case when kind='void' then 'Anuló el registro: '||trim(d->>'voidReason') else 'Guardó '||kind end,case when kind='record' then source.id else null end);
 end loop;
 update public.cer_settings set revision=revision+1 where id returning revision into current_revision;
 insert into cer_private.operations values(actor,op,md5(commands::text),current_revision);
 return current_revision;
end $$;
revoke all on function cer_private.next_due(date,text,integer),cer_private.apply_changes(uuid,bigint,jsonb) from public,anon;
grant execute on function cer_private.apply_changes(uuid,bigint,jsonb) to authenticated;
create function public.cer_apply_changes(p_operation_id uuid,p_expected_revision bigint,p_commands jsonb) returns bigint language sql security invoker set search_path='' as $$
 select cer_private.apply_changes(p_operation_id,p_expected_revision,p_commands)
$$;
revoke all on function public.cer_apply_changes(uuid,bigint,jsonb) from public,anon;
grant execute on function public.cer_apply_changes(uuid,bigint,jsonb) to authenticated;
insert into public.cer_modules(id,definition) values
('generator', '{"id":"generator","name":"Grupo electrógeno","short":"Grupo electrógeno","description":"Control preventivo y prueba de funcionamiento.","color":"amber","icon":"Zap","frequency":"Mensual","defined":true,"sections":[{"title":"Equipo parado","description":"Verificaciones previas a la puesta en marcha.","fields":[{"id":"radiator","label":"Nivel de agua del radiador","type":"check"},{"id":"oil","label":"Nivel de aceite","type":"check"},{"id":"fuel","label":"Nivel de combustible","type":"check","hint":"Referencia de la planilla: más de 15 litros."},{"id":"filters","label":"Estado y limpieza de filtros de aire","type":"check"},{"id":"battery","label":"Estado de la batería","type":"check"},{"id":"leaks","label":"Ausencia de pérdidas líquidas","type":"check"},{"id":"board","label":"Tablero de transferencia","type":"check"},{"id":"transfer","label":"Simulación de transferencia","type":"check"}]},{"title":"Marcha en vacío","description":"Registrar las mediciones luego de más de 5 minutos de marcha.","fields":[{"id":"hours","label":"Horas de funcionamiento","type":"number","unit":"h","hint":"Lectura acumulada del horómetro."},{"id":"voltage","label":"Voltaje de batería","type":"number","unit":"V","hint":"Referencia de la planilla: 13 V."},{"id":"pressure","label":"Presión de aceite","type":"number","unit":"PSI","hint":"Referencia de la planilla: 60 PSI."},{"id":"frequency","label":"Frecuencia","type":"number","unit":"Hz","hint":"Referencia de la planilla: 50/60 Hz."},{"id":"tension","label":"Tensión","type":"number","unit":"V","hint":"Referencia de la planilla: 210–230 V."},{"id":"other","label":"Otras verificaciones","type":"text","optional":true}]}]}'::jsonb),
('osmosis', '{"id":"osmosis","name":"Ósmosis y mixer","short":"Ósmosis diaria","description":"Seguimiento diario de ósmosis inversa y preparación del mixer.","color":"blue","icon":"Droplets","frequency":"Diaria","defined":true,"sections":[{"title":"Control diario","fields":[{"id":"pressures","label":"Control de presiones","type":"check"},{"id":"pumps","label":"Bombas en funcionamiento","type":"check"},{"id":"leaks","label":"Sin pérdidas de agua","type":"check"},{"id":"rejection","label":"Relación de rechazo","type":"number","unit":"%","hint":"Referencia de la planilla: mayor a 96. Validar unidad con CER."},{"id":"conductivity","label":"Conductividad","type":"number","hint":"Referencia de la planilla: menor a 20. Unidad pendiente de confirmar."},{"id":"temperature","label":"Temperatura menor a 25 °C","type":"check"},{"id":"salt","label":"Revisión de sal","type":"check"},{"id":"saltAdded","label":"Sal agregada","type":"number","unit":"kg","optional":true}]},{"title":"Verificaciones periódicas","description":"Completar únicamente las tareas realizadas en esta fecha.","fields":[{"id":"hardness","label":"Medición de dureza / cloro","type":"check","hint":"Frecuencia semanal.","optional":true},{"id":"microfilters","label":"Cambio de microfiltros","type":"yesno","hint":"Frecuencia mensual.","optional":true},{"id":"bacteriology","label":"Control bacteriológico","type":"yesno","hint":"Frecuencia mensual.","optional":true},{"id":"physicochemical","label":"Control fisicoquímico","type":"yesno","hint":"Dos veces al año.","optional":true}]},{"title":"Mixer · turno mañana","description":"Completar cuando corresponda al turno. La autoría queda identificada por el usuario del registro.","fields":[{"id":"mixerMorningLiters","label":"Bicarbonato preparado","type":"number","unit":"L","optional":true},{"id":"mixerMorningDensity","label":"Densidad","type":"number","hint":"Referencia de la planilla: 1,037–1,057.","optional":true}]},{"title":"Mixer · turno tarde","description":"Completar cuando corresponda al turno. La autoría queda identificada por el usuario del registro.","fields":[{"id":"mixerAfternoonLiters","label":"Bicarbonato preparado","type":"number","unit":"L","optional":true},{"id":"mixerAfternoonDensity","label":"Densidad","type":"number","hint":"Referencia de la planilla: 1,037–1,057.","optional":true}]},{"title":"Desinfección diaria del mixer","description":"Registrar la preparación y el control indicados en la planilla.","fields":[{"id":"mixerHypochlorite","label":"Hipoclorito utilizado","type":"number","unit":"L","hint":"Referencia de la planilla: 4 L en 400 L de agua.","optional":true},{"id":"mixerDisinfectionWater","label":"Agua utilizada","type":"number","unit":"L","hint":"Referencia de la planilla: 400 L.","optional":true},{"id":"mixerChlorineTest","label":"Test de cloro","type":"check","optional":true}]}]}'::jsonb),
('loop', '{"id":"loop","name":"Loop y bombas","short":"Loop y bombas","description":"Desinfección y rotación quincenal de bombas por sector.","color":"teal","icon":"RefreshCw","frequency":"Quincenal","defined":true,"sections":[{"title":"Desinfección quincenal de Loop y Mixer","description":"Ensayos posteriores a la desinfección. Completar los que correspondan al procedimiento realizado.","fields":[{"id":"disinfection-1","label":"Drenaje del tanque de agua de O.I.: test de cloro / ácido peracético","type":"check","hint":"Referencia de la planilla: 0 ppm.","optional":true},{"id":"disinfection-2","label":"Máquina de sala A: test de cloro / ácido peracético","type":"check","hint":"Referencia de la planilla: 0 ppm.","optional":true},{"id":"disinfection-3","label":"Máquina de sala B: test de cloro / ácido peracético","type":"check","hint":"Referencia de la planilla: 0 ppm.","optional":true},{"id":"disinfection-4","label":"Máquina de sala D: test de cloro / ácido peracético","type":"check","hint":"Referencia de la planilla: 0 ppm.","optional":true},{"id":"disinfection-5","label":"Máquina de sala C: test de cloro / ácido peracético","type":"check","hint":"Referencia de la planilla: 0 ppm.","optional":true},{"id":"disinfection-6","label":"Lavado manual de sala de filtros: test de cloro / ácido peracético","type":"check","optional":true},{"id":"disinfection-7","label":"Salida del bicarbonato: test de cloro / ácido peracético","type":"check","hint":"Referencia de la planilla: 0 ppm.","optional":true},{"id":"disinfection-8","label":"Drenaje de agua O.I. en sala Mixer: test de cloro / ácido peracético","type":"check","hint":"Referencia de la planilla: 0 ppm.","optional":true}]},{"title":"Planta baja","fields":[{"id":"pump-0-1","label":"Bomba N.º 1","type":"switch"},{"id":"pump-0-2","label":"Bomba N.º 2","type":"switch"}]},{"title":"Pretratamiento","fields":[{"id":"pump-1-1","label":"Bomba N.º 1","type":"switch"},{"id":"pump-1-2","label":"Bomba N.º 2","type":"switch"}]},{"title":"Loop","fields":[{"id":"pump-2-1","label":"Bomba N.º 1","type":"switch"},{"id":"pump-2-2","label":"Bomba N.º 2","type":"switch"}]}]}'::jsonb),
('crash', '{"id":"crash","name":"Carro de paro","short":"Carro de paro","description":"Verificación del equipo y los insumos.","color":"rose","icon":"HeartPulse","frequency":"Mensual","defined":false,"sections":[{"title":"Registro de intervención","description":"Ficha inicial. El checklist específico se incorporará con la planilla de CER.","fields":[{"id":"work","label":"Trabajo o control realizado","type":"text"},{"id":"provider","label":"Proveedor o técnico interviniente","type":"text","optional":true}]}]}'::jsonb),
('fumigation', '{"id":"fumigation","name":"Fumigación","short":"Fumigación","description":"Intervenciones y control de plagas.","color":"purple","icon":"Bug","frequency":"Bimestral","defined":false,"sections":[{"title":"Registro de intervención","description":"Ficha inicial. El checklist específico se incorporará con la planilla de CER.","fields":[{"id":"work","label":"Trabajo o control realizado","type":"text"},{"id":"provider","label":"Proveedor o técnico interviniente","type":"text","optional":true}]}]}'::jsonb),
('electrical', '{"id":"electrical","name":"Electricidad","short":"Electricidad","description":"Instalaciones, iluminación y puesta a tierra.","color":"amber","icon":"Plug","frequency":"Anual","defined":false,"sections":[{"title":"Registro de intervención","description":"Ficha inicial. El checklist específico se incorporará con la planilla de CER.","fields":[{"id":"work","label":"Trabajo o control realizado","type":"text"},{"id":"provider","label":"Proveedor o técnico interviniente","type":"text","optional":true}]}]}'::jsonb),
('rooms', '{"id":"rooms","name":"Salas","short":"Salas","description":"Condiciones e instalaciones de cada sector.","color":"blue","icon":"Building2","frequency":"Mensual","defined":false,"sections":[{"title":"Registro de intervención","description":"Ficha inicial. El checklist específico se incorporará con la planilla de CER.","fields":[{"id":"work","label":"Trabajo o control realizado","type":"text"},{"id":"provider","label":"Proveedor o técnico interviniente","type":"text","optional":true}]}]}'::jsonb),
('general', '{"id":"general","name":"Otros mantenimientos","short":"Otros mantenimientos","description":"Seguridad, servicios y controles generales.","color":"slate","icon":"Wrench","frequency":"Mensual","defined":false,"sections":[{"title":"Registro de intervención","description":"Ficha inicial. El checklist específico se incorporará con la planilla de CER.","fields":[{"id":"work","label":"Trabajo o control realizado","type":"text"},{"id":"provider","label":"Proveedor o técnico interviniente","type":"text","optional":true}]}]}'::jsonb);
