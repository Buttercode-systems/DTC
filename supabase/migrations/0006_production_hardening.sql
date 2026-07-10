-- Production hardening:
--   1. Wrap auth.uid() in a scalar subquery in every RLS policy so Postgres
--      evaluates it once per statement (initplan) instead of once per row.
--   2. Add covering indexes for foreign keys used on hot paths; drop the
--      duplicate index on assessments.token.
--   3. Close the anonymous direct-insert policy on analytics_events and
--      replace it with a constrained SECURITY DEFINER function.

-- --------------------------------------------------- 1. RLS initplan rewrite
-- Recreate every policy that references a bare auth.uid(), substituting
-- (select auth.uid()). Policy shape (command, roles, using, with check) is
-- preserved verbatim from the catalog.
do $$
declare
  p record;
  role_list text;
  new_qual text;
  new_check text;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%')
  loop
    role_list := array_to_string(p.roles, ', ');
    new_qual := replace(p.qual, 'auth.uid()', '(select auth.uid())');
    new_check := replace(p.with_check, 'auth.uid()', '(select auth.uid())');

    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);

    stmt := format('create policy %I on %I.%I for %s to %s',
      p.policyname, p.schemaname, p.tablename, p.cmd, role_list);
    if new_qual is not null then
      stmt := stmt || format(' using (%s)', new_qual);
    end if;
    if new_check is not null then
      stmt := stmt || format(' with check (%s)', new_check);
    end if;
    execute stmt;
  end loop;
end $$;

-- --------------------------------------------------- 2. Indexes
create index if not exists payment_promises_invoice_idx
  on public.payment_promises (invoice_id);
create index if not exists quotes_customer_idx
  on public.quotes (customer_id);
create index if not exists quotes_lead_idx
  on public.quotes (lead_id);
create index if not exists invoices_customer_idx
  on public.invoices (customer_id);
create index if not exists invoices_quote_idx
  on public.invoices (quote_id);
create index if not exists assessments_lead_idx
  on public.assessments (lead_id);
create index if not exists assessments_claimed_business_idx
  on public.assessments (claimed_business)
  where claimed_business is not null;

-- token already has a unique index from its constraint; this one is redundant.
drop index if exists public.assessments_token_idx;

-- --------------------------------------------------- 3. analytics_events
-- Anonymous callers may no longer insert arbitrary rows through PostgREST.
-- Authenticated owners keep direct inserts; public funnel events go through
-- a definer function that whitelists event names and caps payload size.
drop policy if exists analytics_events_public_insert on public.analytics_events;

create policy analytics_events_owner_insert
on public.analytics_events
for insert
to authenticated
with check (
  jsonb_typeof(metadata) = 'object'
  and (user_id is null or user_id = (select auth.uid()))
  and (
    business_id is null
    or exists (
      select 1
      from public.businesses b
      where b.id = analytics_events.business_id
        and b.owner_id = (select auth.uid())
    )
  )
);

create or replace function public.track_public_event(
  p_event_name text,
  p_path text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event_name is null
     or p_event_name not in (
       'assessment_completed',
       'report_viewed',
       'signup_started',
       'signup_created'
     ) then
    return;
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object'
     or pg_column_size(p_metadata) > 2048 then
    p_metadata := '{}'::jsonb;
  end if;

  insert into public.analytics_events (event_name, business_id, user_id, path, metadata)
  values (p_event_name, null, auth.uid(), left(p_path, 200), p_metadata);
end;
$$;

revoke all on function public.track_public_event(text, text, jsonb) from public;
grant execute on function public.track_public_event(text, text, jsonb) to anon, authenticated;
