-- Follow-up hardening for the TAD service-delivery foundation.
-- RLS helper functions need authenticated EXECUTE privileges because policies
-- invoke them as the signed-in role. Table privileges remain constrained by RLS.

grant execute on function public.is_tad_operator(uuid) to authenticated;
grant execute on function public.can_access_business(uuid, uuid) to authenticated;
revoke all on function public.is_tad_operator(uuid) from anon;
revoke all on function public.can_access_business(uuid, uuid) from anon;

grant select on public.platform_operators to authenticated;
grant select, insert, update, delete on public.business_memberships to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.service_engagements to authenticated;
grant select, insert, update, delete on public.service_approvals to authenticated;
grant select, insert, update, delete on public.service_reports to authenticated;

create or replace function public.get_tad_ops_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then raise exception 'operator access required'; end if;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'clients', (
        select count(*) from public.businesses b
        where b.managed_by_tad and b.service_status <> 'closed'
      ),
      'due_actions', (
        select count(*)
        from public.actions a
        join public.businesses b on b.id = a.business_id
        where b.managed_by_tad and b.service_status <> 'closed'
          and a.status = 'open' and a.due_date <= current_date
      ),
      'pending_approvals', (
        select count(*)
        from public.service_approvals sa
        join public.businesses b on b.id = sa.business_id
        where b.managed_by_tad and b.service_status <> 'closed'
          and sa.status = 'pending'
      ),
      'reports_due', (
        select count(*)
        from public.service_engagements se
        join public.businesses b on b.id = se.business_id
        where b.managed_by_tad and b.service_status <> 'closed'
          and se.status in ('pilot', 'active')
          and se.next_review_date <= current_date
      )
    ),
    'clients', coalesce((
      select jsonb_agg(row_to_json(x) order by x.name)
      from (
        select b.id, b.name, b.industry, b.primary_contact_name,
               b.primary_contact_email, b.service_status, b.managed_by_tad,
               se.id as engagement_id, se.department, se.service_level,
               se.status as engagement_status, se.next_review_date,
               (select count(*) from public.actions a where a.business_id = b.id and a.status = 'open' and a.due_date <= current_date) as due_actions,
               (select count(*) from public.service_approvals sa where sa.business_id = b.id and sa.status = 'pending') as pending_approvals
        from public.businesses b
        left join lateral (
          select * from public.service_engagements e
          where e.business_id = b.id
          order by e.created_at desc limit 1
        ) se on true
        where b.managed_by_tad and b.service_status <> 'closed'
      ) x
    ), '[]'::jsonb),
    'actions', coalesce((
      select jsonb_agg(row_to_json(x) order by x.priority desc, x.due_date, x.business_name)
      from (
        select a.id, a.business_id, b.name as business_name, a.kind, a.title,
               a.detail, a.priority, a.due_date, a.assigned_to, a.source
        from public.actions a
        join public.businesses b on b.id = a.business_id
        where b.managed_by_tad and b.service_status <> 'closed'
          and a.status = 'open' and a.due_date <= current_date
        order by a.priority desc, a.due_date asc
        limit 100
      ) x
    ), '[]'::jsonb),
    'approvals', coalesce((
      select jsonb_agg(row_to_json(x) order by x.due_date nulls last, x.created_at)
      from (
        select sa.id, sa.business_id, b.name as business_name, sa.title,
               sa.detail, sa.amount, sa.status, sa.due_date, sa.created_at
        from public.service_approvals sa
        join public.businesses b on b.id = sa.business_id
        where b.managed_by_tad and b.service_status <> 'closed'
          and sa.status = 'pending'
        order by sa.due_date nulls last, sa.created_at
        limit 100
      ) x
    ), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(row_to_json(x) order by x.period_end desc)
      from (
        select sr.id, sr.business_id, b.name as business_name, sr.period_start,
               sr.period_end, sr.status, sr.metrics, sr.summary, sr.updated_at
        from public.service_reports sr
        join public.businesses b on b.id = sr.business_id
        where b.managed_by_tad and b.service_status <> 'closed'
        order by sr.period_end desc
        limit 30
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_tad_ops_dashboard() from public;
revoke all on function public.get_tad_ops_dashboard() from anon;
grant execute on function public.get_tad_ops_dashboard() to authenticated;
