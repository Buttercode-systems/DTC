-- Soft launch readiness layer: feedback, lightweight analytics, and admin metrics.
-- Keeps the existing app security model: no service-role key required by Next.js.

create table if not exists public.soft_launch_feedback (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid default auth.uid(),
  page text,
  kind text not null default 'general' check (kind in ('general', 'bug', 'confusing', 'idea', 'would_pay', 'would_not_pay')),
  rating integer check (rating between 1 and 5),
  message text not null check (length(message) between 3 and 2000),
  email text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.soft_launch_feedback enable row level security;

drop policy if exists soft_launch_feedback_insert_owner on public.soft_launch_feedback;
create policy soft_launch_feedback_insert_owner
on public.soft_launch_feedback
for insert
to authenticated
with check (
  exists (
    select 1
    from public.businesses b
    where b.id = soft_launch_feedback.business_id
      and b.owner_id = auth.uid()
  )
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists soft_launch_feedback_select_owner on public.soft_launch_feedback;
create policy soft_launch_feedback_select_owner
on public.soft_launch_feedback
for select
to authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = soft_launch_feedback.business_id
      and b.owner_id = auth.uid()
  )
);

create index if not exists soft_launch_feedback_business_created_idx
  on public.soft_launch_feedback (business_id, created_at desc);
create index if not exists soft_launch_feedback_status_created_idx
  on public.soft_launch_feedback (status, created_at desc);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (length(event_name) between 2 and 80),
  business_id uuid references public.businesses(id) on delete cascade,
  user_id uuid default auth.uid(),
  path text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

drop policy if exists analytics_events_public_insert on public.analytics_events;
create policy analytics_events_public_insert
on public.analytics_events
for insert
to anon, authenticated
with check (
  jsonb_typeof(metadata) = 'object'
  and (user_id is null or user_id = auth.uid())
  and (
    business_id is null
    or exists (
      select 1
      from public.businesses b
      where b.id = analytics_events.business_id
        and b.owner_id = auth.uid()
    )
  )
);

create index if not exists analytics_events_name_created_idx
  on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_business_created_idx
  on public.analytics_events (business_id, created_at desc);

create table if not exists public.soft_launch_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.soft_launch_admins enable row level security;

-- Seed the connected project owner's email so the founder can read the soft-launch dashboard.
-- Edit this table manually in Supabase if another admin email should be used.
insert into public.soft_launch_admins (email)
values ('ramatsienkoanyane07@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_soft_launch_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.soft_launch_admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_soft_launch_admin() from public;
grant execute on function public.is_soft_launch_admin() to authenticated;

create or replace function public.get_soft_launch_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_soft_launch_admin() then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'counts', jsonb_build_object(
      'assessments', (select count(*) from public.assessments),
      'assessment_leads', (select count(*) from public.assessment_leads),
      'businesses', (select count(*) from public.businesses),
      'leads', (select count(*) from public.leads),
      'quotes', (select count(*) from public.quotes),
      'invoices', (select count(*) from public.invoices),
      'actions_open', (select count(*) from public.actions where status = 'open'),
      'actions_done', (select count(*) from public.actions where status = 'done'),
      'feedback_open', (select count(*) from public.soft_launch_feedback where status = 'open'),
      'events_24h', (select count(*) from public.analytics_events where created_at >= now() - interval '24 hours')
    ),
    'funnel_7d', coalesce((
      select jsonb_object_agg(event_name, event_count)
      from (
        select event_name, count(*) as event_count
        from public.analytics_events
        where created_at >= now() - interval '7 days'
        group by event_name
        order by event_name
      ) e
    ), '{}'::jsonb),
    'recent_feedback', coalesce((
      select jsonb_agg(row_to_json(f))
      from (
        select
          sf.id,
          sf.created_at,
          sf.kind,
          sf.rating,
          sf.page,
          sf.message,
          sf.email,
          sf.status,
          b.name as business_name
        from public.soft_launch_feedback sf
        left join public.businesses b on b.id = sf.business_id
        order by sf.created_at desc
        limit 12
      ) f
    ), '[]'::jsonb),
    'recent_events', coalesce((
      select jsonb_agg(row_to_json(e))
      from (
        select
          ae.created_at,
          ae.event_name,
          ae.path,
          ae.metadata,
          b.name as business_name
        from public.analytics_events ae
        left join public.businesses b on b.id = ae.business_id
        order by ae.created_at desc
        limit 20
      ) e
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_soft_launch_dashboard() from public;
grant execute on function public.get_soft_launch_dashboard() to authenticated;
