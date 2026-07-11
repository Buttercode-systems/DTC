create or replace function public.update_service_work_item(
  p_work_item_id uuid,
  p_status text,
  p_assigned_name text default null,
  p_priority integer default 50,
  p_next_action text default null,
  p_due_date date default null,
  p_blocked_reason text default null,
  p_data jsonb default '{}'::jsonb,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid:=auth.uid();
  v_before public.service_work_items%rowtype;
  v_after public.service_work_items%rowtype;
  v_template public.service_workflow_templates%rowtype;
  v_closed boolean;
begin
  select * into v_before
  from public.service_work_items
  where id=p_work_item_id
  for update;

  if v_before.id is null then raise exception 'work item not found'; end if;
  if v_uid is null or not public.can_work_business(v_before.business_id,v_uid) then
    raise exception 'business work access required';
  end if;

  select * into v_template
  from public.service_workflow_templates
  where department=v_before.department and active;
  if v_template.key is null then raise exception 'workflow template not found'; end if;

  if not exists(
    select 1 from jsonb_array_elements_text(v_template.config->'statuses') s(value)
    where s.value=p_status
  ) then raise exception 'invalid workflow status'; end if;

  select exists(
    select 1 from jsonb_array_elements_text(v_template.config->'closed_statuses') s(value)
    where s.value=p_status
  ) into v_closed;

  update public.service_work_items
  set status=p_status,
      assigned_name=nullif(trim(p_assigned_name),''),
      priority=greatest(0,least(coalesce(p_priority,priority),100)),
      next_action=nullif(trim(p_next_action),''),
      due_date=p_due_date,
      blocked_reason=nullif(trim(p_blocked_reason),''),
      data=coalesce(p_data,data),
      completed_at=case when v_closed then coalesce(completed_at,now()) else null end,
      updated_at=now()
  where id=p_work_item_id
  returning * into v_after;

  insert into public.service_work_item_events(
    work_item_id,business_id,actor_id,event_type,
    from_status,to_status,note,metadata
  ) values(
    v_after.id,v_after.business_id,v_uid,
    case when v_before.status is distinct from v_after.status then 'status_changed' else 'updated' end,
    v_before.status,v_after.status,nullif(trim(p_note),''),
    jsonb_build_object(
      'due_date',v_after.due_date,
      'assigned_name',v_after.assigned_name,
      'blocked',v_after.blocked_reason is not null
    )
  );

  return to_jsonb(v_after);
end;
$$;

revoke all on function public.update_service_work_item(uuid,text,text,integer,text,date,text,jsonb,text) from public,anon;
grant execute on function public.update_service_work_item(uuid,text,text,integer,text,date,text,jsonb,text) to authenticated;
