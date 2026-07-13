create or replace function public.claim_managed_client_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_user_email text;
  v_invitation public.managed_client_invitations%rowtype;
  v_department text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select lower(trim(email)) into v_user_email from auth.users where id = v_uid;
  select * into v_invitation
  from public.managed_client_invitations
  where token_hash = encode(extensions.digest(trim(coalesce(p_token, '')), 'sha256'), 'hex')
  for update;
  if v_invitation.id is null then raise exception 'invitation_not_found'; end if;
  if v_invitation.status <> 'pending' then raise exception 'invitation_not_pending'; end if;
  if v_invitation.expires_at <= now() then
    update public.managed_client_invitations set status = 'expired' where id = v_invitation.id;
    raise exception 'invitation_expired';
  end if;
  if v_user_email is distinct from v_invitation.email then raise exception 'invitation_email_mismatch'; end if;

  insert into public.business_memberships(business_id, user_id, role, active)
  values(v_invitation.business_id, v_uid, v_invitation.role, true)
  on conflict(business_id, user_id) do update set role = excluded.role, active = true;

  if v_invitation.role = 'owner' then
    update public.businesses set owner_id = v_uid where id = v_invitation.business_id;
  end if;

  insert into public.user_preferences(user_id, active_business_id, updated_at)
  values(v_uid, v_invitation.business_id, now())
  on conflict(user_id) do update set active_business_id = excluded.active_business_id, updated_at = now();

  update public.managed_client_invitations
  set status = 'claimed', claimed_by = v_uid, claimed_at = now()
  where id = v_invitation.id;

  select department into v_department
  from public.service_engagements
  where business_id = v_invitation.business_id
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'business_id', v_invitation.business_id,
    'role', v_invitation.role,
    'department', v_department,
    'status', 'claimed'
  );
end;
$$;

create or replace function public.get_managed_client_access(p_business_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then raise exception 'operator_access_required'; end if;
  if not exists (select 1 from public.businesses where id = p_business_id and managed_by_tad) then raise exception 'managed_business_not_found'; end if;
  return jsonb_build_object(
    'memberships', coalesce((
      select jsonb_agg(row_to_json(x) order by x.email)
      from (
        select bm.user_id, lower(u.email) as email, bm.role, bm.active, bm.created_at
        from public.business_memberships bm
        join auth.users u on u.id = bm.user_id
        where bm.business_id = p_business_id and bm.role in ('owner', 'manager', 'viewer')
      ) x
    ), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(row_to_json(x) order by x.created_at desc)
      from (
        select i.id, i.email, i.role,
               case when i.status = 'pending' and i.expires_at <= now() then 'expired' else i.status end as status,
               i.expires_at, i.created_at, i.claimed_at, i.revoked_at
        from public.managed_client_invitations i
        where i.business_id = p_business_id
        order by i.created_at desc
        limit 30
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.revoke_managed_client_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_business_id uuid;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then raise exception 'operator_access_required'; end if;
  update public.managed_client_invitations
  set status = 'revoked', revoked_by = v_uid, revoked_at = now()
  where id = p_invitation_id and status = 'pending'
  returning business_id into v_business_id;
  return v_business_id is not null;
end;
$$;

create or replace function public.deactivate_managed_client_access(p_business_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_changed boolean := false;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then raise exception 'operator_access_required'; end if;
  if not exists (select 1 from public.businesses where id = p_business_id and managed_by_tad) then raise exception 'managed_business_not_found'; end if;
  update public.business_memberships
  set active = false
  where business_id = p_business_id and user_id = p_user_id and role in ('owner', 'manager', 'viewer');
  v_changed := found;
  if v_changed then
    update public.businesses set owner_id = v_uid where id = p_business_id and owner_id = p_user_id;
    update public.user_preferences
    set active_business_id = null, updated_at = now()
    where user_id = p_user_id and active_business_id = p_business_id;
  end if;
  return v_changed;
end;
$$;

revoke all on function public.claim_managed_client_invitation(text) from public, anon;
revoke all on function public.get_managed_client_access(uuid) from public, anon;
revoke all on function public.revoke_managed_client_invitation(uuid) from public, anon;
revoke all on function public.deactivate_managed_client_access(uuid, uuid) from public, anon;
grant execute on function public.claim_managed_client_invitation(text) to authenticated;
grant execute on function public.get_managed_client_access(uuid) to authenticated;
grant execute on function public.revoke_managed_client_invitation(uuid) to authenticated;
grant execute on function public.deactivate_managed_client_access(uuid, uuid) to authenticated;
