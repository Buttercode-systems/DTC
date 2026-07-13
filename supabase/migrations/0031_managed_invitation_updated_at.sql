-- Repair existing environments that applied the managed-client registration
-- functions before the invitation table carried the timestamp they update.
alter table public.managed_client_invitations
  add column if not exists updated_at timestamptz not null default now();

update public.managed_client_invitations
set updated_at = coalesce(claimed_at, revoked_at, last_registration_attempt_at, created_at, now())
where updated_at is null;
