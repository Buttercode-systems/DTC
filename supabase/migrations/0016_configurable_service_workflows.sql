-- Configurable workflow engine for The Admin Department managed services.
-- One secure engine powers Invoice, Sales, Client, Property, Practice and Member
-- Admin without creating six separate SaaS products.

create table if not exists public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  department text not null check (department in ('invoice', 'sales', 'client', 'property', 'practice', 'member', 'core')),
  name text not null,
  description text not null,
  version integer not null default 1 check (version > 0),
  definition jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.workflow_templates enable row level security;

create table if not exists public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  engagement_id uuid references public.service_engagements(id) on delete set null,
  template_id uuid not null references public.workflow_templates(id) on delete restrict,
  name text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'completed', 'cancelled')),
  configuration jsonb not null default '{}'::jsonb,
  installed_version integer not null default 1,
  installed_by uuid references auth.users(id) on delete set null,
  installed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, template_id)
);
alter table public.workflow_instances enable row level security;
create index if not exists workflow_instances_business_idx on public.workflow_instances(business_id, status);

create table if not exists public.workflow_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  workflow_instance_id uuid not null references public.workflow_instances(id) on delete cascade,
  reference text,
  title text not null,
  status text not null,
  owner_label text,
  assigned_to uuid references auth.users(id) on delete set null,
  next_action text,
  due_date date,
  priority integer not null default 50 check (priority between 0 and 100),
  fields jsonb not null default '{}'::jsonb,
  source text not null default 'manual',
  last_outcome_code text,
  last_outcome_note text,
  last_outcome_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.workflow_records enable row level security;
create index if not exists workflow_records_queue_idx on public.workflow_records(business_id, due_date, status, priority desc);
create index if not exists workflow_records_instance_idx on public.workflow_records(workflow_instance_id, status);

create table if not exists public.workflow_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  workflow_instance_id uuid references public.workflow_instances(id) on delete cascade,
  workflow_record_id uuid references public.workflow_records(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.workflow_events enable row level security;
create index if not exists workflow_events_record_idx on public.workflow_events(workflow_record_id, created_at desc);
create index if not exists workflow_events_business_idx on public.workflow_events(business_id, created_at desc);

create policy "authenticated read workflow templates" on public.workflow_templates
  for select to authenticated using (active or public.is_tad_operator());
create policy "operators manage workflow templates" on public.workflow_templates
  for all to authenticated using (public.is_tad_operator()) with check (public.is_tad_operator());

create policy "workflow instance access" on public.workflow_instances
  for all to authenticated using (public.can_access_business(business_id))
  with check (public.can_work_business(business_id));
create policy "workflow record access" on public.workflow_records
  for all to authenticated using (public.can_access_business(business_id))
  with check (public.can_work_business(business_id));
create policy "workflow event access" on public.workflow_events
  for select to authenticated using (public.can_access_business(business_id));
create policy "workflow event insert" on public.workflow_events
  for insert to authenticated with check (public.can_work_business(business_id));

insert into public.workflow_templates(template_key, department, name, description, version, definition)
values
  (
    'invoice-admin-v1', 'invoice', 'Invoice Admin',
    'Supplier invoices, receipts, approvals, duplicate review, filing and payment evidence.',
    1,
    jsonb_build_object(
      'statuses', jsonb_build_array('New', 'Needs Capture', 'Missing Info', 'Possible Duplicate', 'Ready for Review', 'Waiting for Approval', 'Approved', 'Scheduled for Payment', 'Paid', 'Filed', 'Rejected'),
      'terminal_statuses', jsonb_build_array('Paid', 'Filed', 'Rejected'),
      'default_status', 'New',
      'default_terminal_status', 'Filed',
      'required_controls', jsonb_build_array('status', 'owner', 'next_action', 'due_date', 'approval'),
      'fields', jsonb_build_array('supplier_name', 'document_type', 'invoice_number', 'amount', 'approval_owner', 'document_link', 'folder_link')
    )
  ),
  (
    'sales-admin-v1', 'sales', 'Sales Admin',
    'Enquiries, response ownership, quote preparation, follow-up and won/lost outcomes.',
    1,
    jsonb_build_object(
      'statuses', jsonb_build_array('New', 'Needs Response', 'Contacted', 'Waiting for Client', 'Quote Needed', 'Quote Sent', 'Follow-up Due', 'Won', 'Lost', 'Cold', 'Closed'),
      'terminal_statuses', jsonb_build_array('Won', 'Lost', 'Cold', 'Closed'),
      'default_status', 'New',
      'default_terminal_status', 'Closed',
      'required_controls', jsonb_build_array('status', 'owner', 'next_action', 'due_date', 'outcome'),
      'fields', jsonb_build_array('contact_name', 'source', 'service_needed', 'urgency', 'quote_amount', 'outcome_reason')
    )
  ),
  (
    'client-admin-v1', 'client', 'Client Admin',
    'Client onboarding, document collection, agreements, payment gates, folders and handover.',
    1,
    jsonb_build_object(
      'statuses', jsonb_build_array('New Client', 'Welcome Sent', 'Documents Requested', 'Waiting for Client', 'Internal Setup', 'Payment/Agreement Pending', 'Ready to Start', 'Active', 'Stuck', 'Cancelled'),
      'terminal_statuses', jsonb_build_array('Active', 'Cancelled'),
      'default_status', 'New Client',
      'default_terminal_status', 'Active',
      'required_controls', jsonb_build_array('status', 'owner', 'next_action', 'due_date', 'documents', 'handover'),
      'fields', jsonb_build_array('client_name', 'service_package', 'documents_received', 'missing_documents', 'agreement_status', 'payment_status', 'folder_link', 'internal_handover')
    )
  ),
  (
    'property-admin-v1', 'property', 'Property Admin',
    'Tenant requests, owner approvals, supplier quotes, scheduling and completion proof.',
    1,
    jsonb_build_object(
      'statuses', jsonb_build_array('New Request', 'Tenant Contacted', 'Quote Needed', 'Quote Sent', 'Owner Approval', 'Approved', 'Scheduled', 'In Progress', 'Completed', 'Closed', 'Blocked', 'Cancelled'),
      'terminal_statuses', jsonb_build_array('Completed', 'Closed', 'Cancelled'),
      'default_status', 'New Request',
      'default_terminal_status', 'Closed',
      'required_controls', jsonb_build_array('status', 'owner', 'next_action', 'due_date', 'approval', 'completion_proof'),
      'fields', jsonb_build_array('property_name', 'unit', 'tenant_name', 'request_type', 'urgency', 'owner_approval', 'quote_amount', 'supplier', 'scheduled_date', 'proof_link')
    )
  ),
  (
    'practice-admin-v1', 'practice', 'Practice / Booking Admin',
    'Booking, confirmation, document and payment workflow. No clinical decision-making.',
    1,
    jsonb_build_object(
      'statuses', jsonb_build_array('New Booking', 'Needs Confirmation', 'Confirmed', 'Documents Needed', 'Payment Pending', 'Ready for Appointment', 'Completed', 'No-show', 'Cancelled', 'Follow-up Due'),
      'terminal_statuses', jsonb_build_array('Completed', 'No-show', 'Cancelled'),
      'default_status', 'New Booking',
      'default_terminal_status', 'Completed',
      'required_controls', jsonb_build_array('status', 'owner', 'next_action', 'due_date', 'confirmation'),
      'fields', jsonb_build_array('booking_reference', 'service', 'channel', 'appointment_date', 'confirmation_sent', 'payment_status', 'documents_received', 'no_show_risk')
    )
  ),
  (
    'member-admin-v1', 'member', 'Member Admin',
    'Member onboarding, attendance risk, payment follow-up, retention and reactivation.',
    1,
    jsonb_build_object(
      'statuses', jsonb_build_array('New Member', 'Onboarding', 'Active', 'Attendance Risk', 'Payment Due', 'Follow-up Due', 'Reactivation', 'Retained', 'Cancelled', 'Dormant'),
      'terminal_statuses', jsonb_build_array('Retained', 'Cancelled', 'Dormant'),
      'default_status', 'New Member',
      'default_terminal_status', 'Retained',
      'required_controls', jsonb_build_array('status', 'owner', 'next_action', 'due_date', 'outcome'),
      'fields', jsonb_build_array('member_reference', 'plan', 'payment_status', 'last_attendance_date', 'onboarding_done', 'risk_level', 'outcome_reason')
    )
  )
on conflict (template_key) do update
set department = excluded.department,
    name = excluded.name,
    description = excluded.description,
    version = excluded.version,
    definition = excluded.definition,
    active = true,
    updated_at = now();

create or replace function public.sync_workflow_actions(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_created integer := 0;
  v_dismissed integer := 0;
  r record;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.can_work_business(p_business_id, v_uid) then raise exception 'business work access required'; end if;

  update public.actions a
  set status = 'dismissed'
  where a.business_id = p_business_id
    and a.status in ('open', 'snoozed')
    and a.source = 'workflow_engine'
    and a.entity_table = 'workflow_records'
    and not exists (
      select 1
      from public.workflow_records wr
      join public.workflow_instances wi on wi.id = wr.workflow_instance_id and wi.status = 'active'
      join public.workflow_templates wt on wt.id = wi.template_id
      where wr.id = a.entity_id
        and wr.business_id = p_business_id
        and wr.completed_at is null
        and not ((wt.definition->'terminal_statuses') ? wr.status)
        and (
          (a.kind = 'workflow_owner' and wr.assigned_to is null and nullif(trim(wr.owner_label), '') is null)
          or (a.kind = 'workflow_next_action' and nullif(trim(wr.next_action), '') is null)
          or (a.kind = 'workflow_due' and wr.due_date is not null and wr.due_date <= current_date and a.due_date = wr.due_date)
        )
    );
  get diagnostics v_dismissed = row_count;

  for r in
    select wr.*, wt.name as template_name, wt.definition
    from public.workflow_records wr
    join public.workflow_instances wi on wi.id = wr.workflow_instance_id and wi.status = 'active'
    join public.workflow_templates wt on wt.id = wi.template_id
    where wr.business_id = p_business_id
      and wr.completed_at is null
      and not ((wt.definition->'terminal_statuses') ? wr.status)
  loop
    if r.assigned_to is null and nullif(trim(r.owner_label), '') is null then
      insert into public.actions(
        business_id, key, kind, title, detail, priority, entity_table,
        entity_id, due_date, status, source
      ) values (
        p_business_id,
        'workflow_owner:' || r.id::text,
        'workflow_owner',
        'Assign an owner — ' || r.title,
        r.template_name || ' record ' || coalesce(nullif(r.reference, ''), r.id::text) || ' has no responsible person.',
        greatest(r.priority, 80), 'workflow_records', r.id, current_date, 'open', 'workflow_engine'
      ) on conflict (business_id, key) do nothing;
      if found then v_created := v_created + 1; end if;
    end if;

    if nullif(trim(r.next_action), '') is null then
      insert into public.actions(
        business_id, key, kind, title, detail, priority, entity_table,
        entity_id, due_date, status, assigned_to, source
      ) values (
        p_business_id,
        'workflow_next_action:' || r.id::text,
        'workflow_next_action',
        'Set the next action — ' || r.title,
        'The record is active but does not say what must happen next.',
        greatest(r.priority, 75), 'workflow_records', r.id, current_date, 'open', r.assigned_to, 'workflow_engine'
      ) on conflict (business_id, key) do nothing;
      if found then v_created := v_created + 1; end if;
    end if;

    if r.due_date is not null and r.due_date <= current_date then
      insert into public.actions(
        business_id, key, kind, title, detail, priority, entity_table,
        entity_id, due_date, status, assigned_to, source
      ) values (
        p_business_id,
        'workflow_due:' || r.id::text || ':' || r.due_date::text,
        'workflow_due',
        coalesce(nullif(r.next_action, ''), 'Move workflow record') || ' — ' || r.title,
        r.template_name || ' · ' || coalesce(nullif(r.reference, ''), 'No reference') || ' · Status: ' || r.status,
        greatest(r.priority, 70 + least(greatest(current_date - r.due_date, 0), 25)),
        'workflow_records', r.id, r.due_date, 'open', r.assigned_to, 'workflow_engine'
      ) on conflict (business_id, key) do nothing;
      if found then v_created := v_created + 1; end if;
    end if;
  end loop;

  return jsonb_build_object('created', v_created, 'dismissed', v_dismissed);
end;
$$;

create or replace function public.install_workflow_template(
  p_business_id uuid,
  p_template_key text,
  p_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_template public.workflow_templates%rowtype;
  v_instance public.workflow_instances%rowtype;
  v_engagement_id uuid;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then raise exception 'operator access required'; end if;
  if not public.can_work_business(p_business_id, v_uid) then raise exception 'business work access required'; end if;

  select * into v_template
  from public.workflow_templates
  where template_key = p_template_key and active;
  if v_template.id is null then raise exception 'workflow template not found'; end if;

  select id into v_engagement_id
  from public.service_engagements
  where business_id = p_business_id and department = v_template.department
  limit 1;

  insert into public.workflow_instances(
    business_id, engagement_id, template_id, name, status,
    configuration, installed_version, installed_by
  ) values (
    p_business_id, v_engagement_id, v_template.id,
    coalesce(nullif(trim(p_name), ''), v_template.name), 'active',
    '{}'::jsonb, v_template.version, v_uid
  )
  on conflict (business_id, template_id) do update
  set status = 'active',
      name = coalesce(nullif(trim(p_name), ''), public.workflow_instances.name),
      installed_version = v_template.version,
      updated_at = now()
  returning * into v_instance;

  insert into public.workflow_events(
    business_id, workflow_instance_id, actor_id, event_name, metadata
  ) values (
    p_business_id, v_instance.id, v_uid, 'workflow_installed',
    jsonb_build_object('template_key', v_template.template_key, 'version', v_template.version)
  );

  return jsonb_build_object(
    'id', v_instance.id,
    'business_id', v_instance.business_id,
    'template_key', v_template.template_key,
    'name', v_instance.name,
    'status', v_instance.status
  );
end;
$$;

create or replace function public.create_workflow_record(
  p_workflow_instance_id uuid,
  p_reference text,
  p_title text,
  p_status text,
  p_owner_label text,
  p_next_action text,
  p_due_date date,
  p_priority integer default 50,
  p_fields jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_instance public.workflow_instances%rowtype;
  v_template public.workflow_templates%rowtype;
  v_record_id uuid;
  v_status text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_instance from public.workflow_instances where id = p_workflow_instance_id;
  if v_instance.id is null or not public.can_work_business(v_instance.business_id, v_uid) then raise exception 'workflow not accessible'; end if;
  select * into v_template from public.workflow_templates where id = v_instance.template_id;

  v_status := coalesce(nullif(trim(p_status), ''), v_template.definition->>'default_status');
  if not ((v_template.definition->'statuses') ? v_status) then raise exception 'invalid workflow status'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'record title required'; end if;

  insert into public.workflow_records(
    business_id, workflow_instance_id, reference, title, status, owner_label,
    next_action, due_date, priority, fields, created_by
  ) values (
    v_instance.business_id, v_instance.id, nullif(trim(p_reference), ''), left(trim(p_title), 240),
    v_status, nullif(trim(p_owner_label), ''), nullif(trim(p_next_action), ''), p_due_date,
    greatest(0, least(coalesce(p_priority, 50), 100)), coalesce(p_fields, '{}'::jsonb), v_uid
  ) returning id into v_record_id;

  insert into public.workflow_events(
    business_id, workflow_instance_id, workflow_record_id, actor_id, event_name, metadata
  ) values (
    v_instance.business_id, v_instance.id, v_record_id, v_uid, 'record_created',
    jsonb_build_object('status', v_status, 'due_date', p_due_date)
  );

  perform public.sync_workflow_actions(v_instance.business_id);
  return v_record_id;
end;
$$;

create or replace function public.update_workflow_record(
  p_record_id uuid,
  p_status text,
  p_owner_label text,
  p_next_action text,
  p_due_date date,
  p_priority integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_record public.workflow_records%rowtype;
  v_template public.workflow_templates%rowtype;
  v_terminal boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select wr.* into v_record
  from public.workflow_records wr
  where wr.id = p_record_id and public.can_work_business(wr.business_id, v_uid)
  for update;
  if v_record.id is null then raise exception 'record not found'; end if;

  select wt.* into v_template
  from public.workflow_instances wi
  join public.workflow_templates wt on wt.id = wi.template_id
  where wi.id = v_record.workflow_instance_id;

  if not ((v_template.definition->'statuses') ? p_status) then raise exception 'invalid workflow status'; end if;
  v_terminal := (v_template.definition->'terminal_statuses') ? p_status;

  update public.workflow_records
  set status = p_status,
      owner_label = nullif(trim(p_owner_label), ''),
      next_action = case when v_terminal then null else nullif(trim(p_next_action), '') end,
      due_date = case when v_terminal then null else p_due_date end,
      priority = greatest(0, least(coalesce(p_priority, priority), 100)),
      completed_at = case when v_terminal then coalesce(completed_at, now()) else null end,
      updated_at = now()
  where id = p_record_id;

  insert into public.workflow_events(
    business_id, workflow_instance_id, workflow_record_id, actor_id, event_name, metadata
  ) values (
    v_record.business_id, v_record.workflow_instance_id, v_record.id, v_uid, 'record_updated',
    jsonb_build_object(
      'from_status', v_record.status,
      'to_status', p_status,
      'owner_label', nullif(trim(p_owner_label), ''),
      'next_action', nullif(trim(p_next_action), ''),
      'due_date', p_due_date
    )
  );

  perform public.sync_workflow_actions(v_record.business_id);
  return p_record_id;
end;
$$;

create or replace function public.complete_action_with_outcome_v2(
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
  v_record public.workflow_records%rowtype;
  v_template public.workflow_templates%rowtype;
  v_terminal_status text;
  v_done boolean;
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_action
  from public.actions
  where id = p_action_id and public.can_work_business(business_id, v_uid)
  for update;
  if v_action.id is null then raise exception 'action not found'; end if;

  if v_action.entity_table is distinct from 'workflow_records' then
    return public.complete_action_with_outcome(p_action_id, p_outcome_code, p_outcome_note, p_next_action_date);
  end if;

  if p_outcome_code is not null and p_outcome_code not in (
    'contacted', 'no_answer', 'follow_up', 'won', 'lost', 'paid',
    'approved', 'completed', 'not_needed', 'other'
  ) then raise exception 'invalid outcome'; end if;
  if p_next_action_date is not null and p_next_action_date < current_date then raise exception 'next action date is in the past'; end if;
  if v_action.status = 'done' then return jsonb_build_object('id', v_action.id, 'kind', v_action.kind, 'already_done', true); end if;
  if v_action.status not in ('open', 'snoozed') then raise exception 'action is not completable'; end if;

  select * into v_record
  from public.workflow_records
  where id = v_action.entity_id and business_id = v_action.business_id
  for update;
  if v_record.id is null then raise exception 'workflow record not found'; end if;

  select wt.* into v_template
  from public.workflow_instances wi
  join public.workflow_templates wt on wt.id = wi.template_id
  where wi.id = v_record.workflow_instance_id;
  v_terminal_status := coalesce(v_template.definition->>'default_terminal_status', v_record.status);
  v_done := coalesce(p_outcome_code, 'completed') in ('won', 'lost', 'paid', 'approved', 'completed', 'not_needed');

  update public.actions
  set status = 'done', completed_at = v_now, completed_by = v_uid,
      outcome_code = p_outcome_code, outcome_note = nullif(trim(p_outcome_note), ''),
      next_action_date = p_next_action_date, snoozed_until = null
  where id = v_action.id;

  update public.workflow_records
  set status = case when v_done then v_terminal_status else status end,
      next_action = case
        when v_done then null
        when p_next_action_date is not null then coalesce(nullif(trim(p_outcome_note), ''), next_action, 'Follow up')
        else next_action
      end,
      due_date = case when v_done then null when p_next_action_date is not null then p_next_action_date else due_date end,
      last_outcome_code = p_outcome_code,
      last_outcome_note = nullif(trim(p_outcome_note), ''),
      last_outcome_at = v_now,
      completed_at = case when v_done then v_now else completed_at end,
      updated_at = v_now
  where id = v_record.id;

  insert into public.workflow_events(
    business_id, workflow_instance_id, workflow_record_id, actor_id, event_name, metadata
  ) values (
    v_record.business_id, v_record.workflow_instance_id, v_record.id, v_uid, 'action_outcome_recorded',
    jsonb_build_object('action_id', v_action.id, 'outcome_code', p_outcome_code, 'next_action_date', p_next_action_date)
  );

  perform public.sync_workflow_actions(v_record.business_id);
  return jsonb_build_object(
    'id', v_action.id, 'kind', v_action.kind, 'entity_table', v_action.entity_table,
    'outcome_code', p_outcome_code, 'next_action_date', p_next_action_date,
    'workflow_record_id', v_record.id, 'already_done', false
  );
end;
$$;

create or replace function public.get_workflow_workspace(p_business_id uuid)
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
  if not public.can_access_business(p_business_id, v_uid) then raise exception 'business not accessible'; end if;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'installed', (select count(*) from public.workflow_instances where business_id = p_business_id and status = 'active'),
      'active_records', (
        select count(*)
        from public.workflow_records wr
        join public.workflow_instances wi on wi.id = wr.workflow_instance_id
        join public.workflow_templates wt on wt.id = wi.template_id
        where wr.business_id = p_business_id and wr.completed_at is null
          and not ((wt.definition->'terminal_statuses') ? wr.status)
      ),
      'due_records', (select count(*) from public.workflow_records where business_id = p_business_id and completed_at is null and due_date <= current_date),
      'unowned_records', (select count(*) from public.workflow_records where business_id = p_business_id and completed_at is null and assigned_to is null and nullif(trim(owner_label), '') is null)
    ),
    'templates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', wt.id, 'template_key', wt.template_key, 'department', wt.department,
        'name', wt.name, 'description', wt.description, 'version', wt.version,
        'definition', wt.definition,
        'installed', exists(select 1 from public.workflow_instances wi where wi.business_id = p_business_id and wi.template_id = wt.id and wi.status = 'active')
      ) order by wt.name)
      from public.workflow_templates wt where wt.active
    ), '[]'::jsonb),
    'instances', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', wi.id, 'name', wi.name, 'status', wi.status,
        'template_key', wt.template_key, 'department', wt.department,
        'template_name', wt.name, 'definition', wt.definition,
        'installed_version', wi.installed_version
      ) order by wt.name)
      from public.workflow_instances wi
      join public.workflow_templates wt on wt.id = wi.template_id
      where wi.business_id = p_business_id
    ), '[]'::jsonb),
    'records', coalesce((
      select jsonb_agg(row_to_json(x) order by x.priority desc, x.due_date nulls last, x.created_at desc)
      from (
        select wr.id, wr.workflow_instance_id, wi.name as workflow_name, wt.department,
               wr.reference, wr.title, wr.status, wr.owner_label, wr.assigned_to,
               wr.next_action, wr.due_date, wr.priority, wr.fields, wr.source,
               wr.last_outcome_code, wr.last_outcome_note, wr.last_outcome_at,
               wr.completed_at, wr.created_at, wr.updated_at
        from public.workflow_records wr
        join public.workflow_instances wi on wi.id = wr.workflow_instance_id
        join public.workflow_templates wt on wt.id = wi.template_id
        where wr.business_id = p_business_id
        order by wr.priority desc, wr.due_date nulls last, wr.created_at desc
        limit 300
      ) x
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(row_to_json(x) order by x.created_at desc)
      from (
        select we.event_name, we.metadata, we.created_at, wr.title as record_title
        from public.workflow_events we
        left join public.workflow_records wr on wr.id = we.workflow_record_id
        where we.business_id = p_business_id
        order by we.created_at desc limit 50
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.sync_workflow_actions(uuid) from public, anon;
revoke all on function public.install_workflow_template(uuid, text, text) from public, anon;
revoke all on function public.create_workflow_record(uuid, text, text, text, text, text, date, integer, jsonb) from public, anon;
revoke all on function public.update_workflow_record(uuid, text, text, text, date, integer) from public, anon;
revoke all on function public.complete_action_with_outcome_v2(uuid, text, text, date) from public, anon;
revoke all on function public.get_workflow_workspace(uuid) from public, anon;

grant execute on function public.sync_workflow_actions(uuid) to authenticated;
grant execute on function public.install_workflow_template(uuid, text, text) to authenticated;
grant execute on function public.create_workflow_record(uuid, text, text, text, text, text, date, integer, jsonb) to authenticated;
grant execute on function public.update_workflow_record(uuid, text, text, text, date, integer) to authenticated;
grant execute on function public.complete_action_with_outcome_v2(uuid, text, text, date) to authenticated;
grant execute on function public.get_workflow_workspace(uuid) to authenticated;
