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

  with team_rows as (
    select
      b.owner_id as user_id,
      u.email,
      'owner'::text as role,
      true as active,
      b.created_at,
      true as is_owner
    from public.businesses b
    left join auth.users u on u.id = b.owner_id
    where b.id = p_business_id

    union all

    select
      m.user_id,
      u.email,
      m.role,
      m.active,
      m.created_at,
      false as is_owner
    from public.business_memberships m
    left join auth.users u on u.id = m.user_id
    join public.businesses b on b.id = m.business_id
    where m.business_id = p_business_id
      and m.user_id <> b.owner_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',team_rows.user_id,
    'email',team_rows.email,
    'role',team_rows.role,
    'active',team_rows.active,
    'created_at',team_rows.created_at,
    'is_owner',team_rows.is_owner
  ) order by team_rows.is_owner desc,team_rows.created_at),'[]'::jsonb)
  into v_members
  from team_rows;

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
