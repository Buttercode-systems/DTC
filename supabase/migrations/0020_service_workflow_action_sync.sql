create or replace function public.sync_service_workflow_actions(p_business_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid:=auth.uid();
  v_inserted integer:=0;
begin
  if v_uid is null or not public.can_work_business(p_business_id,v_uid) then
    raise exception 'business work access required';
  end if;

  update public.actions a
  set status='dismissed'
  where a.business_id=p_business_id
    and a.kind='service_workflow'
    and a.status='open'
    and not exists(
      select 1
      from public.service_work_items wi
      join public.service_workflow_templates wt on wt.department=wi.department and wt.active
      where wi.id=a.entity_id
        and wi.business_id=p_business_id
        and not exists(
          select 1 from jsonb_array_elements_text(wt.config->'closed_statuses') closed(value)
          where closed.value=wi.status
        )
        and not exists(
          select 1 from public.actions pending
          where pending.business_id=wi.business_id
            and pending.entity_table='service_work_items'
            and pending.entity_id=wi.id
            and pending.kind='manual_followup'
            and pending.status in('open','snoozed')
        )
        and (
          (wi.due_date is not null and wi.due_date<=current_date)
          or wi.blocked_reason is not null
          or coalesce(trim(wi.assigned_name),'')=''
          or coalesce(trim(wi.next_action),'')=''
        )
        and a.key=concat(
          'service_workflow:',wi.id::text,':',
          coalesce(wi.due_date,current_date)::text,':',
          substr(md5(wi.status||coalesce(wi.next_action,'')||coalesce(wi.blocked_reason,'')||coalesce(wi.assigned_name,'')),1,8)
        )
    );

  insert into public.actions(
    business_id,key,kind,title,detail,priority,
    entity_table,entity_id,contact_phone,due_date,
    status,assigned_to,source
  )
  select
    wi.business_id,
    concat(
      'service_workflow:',wi.id::text,':',
      coalesce(wi.due_date,current_date)::text,':',
      substr(md5(wi.status||coalesce(wi.next_action,'')||coalesce(wi.blocked_reason,'')||coalesce(wi.assigned_name,'')),1,8)
    ),
    'service_workflow',
    case
      when wi.blocked_reason is not null then 'Resolve blocker — '
      when coalesce(trim(wi.assigned_name),'')='' then 'Assign owner — '
      else 'Move next action — '
    end||wi.reference||' · '||wi.title,
    case
      when wi.blocked_reason is not null then 'Blocked: '||wi.blocked_reason
      when coalesce(trim(wi.assigned_name),'')='' then 'No owner is assigned. Assign one person before work continues.'
      when coalesce(trim(wi.next_action),'')='' then 'No next action is recorded. Decide what happens next.'
      else wi.next_action
    end,
    case
      when wi.blocked_reason is not null then 95
      when coalesce(trim(wi.assigned_name),'')='' then 90
      when wi.due_date<current_date then least(100,85+(current_date-wi.due_date))
      else wi.priority
    end,
    'service_work_items',wi.id,null,
    coalesce(wi.due_date,current_date),
    'open',wi.assigned_to,'workflow'
  from public.service_work_items wi
  join public.service_workflow_templates wt on wt.department=wi.department and wt.active
  where wi.business_id=p_business_id
    and not exists(
      select 1 from jsonb_array_elements_text(wt.config->'closed_statuses') closed(value)
      where closed.value=wi.status
    )
    and not exists(
      select 1 from public.actions pending
      where pending.business_id=wi.business_id
        and pending.entity_table='service_work_items'
        and pending.entity_id=wi.id
        and pending.kind='manual_followup'
        and pending.status in('open','snoozed')
    )
    and (
      (wi.due_date is not null and wi.due_date<=current_date)
      or wi.blocked_reason is not null
      or coalesce(trim(wi.assigned_name),'')=''
      or coalesce(trim(wi.next_action),'')=''
    )
  on conflict(business_id,key) do nothing;

  get diagnostics v_inserted=row_count;
  return v_inserted;
end;
$$;

create or replace function public.sync_all_managed_workflow_actions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid:=auth.uid();
  v_business record;
  v_total integer:=0;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then
    raise exception 'operator access required';
  end if;

  for v_business in
    select id from public.businesses
    where managed_by_tad and service_status<>'closed'
  loop
    v_total:=v_total+public.sync_service_workflow_actions(v_business.id);
  end loop;

  return v_total;
end;
$$;

revoke all on function public.sync_service_workflow_actions(uuid) from public,anon;
revoke all on function public.sync_all_managed_workflow_actions() from public,anon;
grant execute on function public.sync_service_workflow_actions(uuid) to authenticated;
grant execute on function public.sync_all_managed_workflow_actions() to authenticated;
