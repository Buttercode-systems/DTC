create or replace function public.get_service_workflow(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_uid uuid:=auth.uid();
  v_business public.businesses%rowtype;
  v_engagement public.service_engagements%rowtype;
  v_template public.service_workflow_templates%rowtype;
begin
  if v_uid is null or not public.can_access_business(p_business_id,v_uid) then
    raise exception 'business not accessible';
  end if;

  select * into v_business from public.businesses where id=p_business_id;
  select * into v_engagement
  from public.service_engagements
  where business_id=p_business_id
  order by created_at desc
  limit 1;
  if v_engagement.id is null then raise exception 'service engagement not found'; end if;

  select * into v_template
  from public.service_workflow_templates
  where key=coalesce(v_engagement.template_key,v_engagement.department||'-admin-v1')
    and active;
  if v_template.key is null then raise exception 'workflow template not found'; end if;

  return jsonb_build_object(
    'business',jsonb_build_object(
      'id',v_business.id,
      'name',v_business.name,
      'industry',v_business.industry,
      'service_status',v_business.service_status
    ),
    'engagement',jsonb_build_object(
      'id',v_engagement.id,
      'department',v_engagement.department,
      'service_level',v_engagement.service_level,
      'status',v_engagement.status,
      'next_review_date',v_engagement.next_review_date
    ),
    'template',jsonb_build_object(
      'key',v_template.key,
      'name',v_template.name,
      'version',v_template.version,
      'config',v_template.config
    ),
    'items',coalesce((
      select jsonb_agg(row_to_json(x) order by x.priority desc,x.due_date nulls last,x.updated_at desc)
      from(
        select wi.id,wi.business_id,wi.engagement_id,wi.department,
               wi.reference,wi.title,wi.status,wi.assigned_to,
               wi.assigned_name,wi.priority,wi.next_action,
               wi.due_date,wi.blocked_reason,wi.data,
               wi.last_outcome_code,wi.last_outcome_note,
               wi.completed_at,wi.created_at,wi.updated_at
        from public.service_work_items wi
        where wi.business_id=p_business_id
          and wi.engagement_id=v_engagement.id
      )x
    ),'[]'::jsonb)
  );
end;
$$;

create or replace function public.create_service_work_item(
  p_business_id uuid,
  p_engagement_id uuid,
  p_reference text,
  p_title text,
  p_status text default null,
  p_assigned_name text default null,
  p_priority integer default 50,
  p_next_action text default null,
  p_due_date date default null,
  p_blocked_reason text default null,
  p_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid:=auth.uid();
  v_engagement public.service_engagements%rowtype;
  v_template public.service_workflow_templates%rowtype;
  v_status text;
  v_reference text;
  v_item public.service_work_items%rowtype;
begin
  if v_uid is null or not public.can_work_business(p_business_id,v_uid) then
    raise exception 'business work access required';
  end if;
  if nullif(trim(p_title),'') is null then raise exception 'title required'; end if;

  select * into v_engagement
  from public.service_engagements
  where id=p_engagement_id and business_id=p_business_id;
  if v_engagement.id is null then raise exception 'engagement not found'; end if;

  select * into v_template
  from public.service_workflow_templates
  where key=coalesce(v_engagement.template_key,v_engagement.department||'-admin-v1')
    and active;
  if v_template.key is null then raise exception 'workflow template not found'; end if;

  v_status:=coalesce(nullif(trim(p_status),''),v_template.config->'statuses'->>0);
  if not exists(
    select 1 from jsonb_array_elements_text(v_template.config->'statuses') s(value)
    where s.value=v_status
  ) then raise exception 'invalid workflow status'; end if;

  v_reference:=coalesce(
    nullif(trim(p_reference),''),
    upper(left(v_engagement.department,3))||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))
  );

  insert into public.service_work_items(
    business_id,engagement_id,department,reference,title,status,
    assigned_name,priority,next_action,due_date,blocked_reason,data
  ) values(
    p_business_id,p_engagement_id,v_engagement.department,
    left(v_reference,80),left(trim(p_title),240),v_status,
    nullif(trim(p_assigned_name),''),greatest(0,least(coalesce(p_priority,50),100)),
    nullif(trim(p_next_action),''),p_due_date,
    nullif(trim(p_blocked_reason),''),coalesce(p_data,'{}'::jsonb)
  ) returning * into v_item;

  insert into public.service_work_item_events(
    work_item_id,business_id,actor_id,event_type,to_status,note,metadata
  ) values(
    v_item.id,p_business_id,v_uid,'created',v_item.status,
    'Work item created',jsonb_build_object('reference',v_item.reference)
  );

  return to_jsonb(v_item);
end;
$$;

revoke all on function public.get_service_workflow(uuid) from public,anon;
revoke all on function public.create_service_work_item(uuid,uuid,text,text,text,text,integer,text,date,text,jsonb) from public,anon;
grant execute on function public.get_service_workflow(uuid) to authenticated;
grant execute on function public.create_service_work_item(uuid,uuid,text,text,text,text,integer,text,date,text,jsonb) to authenticated;
