-- A TAD invitation is delivered to one exact email address and is already a
-- high-entropy one-time bearer credential. Use it as the email-verification proof
-- for managed-client registration so onboarding does not depend on the low-volume
-- default Supabase SMTP service.

alter table public.managed_client_invitations
  add column if not exists registration_attempts integer not null default 0,
  add column if not exists last_registration_attempt_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.managed_client_invitations
  drop constraint if exists managed_client_invitations_registration_attempts_check;
alter table public.managed_client_invitations
  add constraint managed_client_invitations_registration_attempts_check
  check (registration_attempts between 0 and 20);

create or replace function public.reserve_managed_client_registration(
  p_token text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.managed_client_invitations%rowtype;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if char_length(trim(coalesce(p_token, ''))) < 32 then
    raise exception 'invitation_not_found';
  end if;

  select * into v_invitation
  from public.managed_client_invitations
  where token_hash = encode(extensions.digest(trim(p_token), 'sha256'), 'hex')
  for update;

  if v_invitation.id is null then raise exception 'invitation_not_found'; end if;
  if v_invitation.status <> 'pending' then raise exception 'invitation_not_pending'; end if;
  if v_invitation.expires_at <= now() then
    update public.managed_client_invitations
    set status = 'expired', updated_at = now()
    where id = v_invitation.id;
    raise exception 'invitation_expired';
  end if;
  if v_email <> v_invitation.email then raise exception 'invitation_email_mismatch'; end if;
  if v_invitation.registration_attempts >= 10 then
    raise exception 'registration_attempt_limit_reached';
  end if;

  update public.managed_client_invitations
  set registration_attempts = registration_attempts + 1,
      last_registration_attempt_at = now(),
      updated_at = now()
  where id = v_invitation.id
  returning * into v_invitation;

  return jsonb_build_object(
    'invitation_id', v_invitation.id,
    'business_id', v_invitation.business_id,
    'email', v_invitation.email,
    'role', v_invitation.role,
    'expires_at', v_invitation.expires_at,
    'registration_attempts', v_invitation.registration_attempts
  );
end;
$$;

create or replace function public.claim_managed_client_invitation_for_user(
  p_token text,
  p_user_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.managed_client_invitations%rowtype;
  v_business public.businesses%rowtype;
  v_auth_email text;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if p_user_id is null or char_length(trim(coalesce(p_token, ''))) < 32 then
    raise exception 'invitation_not_found';
  end if;

  select * into v_invitation
  from public.managed_client_invitations
  where token_hash = encode(extensions.digest(trim(p_token), 'sha256'), 'hex')
  for update;

  if v_invitation.id is null then raise exception 'invitation_not_found'; end if;
  if v_invitation.status <> 'pending' then raise exception 'invitation_not_pending'; end if;
  if v_invitation.expires_at <= now() then
    update public.managed_client_invitations
    set status = 'expired', updated_at = now()
    where id = v_invitation.id;
    raise exception 'invitation_expired';
  end if;
  if v_email <> v_invitation.email then raise exception 'invitation_email_mismatch'; end if;

  select lower(trim(email)) into v_auth_email
  from auth.users
  where id = p_user_id and deleted_at is null;
  if v_auth_email is null then raise exception 'auth_user_not_found'; end if;
  if v_auth_email <> v_invitation.email or v_auth_email <> v_email then
    raise exception 'auth_user_email_mismatch';
  end if;

  select * into v_business from public.businesses where id = v_invitation.business_id;
  if v_business.id is null or not v_business.managed_by_tad then
    raise exception 'managed_business_not_found';
  end if;

  insert into public.business_memberships(business_id, user_id, role, active)
  values(v_invitation.business_id, p_user_id, v_invitation.role, true)
  on conflict(business_id, user_id) do update
  set role = case
        when public.business_memberships.role = 'operator' then 'operator'
        else excluded.role
      end,
      active = true;

  update public.managed_client_invitations
  set status = 'claimed',
      claimed_by = p_user_id,
      claimed_at = now(),
      updated_at = now()
  where id = v_invitation.id;

  insert into public.user_preferences(user_id, active_business_id, updated_at)
  values(p_user_id, v_invitation.business_id, now())
  on conflict(user_id) do update
  set active_business_id = excluded.active_business_id,
      updated_at = now();

  return jsonb_build_object(
    'invitation_id', v_invitation.id,
    'business_id', v_invitation.business_id,
    'user_id', p_user_id,
    'email', v_email,
    'role', v_invitation.role,
    'status', 'claimed'
  );
end;
$$;

revoke all on function public.reserve_managed_client_registration(text,text)
  from public, anon, authenticated;
revoke all on function public.claim_managed_client_invitation_for_user(text,uuid,text)
  from public, anon, authenticated;
grant execute on function public.reserve_managed_client_registration(text,text)
  to service_role;
grant execute on function public.claim_managed_client_invitation_for_user(text,uuid,text)
  to service_role;
