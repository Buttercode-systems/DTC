-- TAD service-delivery foundation on top of the DueToday action engine.
-- Adds secure operator access, managed client workspaces, configurable service
-- engagements, approvals, weekly reports, action outcomes and workspace choice.

alter table public.businesses
  add column if not exists managed_by_tad boolean not null default false,
  add column if not exists primary_contact_name text,
  add column if not exists primary_contact_email text,
  add column if not exists service_status text not null default 'self_service'
    check (service_status in ('self_service', 'audit', 'pilot', 'active', 'paused', 'closed'));

alter table public.actions
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists completed_by uuid references auth.users(id) on delete set null,
  add column if not exists outcome_code text,
  add column if not exists outcome_note text,
  add column if not exists next_action_date date,
  add column if not exists source text not null default 'engine';

create table if not exists public.platform_operators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'operator' check (role in ('operator', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.platform_operators enable row level security;

create table if not exists public.business_memberships (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'manager', 'member', 'viewer', 'operator')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
alter table public.business_memberships enable row level security;
create index if not exists business_memberships_user_idx on public.business_memberships(user_id, active);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_business_id uuid references public.businesses(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.user_preferences enable row level security;

create table if not exists public.service_engagements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  department text not null check (department in ('invoice', 'sales', 'client', 'property', 'practice', 'member', 'core')),
  service_level text not null default 'setup' check (service_level in ('audit', 'setup', 'managed', 'support')),
  status text not null default 'planned' check (status in ('planned', 'onboarding', 'pilot', 'active', 'paused', 'completed', 'cancelled')),
  assigned_operator uuid references auth.users(id) on delete set null,
  start_date date,
  next_review_date date,
  workflow_config jsonb not null default '{}'::jsonb,
  baseline_metrics jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, department)
);
alter table public.service_engagements enable row level security;
create index if not exists service_engagements_operator_idx on public.service_engagements(assigned_operator, status);

create table if not exists public.service_approvals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  engagement_id uuid references public.service_engagements(id) on delete set null,
  title text not null,
  detail text,
  amount numeric(14,2),
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  due_date date,
  decision_note text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.service_approvals enable row level security;
create index if not exists service_approvals_queue_idx on public.service_approvals(status, due_date, business_id);

create table if not exists public.service_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  engagement_id uuid references public.service_engagements(id) on delete set null,
  period_start date not null,
  period_end date not null,
  metrics jsonb not null default '{}'::jsonb,
  summary text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'sent')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, period_start, period_end)
);
alter table public.service_reports enable row level security;
create index if not exists service_reports_business_idx on public.service_reports(business_id, period_end desc);

create or replace function public.is_tad_operator(p_user uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select p_user is not null and exists (
    select 1 from public.platform_operators po
    where po.user_id = p_user and po.active
  );
$$;

create or replace function public.can_access_business(
  p_business_id uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select p_user is not null and (
    public.is_tad_operator(p_user)
    or exists (
      select 1 from public.businesses b
      where b.id = p_business_id and b.owner_id = p_user
    )
    or exists (
      select 1 from public.business_memberships bm
      where bm.business_id = p_business_id
        and bm.user_id = p_user
        and bm.active
    )
  );
$$;

create policy "operator profile self read" on public.platform_operators
  for select using (user_id = auth.uid());

create policy "memberships own read" on public.business_memberships
  for select using (user_id = auth.uid() or public.is_tad_operator());
create policy "operators manage memberships" on public.business_memberships
  for all using (public.is_tad_operator()) with check (public.is_tad_operator());

create policy "preferences own access" on public.user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "accessible businesses read" on public.businesses
  for select using (public.can_access_business(id));
create policy "operators create managed businesses" on public.businesses
  for insert with check (public.is_tad_operator() and managed_by_tad and owner_id = auth.uid());
create policy "operators update businesses" on public.businesses
  for update using (public.is_tad_operator()) with check (public.is_tad_operator());

create policy "service engagement access" on public.service_engagements
  for all using (public.can_access_business(business_id))
  with check (public.can_access_business(business_id));
create policy "service approval access" on public.service_approvals
  for all using (public.can_access_business(business_id))
  with check (public.can_access_business(business_id));
create policy "service report access" on public.service_reports
  for all using (public.can_access_business(business_id))
  with check (public.can_access_business(business_id));

do $$
declare
  t text;
begin
  foreach t in array array[
    'customers', 'leads', 'quotes', 'invoices', 'payment_promises', 'actions'
  ]
  loop
    execute format(
      'create policy "service workspace access" on public.%I for all using (
         public.can_access_business(business_id)
       ) with check (
         public.can_access_business(business_id)
       )', t
    );
  end loop;
exception
  when duplicate_object then null;
end
$$;

create or replace function public.claim_first_tad_operator()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext('claim_first_tad_operator'));

  if public.is_tad_operator(v_uid) then return true; end if;
  if exists (select 1 from public.platform_operators where active) then return false; end if;

  insert into public.platform_operators(user_id, role, active)
  values (v_uid, 'admin', true)
  on conflict (user_id) do update set role = 'admin', active = true;
  return true;
end;
$$;

create or replace function public.is_current_tad_operator()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select public.is_tad_operator(auth.uid());
$$;

create or replace function public.list_accessible_businesses()
returns table (
  id uuid,
  name text,
  industry text,
  settings jsonb,
  managed_by_tad boolean,
  service_status text
)
language sql
security definer
set search_path = ''
stable
as $$
  select b.id, b.name, b.industry, b.settings, b.managed_by_tad, b.service_status
  from public.businesses b
  where public.can_access_business(b.id)
  order by b.managed_by_tad desc, b.name asc;
$$;

create or replace function public.set_active_business(p_business_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.can_access_business(p_business_id, v_uid) then raise exception 'business not accessible'; end if;

  insert into public.user_preferences(user_id, active_business_id, updated_at)
  values (v_uid, p_business_id, now())
  on conflict (user_id) do update
    set active_business_id = excluded.active_business_id,
        updated_at = now();
  return p_business_id;
end;
$$;

create or replace function public.create_managed_business(
  p_name text,
  p_industry text,
  p_contact_name text,
  p_contact_email text,
  p_department text,
  p_service_level text default 'setup'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_business public.businesses%rowtype;
  v_engagement public.service_engagements%rowtype;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then raise exception 'operator access required'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'business name required'; end if;
  if p_department not in ('invoice', 'sales', 'client', 'property', 'practice', 'member', 'core') then raise exception 'invalid department'; end if;
  if p_service_level not in ('audit', 'setup', 'managed', 'support') then raise exception 'invalid service level'; end if;

  insert into public.businesses(
    owner_id, name, industry, managed_by_tad,
    primary_contact_name, primary_contact_email, service_status
  ) values (
    v_uid, left(trim(p_name), 200), nullif(trim(p_industry), ''), true,
    nullif(trim(p_contact_name), ''), nullif(trim(p_contact_email), ''), 'pilot'
  ) returning * into v_business;

  insert into public.business_memberships(business_id, user_id, role, active)
  values (v_business.id, v_uid, 'operator', true)
  on conflict do nothing;

  insert into public.service_engagements(
    business_id, department, service_level, status,
    assigned_operator, start_date, next_review_date
  ) values (
    v_business.id, p_department, p_service_level, 'onboarding',
    v_uid, current_date, current_date + 7
  ) returning * into v_engagement;

  insert into public.actions(
    business_id, key, kind, title, detail, priority,
    due_date, status, assigned_to, source
  ) values (
    v_business.id,
    'service_setup:' || v_engagement.id::text,
    'service_setup',
    'Map the current ' || p_department || ' workflow — ' || v_business.name,
    'Confirm capture points, owners, due dates, approval gates, baseline measures and the first 14-day pilot.',
    95, current_date, 'open', v_uid, 'tad_service'
  );

  perform public.set_active_business(v_business.id);

  return jsonb_build_object(
    'business_id', v_business.id,
    'engagement_id', v_engagement.id,
    'name', v_business.name,
    'department', v_engagement.department,
    'status', v_engagement.status
  );
end;
$$;

create or replace function public.get_tad_ops_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then raise exception 'operator access required'; end if;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'clients', (select count(*) from public.businesses where managed_by_tad and service_status not in ('closed')),
      'due_actions', (select count(*) from public.actions where status = 'open' and due_date <= current_date),
      'pending_approvals', (select count(*) from public.service_approvals where status = 'pending'),
      'reports_due', (select count(*) from public.service_engagements where status in ('pilot', 'active') and next_review_date <= current_date)
    ),
    'clients', coalesce((
      select jsonb_agg(row_to_json(x) order by x.name)
      from (
        select b.id, b.name, b.industry, b.primary_contact_name,
               b.primary_contact_email, b.service_status,
               se.id as engagement_id, se.department, se.service_level,
               se.status as engagement_status, se.next_review_date,
               (select count(*) from public.actions a where a.business_id = b.id and a.status = 'open' and a.due_date <= current_date) as due_actions,
               (select count(*) from public.service_approvals sa where sa.business_id = b.id and sa.status = 'pending') as pending_approvals
        from public.businesses b
        left join lateral (
          select * from public.service_engagements e
          where e.business_id = b.id
          order by e.created_at desc limit 1
        ) se on true
        where b.managed_by_tad
      ) x
    ), '[]'::jsonb),
    'actions', coalesce((
      select jsonb_agg(row_to_json(x) order by x.priority desc, x.due_date, x.business_name)
      from (
        select a.id, a.business_id, b.name as business_name, a.kind, a.title,
               a.detail, a.priority, a.due_date, a.assigned_to, a.source
        from public.actions a
        join public.businesses b on b.id = a.business_id
        where b.managed_by_tad and a.status = 'open' and a.due_date <= current_date
        order by a.priority desc, a.due_date asc
        limit 100
      ) x
    ), '[]'::jsonb),
    'approvals', coalesce((
      select jsonb_agg(row_to_json(x) order by x.due_date nulls last, x.created_at)
      from (
        select sa.id, sa.business_id, b.name as business_name, sa.title,
               sa.detail, sa.amount, sa.status, sa.due_date, sa.created_at
        from public.service_approvals sa
        join public.businesses b on b.id = sa.business_id
        where b.managed_by_tad and sa.status = 'pending'
        order by sa.due_date nulls last, sa.created_at
        limit 100
      ) x
    ), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(row_to_json(x) order by x.period_end desc)
      from (
        select sr.id, sr.business_id, b.name as business_name, sr.period_start,
               sr.period_end, sr.status, sr.metrics, sr.summary, sr.updated_at
        from public.service_reports sr
        join public.businesses b on b.id = sr.business_id
        where b.managed_by_tad
        order by sr.period_end desc
        limit 30
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.generate_weekly_service_report(
  p_business_id uuid,
  p_period_start date,
  p_period_end date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_metrics jsonb;
  v_summary text;
  v_report public.service_reports%rowtype;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then raise exception 'operator access required'; end if;
  if not public.can_access_business(p_business_id, v_uid) then raise exception 'business not accessible'; end if;
  if p_period_end < p_period_start then raise exception 'invalid reporting period'; end if;

  select jsonb_build_object(
    'actions_completed', (select count(*) from public.actions where business_id = p_business_id and status = 'done' and completed_at::date between p_period_start and p_period_end),
    'actions_due_now', (select count(*) from public.actions where business_id = p_business_id and status = 'open' and due_date <= p_period_end),
    'new_leads', (select count(*) from public.leads where business_id = p_business_id and received_at::date between p_period_start and p_period_end),
    'open_quotes', (select count(*) from public.quotes where business_id = p_business_id and status = 'sent'),
    'open_quote_value', (select coalesce(sum(amount), 0) from public.quotes where business_id = p_business_id and status = 'sent'),
    'overdue_invoices', (select count(*) from public.invoices where business_id = p_business_id and kind = 'customer' and status = 'sent' and due_date < p_period_end),
    'overdue_value', (select coalesce(sum(amount), 0) from public.invoices where business_id = p_business_id and kind = 'customer' and status = 'sent' and due_date < p_period_end),
    'pending_approvals', (select count(*) from public.service_approvals where business_id = p_business_id and status = 'pending')
  ) into v_metrics;

  v_summary := format(
    '%s actions completed; %s still due; %s open quotes; %s overdue invoices; %s approvals waiting.',
    v_metrics->>'actions_completed',
    v_metrics->>'actions_due_now',
    v_metrics->>'open_quotes',
    v_metrics->>'overdue_invoices',
    v_metrics->>'pending_approvals'
  );

  insert into public.service_reports(
    business_id, period_start, period_end, metrics, summary, status, created_by, updated_at
  ) values (
    p_business_id, p_period_start, p_period_end, v_metrics, v_summary, 'ready', v_uid, now()
  )
  on conflict (business_id, period_start, period_end) do update
    set metrics = excluded.metrics,
        summary = excluded.summary,
        status = 'ready',
        created_by = v_uid,
        updated_at = now()
  returning * into v_report;

  return jsonb_build_object(
    'id', v_report.id,
    'business_id', v_report.business_id,
    'period_start', v_report.period_start,
    'period_end', v_report.period_end,
    'metrics', v_report.metrics,
    'summary', v_report.summary,
    'status', v_report.status
  );
end;
$$;

create or replace function public.complete_action_with_outcome(
  p_action_id uuid,
  p_outcome_code text default null,
  p_outcome_note text default null,
  p_next_action_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_action public.actions%rowtype;
  v_template public.invoices%rowtype;
  v_now timestamptz := now();
  v_issued date;
  v_due date;
  v_next date;
  v_number text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_outcome_code is not null and p_outcome_code not in (
    'contacted', 'no_answer', 'follow_up', 'won', 'lost', 'paid',
    'approved', 'completed', 'not_needed', 'other'
  ) then raise exception 'invalid outcome'; end if;
  if p_next_action_date is not null and p_next_action_date < current_date then raise exception 'next action date is in the past'; end if;

  select a.* into v_action
  from public.actions a
  where a.id = p_action_id and public.can_access_business(a.business_id, v_uid)
  for update;

  if v_action.id is null then raise exception 'action not found'; end if;
  if v_action.status = 'done' then
    return jsonb_build_object('id', v_action.id, 'kind', v_action.kind, 'entity_table', v_action.entity_table, 'already_done', true);
  end if;
  if v_action.status not in ('open', 'snoozed') then raise exception 'action is not completable'; end if;

  if v_action.entity_id is not null then
    case v_action.kind
      when 'lead_response' then
        update public.leads set status = 'responded', responded_at = v_now
        where id = v_action.entity_id and business_id = v_action.business_id;
        if not found then raise exception 'linked lead not found'; end if;
      when 'quote_followup' then
        update public.quotes set last_followup_at = v_now
        where id = v_action.entity_id and business_id = v_action.business_id;
        if not found then raise exception 'linked quote not found'; end if;
      when 'invoice_chase' then
        update public.invoices set last_chase_at = v_now
        where id = v_action.entity_id and business_id = v_action.business_id;
        if not found then raise exception 'linked invoice not found'; end if;
      when 'supplier_approval' then
        update public.invoices set status = 'approved'
        where id = v_action.entity_id and business_id = v_action.business_id and kind = 'supplier';
        if not found then raise exception 'linked supplier invoice not found'; end if;
      when 'recurring_invoice' then
        select * into v_template from public.invoices
        where id = v_action.entity_id and business_id = v_action.business_id
        for update;
        if v_template.id is null or v_template.next_issue_date is null then raise exception 'recurring template not found'; end if;

        v_issued := v_template.next_issue_date;
        v_due := v_issued + 7;
        v_next := (v_issued + interval '1 month')::date;
        v_number := left(v_template.number || '-' || to_char(v_issued, 'YYYY-MM'), 60);

        if not exists (
          select 1 from public.invoices
          where business_id = v_action.business_id and number = v_number
        ) then
          insert into public.invoices (business_id, customer_id, kind, number, description, amount, status, issued_at, due_date)
          values (v_action.business_id, v_template.customer_id, 'customer', v_number, v_template.description, v_template.amount, 'sent', v_issued, v_due);
        end if;

        update public.invoices set next_issue_date = v_next where id = v_template.id;
      else
        null;
    end case;
  end if;

  update public.actions
  set status = 'done',
      completed_at = v_now,
      completed_by = v_uid,
      snoozed_until = null,
      outcome_code = p_outcome_code,
      outcome_note = nullif(trim(p_outcome_note), ''),
      next_action_date = p_next_action_date
  where id = v_action.id;

  if p_next_action_date is not null then
    insert into public.actions(
      business_id, key, kind, title, detail, priority, entity_table,
      entity_id, contact_phone, due_date, status, assigned_to, source
    ) values (
      v_action.business_id,
      'manual_followup:' || v_action.id::text || ':' || p_next_action_date::text,
      'manual_followup',
      'Follow up — ' || v_action.title,
      coalesce(nullif(trim(p_outcome_note), ''), 'Continue the previous action and record the outcome.'),
      greatest(v_action.priority - 5, 10),
      v_action.entity_table, v_action.entity_id, v_action.contact_phone,
      p_next_action_date, 'open', coalesce(v_action.assigned_to, v_uid), 'outcome'
    ) on conflict (business_id, key) do nothing;
  end if;

  return jsonb_build_object(
    'id', v_action.id,
    'kind', v_action.kind,
    'entity_table', v_action.entity_table,
    'outcome_code', p_outcome_code,
    'next_action_date', p_next_action_date,
    'already_done', false
  );
end;
$$;

create or replace function public.complete_action_safely(p_action_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.complete_action_with_outcome(p_action_id, null, null, null);
$$;

revoke all on function public.is_tad_operator(uuid) from public;
revoke all on function public.can_access_business(uuid, uuid) from public;
revoke all on function public.claim_first_tad_operator() from public;
revoke all on function public.is_current_tad_operator() from public;
revoke all on function public.list_accessible_businesses() from public;
revoke all on function public.set_active_business(uuid) from public;
revoke all on function public.create_managed_business(text, text, text, text, text, text) from public;
revoke all on function public.get_tad_ops_dashboard() from public;
revoke all on function public.generate_weekly_service_report(uuid, date, date) from public;
revoke all on function public.complete_action_with_outcome(uuid, text, text, date) from public;
revoke all on function public.complete_action_safely(uuid) from public;

revoke all on function public.claim_first_tad_operator() from anon;
revoke all on function public.is_current_tad_operator() from anon;
revoke all on function public.list_accessible_businesses() from anon;
revoke all on function public.set_active_business(uuid) from anon;
revoke all on function public.create_managed_business(text, text, text, text, text, text) from anon;
revoke all on function public.get_tad_ops_dashboard() from anon;
revoke all on function public.generate_weekly_service_report(uuid, date, date) from anon;
revoke all on function public.complete_action_with_outcome(uuid, text, text, date) from anon;
revoke all on function public.complete_action_safely(uuid) from anon;

grant execute on function public.claim_first_tad_operator() to authenticated;
grant execute on function public.is_current_tad_operator() to authenticated;
grant execute on function public.list_accessible_businesses() to authenticated;
grant execute on function public.set_active_business(uuid) to authenticated;
grant execute on function public.create_managed_business(text, text, text, text, text, text) to authenticated;
grant execute on function public.get_tad_ops_dashboard() to authenticated;
grant execute on function public.generate_weekly_service_report(uuid, date, date) to authenticated;
grant execute on function public.complete_action_with_outcome(uuid, text, text, date) to authenticated;
grant execute on function public.complete_action_safely(uuid) to authenticated;
