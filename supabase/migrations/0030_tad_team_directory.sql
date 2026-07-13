-- Secure team directory for self-service workspace owners and managers.

create or replace function public.get_workspace_team(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_members jsonb;
  v_invitations jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.can_access_business(p_business_id,auth.uid()) then raise exception 'business not accessible'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',m.user_id,
    'email',u.email,
    'role',m.role,
    'active',m.active,
    'created_at',m.created_at,
    'is_owner',b.owner_id = m.user_id
  ) order by (b.owner_id = m.user_id) desc,m.created_at),'[]'::jsonb)
  into v_members
  from public.business_memberships m
  join public.businesses b on b.id = m.business_id
  left join auth.users u on u.id = m.user_id
  where m.business_id = p_business_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,
    'email',i.email,
    'role',i.role,
    'status',i.status,
    'expires_at',i.expires_at,
    'created_at',i.created_at
  ) order by i.created_at desc),'[]'::jsonb)
  into v_invitations
  from public.workspace_invitations i
  where i.business_id = p_business_id and i.status = 'pending';

  return jsonb_build_object('members',v_members,'invitations',v_invitations);
end;
$$;

grant execute on function public.get_workspace_team(uuid) to authenticated;
