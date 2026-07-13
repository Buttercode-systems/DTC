-- Self-service team management and onboarding completion.

create or replace function public.create_workspace_invitation(
  p_business_id uuid,
  p_email text,
  p_role text default 'viewer'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email,'')));
  v_token text;
  v_invitation public.workspace_invitations%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.can_manage_business(p_business_id,v_uid) then raise exception 'manager access required'; end if;
  if v_email = '' or position('@' in v_email) < 2 then raise exception 'valid email required'; end if;
  if p_role not in ('manager','member','viewer') then raise exception 'invalid role'; end if;

  update public.workspace_invitations
  set status = 'revoked'
  where business_id = p_business_id and lower(email) = v_email and status = 'pending';

  v_token := encode(gen_random_bytes(32),'hex');
  insert into public.workspace_invitations(
    business_id,email,role,token_hash,status,invited_by,expires_at
  ) values (
    p_business_id,v_email,p_role,encode(digest(v_token,'sha256'),'hex'),'pending',v_uid,now() + interval '7 days'
  ) returning * into v_invitation;

  return jsonb_build_object(
    'id',v_invitation.id,
    'business_id',v_invitation.business_id,
    'email',v_invitation.email,
    'role',v_invitation.role,
    'expires_at',v_invitation.expires_at,
    'token',v_token
  );
end;
$$;

create or replace function public.accept_workspace_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invitation public.workspace_invitations%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select lower(trim(email)) into v_email from auth.users where id = v_uid;
  if v_email is null then raise exception 'verified email required'; end if;

  select * into v_invitation
  from public.workspace_invitations
  where token_hash = encode(digest(trim(coalesce(p_token,'')),'sha256'),'hex')
    and status = 'pending'
  for update;

  if v_invitation.id is null then raise exception 'invitation not found'; end if;
  if v_invitation.expires_at <= now() then
    update public.workspace_invitations set status = 'expired' where id = v_invitation.id;
    raise exception 'invitation expired';
  end if;
  if lower(v_invitation.email) <> v_email then raise exception 'invitation email does not match account'; end if;

  insert into public.business_memberships(business_id,user_id,role,active)
  values (v_invitation.business_id,v_uid,v_invitation.role,true)
  on conflict (business_id,user_id) do update
    set role = excluded.role, active = true;

  update public.workspace_invitations
  set status = 'accepted',accepted_by = v_uid,accepted_at = now()
  where id = v_invitation.id;

  insert into public.user_preferences(user_id,active_business_id,updated_at)
  values (v_uid,v_invitation.business_id,now())
  on conflict (user_id) do update
    set active_business_id = excluded.active_business_id,updated_at = now();

  return jsonb_build_object(
    'business_id',v_invitation.business_id,
    'role',v_invitation.role,
    'status','accepted'
  );
end;
$$;

create or replace function public.revoke_workspace_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select business_id into v_business_id from public.workspace_invitations where id = p_invitation_id;
  if v_business_id is null then raise exception 'invitation not found'; end if;
  if not public.can_manage_business(v_business_id,auth.uid()) then raise exception 'manager access required'; end if;
  update public.workspace_invitations set status = 'revoked' where id = p_invitation_id and status = 'pending';
  return found;
end;
$$;

create or replace function public.update_workspace_member_role(
  p_business_id uuid,
  p_user_id uuid,
  p_role text,
  p_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_membership public.business_memberships%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.can_manage_business(p_business_id,auth.uid()) then raise exception 'manager access required'; end if;
  if p_role not in ('manager','member','viewer') then raise exception 'invalid role'; end if;
  select owner_id into v_owner from public.businesses where id = p_business_id;
  if p_user_id = v_owner then raise exception 'workspace owner role cannot be changed'; end if;

  update public.business_memberships
  set role = p_role,active = p_active
  where business_id = p_business_id and user_id = p_user_id
  returning * into v_membership;
  if v_membership.user_id is null then raise exception 'membership not found'; end if;

  return jsonb_build_object('user_id',v_membership.user_id,'role',v_membership.role,'active',v_membership.active);
end;
$$;

create or replace function public.complete_tad_onboarding(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active integer;
  v_configured integer;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.can_manage_business(p_business_id,auth.uid()) then raise exception 'manager access required'; end if;

  select count(*),count(*) filter (where configured_at is not null)
  into v_active,v_configured
  from public.service_engagements
  where business_id = p_business_id and enabled and department in ('invoice','sales','client','property','practice','member');

  if v_active <> 6 then raise exception 'all six departments must be active'; end if;
  if v_configured <> 6 then raise exception 'all six departments must be configured'; end if;

  update public.businesses set onboarding_status = 'complete' where id = p_business_id;
  return jsonb_build_object('business_id',p_business_id,'onboarding_status','complete','active_departments',v_active);
end;
$$;

grant execute on function public.create_workspace_invitation(uuid,text,text) to authenticated;
grant execute on function public.accept_workspace_invitation(text) to authenticated;
grant execute on function public.revoke_workspace_invitation(uuid) to authenticated;
grant execute on function public.update_workspace_member_role(uuid,uuid,text,boolean) to authenticated;
grant execute on function public.complete_tad_onboarding(uuid) to authenticated;
