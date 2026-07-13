create table if not exists public.managed_client_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  role text not null default 'owner' check (role in ('owner', 'manager', 'viewer')),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'revoked', 'expired')),
  expires_at timestamptz not null default now() + interval '7 days',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  check (email = lower(trim(email)))
);

alter table public.managed_client_invitations enable row level security;
revoke all on table public.managed_client_invitations from public, anon, authenticated;

create index if not exists managed_client_invitations_business_idx
  on public.managed_client_invitations(business_id, created_at desc);
create unique index if not exists managed_client_invitations_pending_email_idx
  on public.managed_client_invitations(business_id, email)
  where status = 'pending';
