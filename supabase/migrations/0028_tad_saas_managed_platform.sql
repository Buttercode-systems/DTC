-- TAD SaaS + TAD Managed platform foundation.
-- One business can activate all six departments and choose self-service,
-- managed or hybrid delivery department by department.

alter table public.businesses
  add column if not exists delivery_mode text not null default 'self_service'
    check (delivery_mode in ('self_service','managed','hybrid')),
  add column if not exists onboarding_status text not null default 'not_started'
    check (onboarding_status in ('not_started','in_progress','ready','complete')),
  add column if not exists timezone text not null default 'Africa/Johannesburg',
  add column if not exists currency text not null default 'ZAR';

alter table public.service_engagements
  add column if not exists delivery_mode text not null default 'self_service'
    check (delivery_mode in ('self_service','managed')),
  add column if not exists enabled boolean not null default true,
  add column if not exists configured_at timestamptz,
  add column if not exists activated_by uuid references auth.users(id) on delete set null;

create table if not exists public.workspace_plans (
  key text primary key,
  name text not null,
  active boolean not null default true,
  includes_all_departments boolean not null default true,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.workspace_plans enable row level security;

create table if not exists public.workspace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  plan_key text not null references public.workspace_plans(key),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','grace_period','suspended','cancelled','archived')),
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.workspace_subscriptions enable row level security;
create index if not exists workspace_subscriptions_status_idx
  on public.workspace_subscriptions(status,current_period_ends_at);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  role text not null check (role in ('manager','member','viewer')),
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id,email,status)
);
alter table public.workspace_invitations enable row level security;
create index if not exists workspace_invitations_business_idx
  on public.workspace_invitations(business_id,status,expires_at);

insert into public.workspace_plans(key,name,includes_all_departments,limits)
values
  ('starter','TAD SaaS Starter',true,'{"users":3,"active_records":1000,"imports_per_month":10,"report_history_months":6}'::jsonb),
  ('business','TAD SaaS Business',true,'{"users":15,"active_records":10000,"imports_per_month":100,"report_history_months":24}'::jsonb),
  ('managed','TAD Managed',true,'{"users":50,"active_records":50000,"imports_per_month":500,"report_history_months":60}'::jsonb)
on conflict (key) do update
set name = excluded.name,
    includes_all_departments = excluded.includes_all_departments,
    limits = excluded.limits,
    active = true,
    updated_at = now();

create policy "workspace plans authenticated read" on public.workspace_plans
  for select to authenticated using (active);

create policy "workspace subscription read" on public.workspace_subscriptions
  for select to authenticated using (public.can_access_business(business_id));
create policy "workspace subscription operator manage" on public.workspace_subscriptions
  for all to authenticated using (public.is_tad_operator())
  with check (public.is_tad_operator());

create policy "workspace invitation read" on public.workspace_invitations
  for select to authenticated using (
    public.can_manage_business(business_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
  );
create policy "workspace invitation create" on public.workspace_invitations
  for insert to authenticated with check (
    public.can_manage_business(business_id)
    and invited_by = auth.uid()
  );
create policy "workspace invitation update" on public.workspace_invitations
  for update to authenticated using (
    public.can_manage_business(business_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
  ) with check (
    public.can_manage_business(business_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
  );

grant select on public.workspace_plans to authenticated;
grant select on public.workspace_subscriptions to authenticated;
grant select,insert,update on public.workspace_invitations to authenticated;

create or replace function public.activate_tad_department(
  p_business_id uuid,
  p_department text,
  p_delivery_mode text default 'self_service'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_template public.service_workflow_templates%rowtype;
  v_engagement public.service_engagements%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.can_manage_business(p_business_id,v_uid) then
    raise exception 'manager access required';
  end if;
  if p_department not in ('invoice','sales','client','property','practice','member') then
    raise exception 'invalid department';
  end if;
  if p_delivery_mode not in ('self_service','managed') then
    raise exception 'invalid delivery mode';
  end if;

  select * into v_template
  from public.service_workflow_templates
  where department = p_department and active
  order by version desc
  limit 1;

  if v_template.key is null then raise exception 'workflow template not found'; end if;

  insert into public.service_engagements(
    business_id,department,service_level,status,workflow_config,
    template_key,delivery_mode,enabled,configured_at,activated_by,start_date,next_review_date
  ) values (
    p_business_id,p_department,
    case when p_delivery_mode = 'managed' then 'managed' else 'support' end,
    'active',v_template.config,v_template.key,p_delivery_mode,true,now(),v_uid,current_date,current_date + 7
  )
  on conflict (business_id,department) do update
    set template_key = excluded.template_key,
        workflow_config = excluded.workflow_config,
        delivery_mode = excluded.delivery_mode,
        service_level = excluded.service_level,
        enabled = true,
        status = case when public.service_engagements.status in ('cancelled','completed') then 'active' else public.service_engagements.status end,
        configured_at = coalesce(public.service_engagements.configured_at,now()),
        activated_by = coalesce(public.service_engagements.activated_by,v_uid),
        updated_at = now()
  returning * into v_engagement;

  update public.businesses
  set onboarding_status = case when onboarding_status = 'not_started' then 'in_progress' else onboarding_status end,
      delivery_mode = case
        when exists (
          select 1 from public.service_engagements e
          where e.business_id = p_business_id and e.enabled and e.department <> p_department
            and e.delivery_mode <> p_delivery_mode
        ) then 'hybrid'
        else p_delivery_mode
      end
  where id = p_business_id;

  return jsonb_build_object(
    'engagement_id',v_engagement.id,
    'business_id',v_engagement.business_id,
    'department',v_engagement.department,
    'delivery_mode',v_engagement.delivery_mode,
    'status',v_engagement.status,
    'template_key',v_engagement.template_key
  );
end;
$$;

create or replace function public.activate_all_tad_departments(
  p_business_id uuid,
  p_delivery_mode text default 'self_service'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_department text;
  v_results jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.can_manage_business(p_business_id,auth.uid()) then
    raise exception 'manager access required';
  end if;

  foreach v_department in array array['invoice','sales','client','property','practice','member']
  loop
    v_results := v_results || jsonb_build_array(
      public.activate_tad_department(p_business_id,v_department,p_delivery_mode)
    );
  end loop;

  update public.businesses
  set onboarding_status = 'in_progress',
      delivery_mode = p_delivery_mode
  where id = p_business_id;

  insert into public.workspace_subscriptions(
    business_id,plan_key,status,trial_ends_at
  ) values (
    p_business_id,
    case when p_delivery_mode = 'managed' then 'managed' else 'starter' end,
    'trialing',
    now() + interval '14 days'
  ) on conflict (business_id) do nothing;

  return jsonb_build_object(
    'business_id',p_business_id,
    'delivery_mode',p_delivery_mode,
    'departments',v_results
  );
end;
$$;

create or replace function public.set_tad_department_mode(
  p_business_id uuid,
  p_department text,
  p_delivery_mode text,
  p_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_engagement public.service_engagements%rowtype;
  v_distinct_modes integer;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.can_manage_business(p_business_id,auth.uid()) then
    raise exception 'manager access required';
  end if;
  if p_department not in ('invoice','sales','client','property','practice','member') then
    raise exception 'invalid department';
  end if;
  if p_delivery_mode not in ('self_service','managed') then
    raise exception 'invalid delivery mode';
  end if;

  if not exists (
    select 1 from public.service_engagements
    where business_id = p_business_id and department = p_department
  ) then
    perform public.activate_tad_department(p_business_id,p_department,p_delivery_mode);
  end if;

  update public.service_engagements
  set delivery_mode = p_delivery_mode,
      service_level = case when p_delivery_mode = 'managed' then 'managed' else 'support' end,
      enabled = p_enabled,
      status = case when p_enabled then case when status = 'paused' then 'active' else status end else 'paused' end,
      updated_at = now()
  where business_id = p_business_id and department = p_department
  returning * into v_engagement;

  select count(distinct delivery_mode) into v_distinct_modes
  from public.service_engagements
  where business_id = p_business_id and enabled;

  update public.businesses
  set delivery_mode = case
    when v_distinct_modes > 1 then 'hybrid'
    when exists (select 1 from public.service_engagements where business_id = p_business_id and enabled and delivery_mode = 'managed') then 'managed'
    else 'self_service'
  end
  where id = p_business_id;

  return jsonb_build_object(
    'engagement_id',v_engagement.id,
    'department',v_engagement.department,
    'delivery_mode',v_engagement.delivery_mode,
    'enabled',v_engagement.enabled,
    'status',v_engagement.status
  );
end;
$$;

create or replace function public.get_tad_department_center(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_business public.businesses%rowtype;
  v_subscription jsonb;
  v_departments jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.can_access_business(p_business_id,auth.uid()) then
    raise exception 'business not accessible';
  end if;

  select * into v_business from public.businesses where id = p_business_id;
  if v_business.id is null then raise exception 'business not found'; end if;

  select to_jsonb(s) into v_subscription
  from public.workspace_subscriptions s
  where s.business_id = p_business_id;

  select jsonb_agg(
    jsonb_build_object(
      'department',d.department,
      'name',d.name,
      'template_key',d.template_key,
      'template_version',d.template_version,
      'active',d.engagement_id is not null and coalesce(d.enabled,false),
      'engagement_id',d.engagement_id,
      'delivery_mode',coalesce(d.delivery_mode,'self_service'),
      'status',coalesce(d.status,'not_activated'),
      'item_count',coalesce(d.item_count,0),
      'open_count',coalesce(d.open_count,0),
      'blocked_count',coalesce(d.blocked_count,0),
      'overdue_count',coalesce(d.overdue_count,0)
    ) order by d.sort_order
  ) into v_departments
  from (
    select
      t.department,
      t.name,
      t.key as template_key,
      t.version as template_version,
      case t.department
        when 'invoice' then 1 when 'sales' then 2 when 'client' then 3
        when 'property' then 4 when 'practice' then 5 when 'member' then 6 else 99
      end as sort_order,
      e.id as engagement_id,
      e.enabled,
      e.delivery_mode,
      e.status,
      count(w.id)::integer as item_count,
      count(w.id) filter (
        where not (w.status = any(coalesce((
          select array_agg(value::text)
          from jsonb_array_elements_text(t.config -> 'closed_statuses') value
        ),array[]::text[])))
      )::integer as open_count,
      count(w.id) filter (where nullif(w.blocked_reason,'') is not null)::integer as blocked_count,
      count(w.id) filter (
        where w.due_date < current_date
          and not (w.status = any(coalesce((
            select array_agg(value::text)
            from jsonb_array_elements_text(t.config -> 'closed_statuses') value
          ),array[]::text[])))
      )::integer as overdue_count
    from public.service_workflow_templates t
    left join public.service_engagements e
      on e.business_id = p_business_id and e.department = t.department
    left join public.service_work_items w on w.engagement_id = e.id
    where t.active and t.department in ('invoice','sales','client','property','practice','member')
    group by t.department,t.name,t.key,t.version,t.config,e.id,e.enabled,e.delivery_mode,e.status
  ) d;

  return jsonb_build_object(
    'business',jsonb_build_object(
      'id',v_business.id,
      'name',v_business.name,
      'delivery_mode',v_business.delivery_mode,
      'onboarding_status',v_business.onboarding_status,
      'timezone',v_business.timezone,
      'currency',v_business.currency,
      'managed_by_tad',v_business.managed_by_tad
    ),
    'subscription',v_subscription,
    'departments',coalesce(v_departments,'[]'::jsonb)
  );
end;
$$;

create or replace function public.get_tad_unified_today(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.can_access_business(p_business_id,auth.uid()) then
    raise exception 'business not accessible';
  end if;

  return jsonb_build_object(
    'summary',jsonb_build_object(
      'due',(
        select count(*) from public.service_work_items w
        join public.service_engagements e on e.id = w.engagement_id
        join public.service_workflow_templates t on t.key = e.template_key
        where w.business_id = p_business_id and e.enabled
          and w.due_date <= current_date
          and not (w.status = any(coalesce((select array_agg(value::text) from jsonb_array_elements_text(t.config -> 'closed_statuses') value),array[]::text[])))
      ),
      'overdue',(
        select count(*) from public.service_work_items w
        join public.service_engagements e on e.id = w.engagement_id
        join public.service_workflow_templates t on t.key = e.template_key
        where w.business_id = p_business_id and e.enabled
          and w.due_date < current_date
          and not (w.status = any(coalesce((select array_agg(value::text) from jsonb_array_elements_text(t.config -> 'closed_statuses') value),array[]::text[])))
      ),
      'blocked',(
        select count(*) from public.service_work_items w
        join public.service_engagements e on e.id = w.engagement_id
        where w.business_id = p_business_id and e.enabled and nullif(w.blocked_reason,'') is not null
      ),
      'approvals',(
        select count(*) from public.service_approvals a
        where a.business_id = p_business_id and a.status = 'pending'
      )
    ),
    'items',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',w.id,
        'engagement_id',w.engagement_id,
        'department',w.department,
        'reference',w.reference,
        'title',w.title,
        'status',w.status,
        'assigned_name',w.assigned_name,
        'priority',w.priority,
        'next_action',w.next_action,
        'due_date',w.due_date,
        'blocked_reason',w.blocked_reason,
        'delivery_mode',e.delivery_mode
      ) order by (w.due_date is null),w.due_date,w.priority desc,w.updated_at desc)
      from public.service_work_items w
      join public.service_engagements e on e.id = w.engagement_id
      join public.service_workflow_templates t on t.key = e.template_key
      where w.business_id = p_business_id and e.enabled
        and (
          w.due_date <= current_date
          or nullif(w.blocked_reason,'') is not null
          or nullif(w.next_action,'') is null
        )
        and not (w.status = any(coalesce((select array_agg(value::text) from jsonb_array_elements_text(t.config -> 'closed_statuses') value),array[]::text[])))
    ),'[]'::jsonb)
  );
end;
$$;

grant execute on function public.activate_tad_department(uuid,text,text) to authenticated;
grant execute on function public.activate_all_tad_departments(uuid,text) to authenticated;
grant execute on function public.set_tad_department_mode(uuid,text,text,boolean) to authenticated;
grant execute on function public.get_tad_department_center(uuid) to authenticated;
grant execute on function public.get_tad_unified_today(uuid) to authenticated;
