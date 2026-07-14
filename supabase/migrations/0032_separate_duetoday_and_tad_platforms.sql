-- Keep DueToday and The Admin Department as separate products even when they share infrastructure.

alter table public.businesses
  add column if not exists platform_key text not null default 'duetoday'
    check (platform_key in ('duetoday','tad'));

-- Managed workspaces are unambiguously TAD. Existing self-service workspaces are
-- intentionally not guessed here because PR 25 activated TAD departments for some
-- ordinary DueToday signups. Operators can classify genuine TAD SaaS workspaces.
update public.businesses
set platform_key = 'tad'
where managed_by_tad = true;

create index if not exists businesses_platform_key_idx
  on public.businesses(platform_key);

create or replace function public.set_business_platform(
  p_business_id uuid,
  p_platform_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_platform_key not in ('duetoday','tad') then raise exception 'invalid platform'; end if;
  if not public.can_manage_business(p_business_id,auth.uid()) then
    raise exception 'manager access required';
  end if;

  update public.businesses
  set platform_key = p_platform_key,
      updated_at = now()
  where id = p_business_id;

  if not found then raise exception 'business not found'; end if;
  return p_platform_key;
end;
$$;

grant execute on function public.set_business_platform(uuid,text) to authenticated;
