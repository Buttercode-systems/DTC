-- Transactional import batches for every TAD department.

create table if not exists public.department_import_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  engagement_id uuid not null references public.service_engagements(id) on delete cascade,
  department text not null check (department in ('invoice','sales','client','property','practice','member')),
  filename text,
  row_count integer not null default 0,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  status text not null default 'processing' check (status in ('processing','completed','failed','rolled_back')),
  errors jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.department_import_batches enable row level security;
create index if not exists department_import_batches_business_idx
  on public.department_import_batches(business_id,created_at desc);

create policy "department import read" on public.department_import_batches
  for select to authenticated using (public.can_access_business(business_id));
create policy "department import create" on public.department_import_batches
  for insert to authenticated with check (public.can_work_business(business_id) and created_by = auth.uid());
create policy "department import update" on public.department_import_batches
  for update to authenticated using (public.can_work_business(business_id))
  with check (public.can_work_business(business_id));

grant select,insert,update on public.department_import_batches to authenticated;

create or replace function public.import_tad_department_rows(
  p_business_id uuid,
  p_department text,
  p_filename text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_engagement public.service_engagements%rowtype;
  v_template public.service_workflow_templates%rowtype;
  v_batch public.department_import_batches%rowtype;
  v_row jsonb;
  v_index integer := 0;
  v_imported integer := 0;
  v_skipped integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_reference text;
  v_title text;
  v_status text;
  v_priority integer;
  v_due_date date;
  v_data jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.can_work_business(p_business_id,v_uid) then raise exception 'work access required'; end if;
  if p_department not in ('invoice','sales','client','property','practice','member') then raise exception 'invalid department'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'rows must be an array'; end if;
  if jsonb_array_length(p_rows) = 0 then raise exception 'at least one row required'; end if;
  if jsonb_array_length(p_rows) > 1000 then raise exception 'maximum 1000 rows per import'; end if;

  select * into v_engagement
  from public.service_engagements
  where business_id = p_business_id and department = p_department and enabled;
  if v_engagement.id is null then raise exception 'department not active'; end if;

  select * into v_template from public.service_workflow_templates where key = v_engagement.template_key and active;
  if v_template.key is null then raise exception 'workflow template not found'; end if;

  insert into public.department_import_batches(
    business_id,engagement_id,department,filename,row_count,status,created_by
  ) values (
    p_business_id,v_engagement.id,p_department,left(coalesce(p_filename,'import.csv'),240),jsonb_array_length(p_rows),'processing',v_uid
  ) returning * into v_batch;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_index := v_index + 1;
    begin
      v_title := nullif(trim(coalesce(v_row ->> 'title','')),'');
      if v_title is null then raise exception 'title required'; end if;

      v_reference := nullif(trim(coalesce(v_row ->> 'reference','')),'');
      if v_reference is null then
        v_reference := upper(p_department) || '-' || to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS') || '-' || lpad(v_index::text,4,'0');
      end if;

      v_status := nullif(trim(coalesce(v_row ->> 'status','')),'');
      if v_status is null then v_status := v_template.config -> 'statuses' ->> 0; end if;
      if not (v_template.config -> 'statuses' ? v_status) then raise exception 'invalid status: %',v_status; end if;

      begin
        v_priority := coalesce(nullif(v_row ->> 'priority','')::integer,50);
      exception when others then
        raise exception 'invalid priority';
      end;
      if v_priority < 0 or v_priority > 100 then raise exception 'priority must be 0 to 100'; end if;

      begin
        v_due_date := nullif(v_row ->> 'due_date','')::date;
      exception when others then
        raise exception 'invalid due_date';
      end;

      v_data := coalesce(v_row -> 'data','{}'::jsonb);
      if jsonb_typeof(v_data) <> 'object' then raise exception 'data must be an object'; end if;

      insert into public.service_work_items(
        business_id,engagement_id,department,reference,title,status,assigned_name,
        priority,next_action,due_date,blocked_reason,data
      ) values (
        p_business_id,v_engagement.id,p_department,left(v_reference,80),left(v_title,240),v_status,
        nullif(left(trim(coalesce(v_row ->> 'assigned_name','')),200),''),v_priority,
        nullif(left(trim(coalesce(v_row ->> 'next_action','')),500),''),v_due_date,
        nullif(left(trim(coalesce(v_row ->> 'blocked_reason','')),500),''),v_data
      );
      v_imported := v_imported + 1;
    exception
      when unique_violation then
        v_skipped := v_skipped + 1;
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('row',v_index,'error','duplicate reference'));
      when others then
        v_skipped := v_skipped + 1;
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('row',v_index,'error',sqlerrm));
    end;
  end loop;

  update public.department_import_batches
  set imported_count = v_imported,
      skipped_count = v_skipped,
      status = 'completed',
      errors = v_errors,
      completed_at = now()
  where id = v_batch.id;

  perform public.sync_service_workflow_actions(p_business_id);

  return jsonb_build_object(
    'batch_id',v_batch.id,
    'department',p_department,
    'rows',jsonb_array_length(p_rows),
    'imported',v_imported,
    'skipped',v_skipped,
    'errors',v_errors
  );
exception
  when others then
    if v_batch.id is not null then
      update public.department_import_batches
      set status = 'failed',errors = jsonb_build_array(jsonb_build_object('error',sqlerrm)),completed_at = now()
      where id = v_batch.id;
    end if;
    raise;
end;
$$;

grant execute on function public.import_tad_department_rows(uuid,text,text,jsonb) to authenticated;
