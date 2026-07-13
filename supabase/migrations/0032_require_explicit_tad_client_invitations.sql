-- Retire the earlier email-only automatic claim. A matching primary-contact email
-- is useful context but is not sufficient authority to create portal access.
-- Managed clients must use a pending, unexpired, one-time invitation instead.
create or replace function public.claim_tad_client_access()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'explicit_client_invitation_required';
end;
$$;

revoke all on function public.claim_tad_client_access() from public, anon, authenticated;
grant execute on function public.claim_tad_client_access() to service_role;
