-- Cycle 13: Production Automation Architecture
-- Foundation only: settings, source connections, sync runs, notification queue, and action audit log.
-- This does not enable customer autopilot. Customer-facing automation remains owner-approved by default.

create table if not exists public.automation_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  daily_brief_enabled boolean not null default false,
  daily_brief_time time not null default '07:30',
  timezone text not null default 'Africa/Johannesburg',
  daily_brief_channel text not null default 'email' check (daily_brief_channel in ('email', 'whatsapp', 'in_app')),
  customer_message_mode text not null default 'draft_only' check (customer_message_mode in ('manual_only', 'draft_only', 'approved_send', 'autopilot_internal_only')),
  approved_send_enabled boolean not null default false,
  autopilot_enabled boolean not null default false,
  require_approval_for_customer_messages boolean not null default true,
  quiet_hours_start time not null default '18:00',
  quiet_hours_end time not null default '07:00',
  max_customer_messages_per_day integer not null default 10 check (max_customer_messages_per_day between 0 and 100),
  pause_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_customer_autopilot_without_approval check (
    require_approval_for_customer_messages = true
    or customer_message_mode in ('manual_only', 'draft_only')
  )
);

alter table public.automation_settings enable row level security;

drop policy if exists automation_settings_owner_select on public.automation_settings;
create policy automation_settings_owner_select
on public.automation_settings
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = automation_settings.business_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists automation_settings_owner_insert on public.automation_settings;
create policy automation_settings_owner_insert
on public.automation_settings
for insert
to authenticated
with check (
  exists (
    select 1 from public.businesses b
    where b.id = automation_settings.business_id
      and b.owner_id = auth.uid()
  )
  and require_approval_for_customer_messages = true
);

drop policy if exists automation_settings_owner_update on public.automation_settings;
create policy automation_settings_owner_update
on public.automation_settings
for update
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = automation_settings.business_id
      and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = automation_settings.business_id
      and b.owner_id = auth.uid()
  )
  and require_approval_for_customer_messages = true
);

create table if not exists public.source_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_type text not null check (source_type in ('manual', 'csv', 'google_sheets', 'gmail', 'solobid', 'rentease', 'radflow', 'other')),
  display_name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'needs_attention', 'disabled')),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  external_account_id text,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.source_connections enable row level security;

drop policy if exists source_connections_owner_all on public.source_connections;
create policy source_connections_owner_all
on public.source_connections
for all
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = source_connections.business_id
      and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = source_connections.business_id
      and b.owner_id = auth.uid()
  )
);

create index if not exists source_connections_business_status_idx
  on public.source_connections (business_id, status, source_type);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_connection_id uuid references public.source_connections(id) on delete set null,
  run_type text not null default 'manual' check (run_type in ('manual', 'scheduled', 'webhook', 'system')),
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed', 'cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_seen integer not null default 0 check (records_seen >= 0),
  records_created integer not null default 0 check (records_created >= 0),
  records_updated integer not null default 0 check (records_updated >= 0),
  actions_created integer not null default 0 check (actions_created >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

alter table public.sync_runs enable row level security;

drop policy if exists sync_runs_owner_select on public.sync_runs;
create policy sync_runs_owner_select
on public.sync_runs
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = sync_runs.business_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists sync_runs_owner_insert on public.sync_runs;
create policy sync_runs_owner_insert
on public.sync_runs
for insert
to authenticated
with check (
  exists (
    select 1 from public.businesses b
    where b.id = sync_runs.business_id
      and b.owner_id = auth.uid()
  )
);

create index if not exists sync_runs_business_started_idx
  on public.sync_runs (business_id, started_at desc);
create index if not exists sync_runs_source_started_idx
  on public.sync_runs (source_connection_id, started_at desc);

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  action_id uuid references public.actions(id) on delete set null,
  channel text not null check (channel in ('email', 'whatsapp', 'in_app', 'webhook')),
  recipient text,
  subject text,
  body text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'queued' check (status in ('queued', 'ready', 'blocked', 'sent', 'failed', 'cancelled')),
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  requires_approval boolean not null default true,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint customer_messages_require_approval check (
    channel not in ('email', 'whatsapp')
    or requires_approval = true
    or approved_at is not null
  )
);

alter table public.notification_queue enable row level security;

drop policy if exists notification_queue_owner_select on public.notification_queue;
create policy notification_queue_owner_select
on public.notification_queue
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = notification_queue.business_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists notification_queue_owner_update on public.notification_queue;
create policy notification_queue_owner_update
on public.notification_queue
for update
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = notification_queue.business_id
      and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = notification_queue.business_id
      and b.owner_id = auth.uid()
  )
);

-- Inserts are owner-scoped for now. A future service-role scheduler may insert on behalf of businesses.
drop policy if exists notification_queue_owner_insert on public.notification_queue;
create policy notification_queue_owner_insert
on public.notification_queue
for insert
to authenticated
with check (
  exists (
    select 1 from public.businesses b
    where b.id = notification_queue.business_id
      and b.owner_id = auth.uid()
  )
  and (
    channel not in ('email', 'whatsapp')
    or requires_approval = true
  )
);

create index if not exists notification_queue_business_status_idx
  on public.notification_queue (business_id, status, scheduled_for);
create index if not exists notification_queue_action_idx
  on public.notification_queue (action_id);

create table if not exists public.action_audit_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  action_id uuid references public.actions(id) on delete set null,
  actor_id uuid default auth.uid(),
  actor_type text not null default 'user' check (actor_type in ('user', 'system', 'automation')),
  event_name text not null check (length(event_name) between 2 and 80),
  old_status text,
  new_status text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.action_audit_log enable row level security;

drop policy if exists action_audit_log_owner_select on public.action_audit_log;
create policy action_audit_log_owner_select
on public.action_audit_log
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = action_audit_log.business_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists action_audit_log_owner_insert on public.action_audit_log;
create policy action_audit_log_owner_insert
on public.action_audit_log
for insert
to authenticated
with check (
  exists (
    select 1 from public.businesses b
    where b.id = action_audit_log.business_id
      and b.owner_id = auth.uid()
  )
);

create index if not exists action_audit_log_business_created_idx
  on public.action_audit_log (business_id, created_at desc);
create index if not exists action_audit_log_action_created_idx
  on public.action_audit_log (action_id, created_at desc);

create or replace function public.get_or_create_automation_settings()
returns public.automation_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_settings public.automation_settings;
begin
  select * into v_business
  from public.businesses
  where owner_id = auth.uid()
  limit 1;

  if v_business.id is null then
    raise exception 'No business found.';
  end if;

  insert into public.automation_settings (business_id)
  values (v_business.id)
  on conflict (business_id) do nothing;

  select * into v_settings
  from public.automation_settings
  where business_id = v_business.id;

  return v_settings;
end;
$$;

revoke all on function public.get_or_create_automation_settings() from public;
grant execute on function public.get_or_create_automation_settings() to authenticated;
