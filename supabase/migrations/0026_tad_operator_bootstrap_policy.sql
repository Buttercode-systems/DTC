-- Source-control the TAD operator bootstrap policy and remove the production-only
-- email mismatch that prevented the actual owner account from claiming Admin HQ.

create table if not exists public.tad_operator_bootstrap_emails (
  email text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (email = lower(trim(email)))
);

alter table public.tad_operator_bootstrap_emails enable row level security;
revoke all on table public.tad_operator_bootstrap_emails from public, anon, authenticated;

insert into public.tad_operator_bootstrap_emails(email, active)
values
  ('ramatsienkoanyane07@gmail.com', true),
  ('buttercoder.dev@gmail.com', true),
  ('bvsic101@gmail.com', true)
on conflict (email) do update set active = excluded.active;

create or replace function public.claim_first_tad_operator()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select lower(trim(email))
  into v_email
  from auth.users
  where id = v_uid;

  if v_email is null or not exists (
    select 1
    from public.tad_operator_bootstrap_emails allowed
    where allowed.email = v_email
      and allowed.active
  ) then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext('claim_first_tad_operator'));

  if exists (
    select 1
    from public.platform_operators
    where user_id = v_uid
      and active
  ) then
    return true;
  end if;

  if exists (select 1 from public.platform_operators where active) then
    return false;
  end if;

  insert into public.platform_operators(user_id, role, active)
  values (v_uid, 'admin', true)
  on conflict (user_id) do update
    set role = 'admin', active = true;

  return true;
end;
$$;

revoke all on function public.claim_first_tad_operator() from public, anon;
grant execute on function public.claim_first_tad_operator() to authenticated;

-- Repair the production owner account immediately when it already exists.
insert into public.platform_operators(user_id, role, active)
select id, 'admin', true
from auth.users
where lower(trim(email)) = 'ramatsienkoanyane07@gmail.com'
on conflict (user_id) do update
  set role = 'admin', active = true;
