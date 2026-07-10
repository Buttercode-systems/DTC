-- Cycle 19: Google sources + internal autopilot foundation
-- Adds encrypted-token storage metadata and source import dedupe.
-- This does not permit unapproved customer sends.

create table if not exists public.source_connection_secrets (
  source_connection_id uuid primary key references public.source_connections(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider text not null check (provider in ('google')),
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  token_type text not null default 'Bearer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deliberately deny-by-default. OAuth tokens are for server/service-role use only.
alter table public.source_connection_secrets enable row level security;

create index if not exists source_connection_secrets_business_idx
  on public.source_connection_secrets (business_id, provider);

create table if not exists public.source_import_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_connection_id uuid not null references public.source_connections(id) on delete cascade,
  source_type text not null,
  external_id text not null,
  entity_table text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (business_id, source_connection_id, external_id)
);

alter table public.source_import_events enable row level security;

-- Owners may see import evidence, but only server-side sync jobs insert it.
drop policy if exists source_import_events_owner_select on public.source_import_events;
create policy source_import_events_owner_select
on public.source_import_events
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = source_import_events.business_id
      and b.owner_id = (select auth.uid())
  )
);

create index if not exists source_import_events_source_idx
  on public.source_import_events (source_connection_id, created_at desc);
create index if not exists source_import_events_business_idx
  on public.source_import_events (business_id, source_type, created_at desc);

-- Keep customer-facing safety hard even when internal autopilot is enabled.
alter table public.automation_settings
  drop constraint if exists no_customer_autopilot_without_approval;

alter table public.automation_settings
  add constraint no_customer_autopilot_without_approval check (
    require_approval_for_customer_messages = true
    and customer_message_mode in ('manual_only', 'draft_only', 'approved_send', 'autopilot_internal_only')
  );
