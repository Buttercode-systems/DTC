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

-- Any present or future workflow that creates a managed business must classify it
-- as TAD even if the caller does not know about platform_key yet.
create or replace function public.enforce_managed_business_platform()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.managed_by_tad then
    new.platform_key := 'tad';
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_enforce_managed_platform on public.businesses;
create trigger businesses_enforce_managed_platform
before insert or update of managed_by_tad,platform_key on public.businesses
for each row execute function public.enforce_managed_business_platform();

-- The database, not only the UI, prevents TAD operational state from being added
-- to an ordinary DueToday workspace.
create or replace function public.enforce_tad_workspace_resource()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_platform_key text;
begin
  v_business_id := new.business_id;
  select b.platform_key into v_platform_key
  from public.businesses b
  where b.id = v_business_id;

  if v_platform_key is distinct from 'tad' then
    raise exception 'TAD resources require a TAD workspace';
  end if;
  return new;
end;
$$;

drop trigger if exists service_engagements_require_tad_workspace on public.service_engagements;
create trigger service_engagements_require_tad_workspace
before insert or update of business_id on public.service_engagements
for each row execute function public.enforce_tad_workspace_resource();

drop trigger if exists workspace_subscriptions_require_tad_workspace on public.workspace_subscriptions;
create trigger workspace_subscriptions_require_tad_workspace
before insert or update of business_id on public.workspace_subscriptions
for each row execute function public.enforce_tad_workspace_resource();

create or replace function public.get_business_platform(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_platform_key text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.can_access_business(p_business_id,auth.uid()) then
    raise exception 'business not accessible';
  end if;

  select b.platform_key into v_platform_key
  from public.businesses b
  where b.id = p_business_id;

  if v_platform_key is null then raise exception 'business not found'; end if;
  return v_platform_key;
end;
$$;

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

  if p_platform_key = 'duetoday' and exists (
    select 1 from public.service_engagements e where e.business_id = p_business_id
  ) then
    raise exception 'remove TAD engagements before changing this workspace to DueToday';
  end if;

  update public.businesses
  set platform_key = p_platform_key,
      updated_at = now()
  where id = p_business_id;

  if not found then raise exception 'business not found'; end if;
  return p_platform_key;
end;
$$;

grant execute on function public.get_business_platform(uuid) to authenticated;
grant execute on function public.set_business_platform(uuid,text) to authenticated;
