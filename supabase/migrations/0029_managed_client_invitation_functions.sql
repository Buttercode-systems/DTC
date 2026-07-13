create or replace function public.create_managed_client_invitation(
  p_business_id uuid,
  p_email text,
  p_role text default 'owner'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, ''));
  v_token text;
  v_invitation public.managed_client_invitations%rowtype;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then raise exception 'operator_access_required'; end if;
  if not exists (select 1 from public.businesses where id = p_business_id and managed_by_tad) then raise exception 'managed_business_not_found'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'valid_email_required'; end if;
  if p_role not in ('owner', 'manager', 'viewer') then raise exception 'invalid_client_role'; end if;

  update public.managed_client_invitations
  set status = 'revoked', revoked_by = v_uid, revoked_at = now()
  where business_id = p_business_id and email = v_email and status = 'pending';

  v_token := replace(replace(replace(encode(extensions.gen_random_bytes(32), 'base64'), '+', '-'), '/', '_'), '=', '');

  insert into public.managed_client_invitations(
    business_id, email, role, token_hash, status, expires_at, created_by
  ) values (
    p_business_id,
    v_email,
    p_role,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    'pending',
    now() + interval '7 days',
    v_uid
  ) returning * into v_invitation;

  return jsonb_build_object(
    'id', v_invitation.id,
    'business_id', v_invitation.business_id,
    'email', v_invitation.email,
    'role', v_invitation.role,
    'token', v_token,
    'expires_at', v_invitation.expires_at
  );
end;
$$;

create or replace function public.get_managed_client_invitation(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_invitation public.managed_client_invitations%rowtype;
  v_business public.businesses%rowtype;
begin
  if char_length(trim(coalesce(p_token, ''))) < 32 then return null; end if;
  select * into v_invitation
  from public.managed_client_invitations
  where token_hash = encode(extensions.digest(trim(p_token), 'sha256'), 'hex')
  limit 1;
  if v_invitation.id is null then return null; end if;
  select * into v_business from public.businesses where id = v_invitation.business_id;
  return jsonb_build_object(
    'id', v_invitation.id,
    'business_id', v_invitation.business_id,
    'business_name', v_business.name,
    'email', v_invitation.email,
    'role', v_invitation.role,
    'status', case when v_invitation.status = 'pending' and v_invitation.expires_at <= now() then 'expired' else v_invitation.status end,
    'expires_at', v_invitation.expires_at
  );
end;
$$;

revoke all on function public.create_managed_client_invitation(uuid, text, text) from public, anon;
revoke all on function public.get_managed_client_invitation(text) from public;
grant execute on function public.create_managed_client_invitation(uuid, text, text) to authenticated;
grant execute on function public.get_managed_client_invitation(text) to anon, authenticated;
