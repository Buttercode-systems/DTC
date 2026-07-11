-- Production hardening for TAD managed-service access.
-- Restricts initial operator bootstrap, separates read/work/manage roles,
-- consolidates operational RLS policies and adds foreign-key indexes.

create or replace function public.is_tad_operator(p_user uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select p_user is not null
    and p_user = auth.uid()
    and exists (
      select 1 from public.platform_operators po
      where po.user_id = p_user and po.active
    );
$$;

create or replace function public.can_access_business(
  p_business_id uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select p_user is not null
    and p_user = auth.uid()
    and (
      public.is_tad_operator(p_user)
      or exists (
        select 1 from public.businesses b
        where b.id = p_business_id and b.owner_id = p_user
      )
      or exists (
        select 1 from public.business_memberships bm
        where bm.business_id = p_business_id
          and bm.user_id = p_user
          and bm.active
      )
    );
$$;

create or replace function public.can_work_business(
  p_business_id uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select p_user is not null
    and p_user = auth.uid()
    and (
      public.is_tad_operator(p_user)
      or exists (
        select 1 from public.businesses b
        where b.id = p_business_id and b.owner_id = p_user
      )
      or exists (
        select 1 from public.business_memberships bm
        where bm.business_id = p_business_id
          and bm.user_id = p_user
          and bm.active
          and bm.role in ('owner', 'manager', 'member', 'operator')
      )
    );
$$;

create or replace function public.can_manage_business(
  p_business_id uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select p_user is not null
    and p_user = auth.uid()
    and (
      public.is_tad_operator(p_user)
      or exists (
        select 1 from public.businesses b
        where b.id = p_business_id and b.owner_id = p_user
      )
      or exists (
        select 1 from public.business_memberships bm
        where bm.business_id = p_business_id
          and bm.user_id = p_user
          and bm.active
          and bm.role in ('owner', 'manager', 'operator')
      )
    );
$$;

-- Public DueToday signup exists, so the first authenticated user must never be
-- allowed to claim TAD administration. Only known owner accounts may bootstrap.
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
  if v_uid is null then raise exception 'not authenticated'; end if;

  select lower(email) into v_email
  from auth.users
  where id = v_uid;

  if v_email not in ('buttercoder.dev@gmail.com', 'bvsic101@gmail.com') then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext('claim_first_tad_operator'));

  if exists (
    select 1 from public.platform_operators
    where user_id = v_uid and active
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

revoke all on function public.is_tad_operator(uuid) from public;
revoke all on function public.can_access_business(uuid, uuid) from public;
revoke all on function public.can_work_business(uuid, uuid) from public;
revoke all on function public.can_manage_business(uuid, uuid) from public;
revoke all on function public.is_tad_operator(uuid) from anon;
revoke all on function public.can_access_business(uuid, uuid) from anon;
revoke all on function public.can_work_business(uuid, uuid) from anon;
revoke all on function public.can_manage_business(uuid, uuid) from anon;
grant execute on function public.is_tad_operator(uuid) to authenticated;
grant execute on function public.can_access_business(uuid, uuid) to authenticated;
grant execute on function public.can_work_business(uuid, uuid) to authenticated;
grant execute on function public.can_manage_business(uuid, uuid) to authenticated;

create index if not exists actions_assigned_to_idx
  on public.actions(assigned_to) where assigned_to is not null;
create index if not exists actions_completed_by_idx
  on public.actions(completed_by) where completed_by is not null;
create index if not exists user_preferences_business_idx
  on public.user_preferences(active_business_id) where active_business_id is not null;
create index if not exists service_approvals_business_idx
  on public.service_approvals(business_id);
create index if not exists service_approvals_engagement_idx
  on public.service_approvals(engagement_id) where engagement_id is not null;
create index if not exists service_approvals_requested_by_idx
  on public.service_approvals(requested_by) where requested_by is not null;
create index if not exists service_approvals_decided_by_idx
  on public.service_approvals(decided_by) where decided_by is not null;
create index if not exists service_reports_engagement_idx
  on public.service_reports(engagement_id) where engagement_id is not null;
create index if not exists service_reports_created_by_idx
  on public.service_reports(created_by) where created_by is not null;

-- Business access.
drop policy if exists "owner full access" on public.businesses;
drop policy if exists "accessible businesses read" on public.businesses;
drop policy if exists "operators create managed businesses" on public.businesses;
drop policy if exists "operators update businesses" on public.businesses;
create policy "business read" on public.businesses
  for select to authenticated using (public.can_access_business(id));
create policy "business insert" on public.businesses
  for insert to authenticated
  with check (owner_id = (select auth.uid()) or public.is_tad_operator());
create policy "business update" on public.businesses
  for update to authenticated
  using (public.can_manage_business(id))
  with check (public.can_manage_business(id));
create policy "business delete" on public.businesses
  for delete to authenticated
  using (owner_id = (select auth.uid()) or public.is_tad_operator());

-- Operator, membership and preference access.
drop policy if exists "operator profile self read" on public.platform_operators;
create policy "operator profile self read" on public.platform_operators
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "memberships own read" on public.business_memberships;
drop policy if exists "operators manage memberships" on public.business_memberships;
create policy "membership read" on public.business_memberships
  for select to authenticated
  using (user_id = (select auth.uid()) or public.can_manage_business(business_id));
create policy "membership insert" on public.business_memberships
  for insert to authenticated with check (public.can_manage_business(business_id));
create policy "membership update" on public.business_memberships
  for update to authenticated
  using (public.can_manage_business(business_id))
  with check (public.can_manage_business(business_id));
create policy "membership delete" on public.business_memberships
  for delete to authenticated using (public.can_manage_business(business_id));

drop policy if exists "preferences own access" on public.user_preferences;
create policy "preferences own access" on public.user_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Operational tables: viewers read; members work records.
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers', 'leads', 'quotes', 'invoices', 'payment_promises', 'actions'
  ]
  loop
    execute format('drop policy if exists "business scope" on public.%I', t);
    execute format('drop policy if exists "service workspace access" on public.%I', t);
    execute format('create policy "workspace read" on public.%I for select to authenticated using (public.can_access_business(business_id))', t);
    execute format('create policy "workspace insert" on public.%I for insert to authenticated with check (public.can_work_business(business_id))', t);
    execute format('create policy "workspace update" on public.%I for update to authenticated using (public.can_work_business(business_id)) with check (public.can_work_business(business_id))', t);
    execute format('create policy "workspace delete" on public.%I for delete to authenticated using (public.can_work_business(business_id))', t);
  end loop;
end
$$;

-- Service controls: accessible to clients, mutable only by managers/operators.
drop policy if exists "service engagement access" on public.service_engagements;
create policy "engagement read" on public.service_engagements
  for select to authenticated using (public.can_access_business(business_id));
create policy "engagement insert" on public.service_engagements
  for insert to authenticated with check (public.can_manage_business(business_id));
create policy "engagement update" on public.service_engagements
  for update to authenticated
  using (public.can_manage_business(business_id))
  with check (public.can_manage_business(business_id));
create policy "engagement delete" on public.service_engagements
  for delete to authenticated using (public.can_manage_business(business_id));

drop policy if exists "service approval access" on public.service_approvals;
create policy "approval read" on public.service_approvals
  for select to authenticated using (public.can_access_business(business_id));
create policy "approval insert" on public.service_approvals
  for insert to authenticated with check (public.can_manage_business(business_id));
create policy "approval update" on public.service_approvals
  for update to authenticated
  using (public.can_manage_business(business_id))
  with check (public.can_manage_business(business_id));
create policy "approval delete" on public.service_approvals
  for delete to authenticated using (public.can_manage_business(business_id));

drop policy if exists "service report access" on public.service_reports;
create policy "report read" on public.service_reports
  for select to authenticated using (public.can_access_business(business_id));
create policy "report insert" on public.service_reports
  for insert to authenticated with check (public.can_manage_business(business_id));
create policy "report update" on public.service_reports
  for update to authenticated
  using (public.can_manage_business(business_id))
  with check (public.can_manage_business(business_id));
create policy "report delete" on public.service_reports
  for delete to authenticated using (public.can_manage_business(business_id));
