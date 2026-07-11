-- Business-scoped read model for the managed client Service Desk.

create or replace function public.get_client_service_desk(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.can_access_business(p_business_id, v_uid) then
    raise exception 'business not accessible';
  end if;

  return jsonb_build_object(
    'business', (
      select jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'industry', b.industry,
        'managed_by_tad', b.managed_by_tad,
        'service_status', b.service_status,
        'primary_contact_name', b.primary_contact_name,
        'primary_contact_email', b.primary_contact_email
      )
      from public.businesses b
      where b.id = p_business_id
    ),
    'engagement', (
      select jsonb_build_object(
        'id', se.id,
        'department', se.department,
        'service_level', se.service_level,
        'status', se.status,
        'start_date', se.start_date,
        'next_review_date', se.next_review_date,
        'template_key', se.template_key
      )
      from public.service_engagements se
      where se.business_id = p_business_id
      order by
        case se.status
          when 'active' then 1
          when 'pilot' then 2
          when 'onboarding' then 3
          when 'planned' then 4
          else 5
        end,
        se.created_at desc
      limit 1
    ),
    'summary', jsonb_build_object(
      'pending_approvals', (
        select count(*) from public.service_approvals
        where business_id = p_business_id and status = 'pending'
      ),
      'open_workflow_records', (
        select count(*)
        from public.service_work_items wi
        join public.service_workflow_templates wt
          on wt.department = wi.department and wt.active
        where wi.business_id = p_business_id
          and not exists (
            select 1
            from jsonb_array_elements_text(wt.config->'closed_statuses') closed(value)
            where closed.value = wi.status
          )
      ),
      'blocked_workflow_records', (
        select count(*) from public.service_work_items
        where business_id = p_business_id
          and blocked_reason is not null
          and completed_at is null
      ),
      'overdue_workflow_records', (
        select count(*)
        from public.service_work_items wi
        join public.service_workflow_templates wt
          on wt.department = wi.department and wt.active
        where wi.business_id = p_business_id
          and wi.due_date < current_date
          and not exists (
            select 1
            from jsonb_array_elements_text(wt.config->'closed_statuses') closed(value)
            where closed.value = wi.status
          )
      ),
      'actions_due', (
        select count(*) from public.actions
        where business_id = p_business_id
          and status = 'open'
          and due_date <= current_date
      ),
      'reports_ready', (
        select count(*) from public.service_reports
        where business_id = p_business_id and status in ('ready', 'sent')
      )
    ),
    'approvals', coalesce((
      select jsonb_agg(row_to_json(x) order by x.status = 'pending' desc, x.due_date nulls last, x.created_at desc)
      from (
        select sa.id, sa.title, sa.detail, sa.amount, sa.status, sa.due_date,
               sa.decision_note, sa.decided_at, sa.created_at
        from public.service_approvals sa
        where sa.business_id = p_business_id
        order by sa.created_at desc
        limit 30
      ) x
    ), '[]'::jsonb),
    'workflow', (
      select jsonb_build_object(
        'template_name', wt.name,
        'department', wt.department,
        'statuses', wt.config->'statuses',
        'closed_statuses', wt.config->'closed_statuses',
        'data_warning', wt.config->>'data_warning',
        'status_counts', coalesce((
          select jsonb_object_agg(status, total)
          from (
            select wi.status, count(*) as total
            from public.service_work_items wi
            where wi.business_id = p_business_id
              and wi.department = se.department
            group by wi.status
          ) counts
        ), '{}'::jsonb),
        'attention_items', coalesce((
          select jsonb_agg(row_to_json(attention) order by attention.priority desc, attention.due_date nulls last)
          from (
            select wi.id, wi.reference, wi.title, wi.status, wi.assigned_name,
                   wi.priority, wi.next_action, wi.due_date, wi.blocked_reason,
                   wi.last_outcome_code, wi.updated_at
            from public.service_work_items wi
            where wi.business_id = p_business_id
              and wi.department = se.department
              and (
                wi.blocked_reason is not null
                or wi.due_date <= current_date
                or wi.assigned_name is null
                or wi.next_action is null
              )
            order by wi.priority desc, wi.due_date nulls last
            limit 40
          ) attention
        ), '[]'::jsonb)
      )
      from public.service_engagements se
      join public.service_workflow_templates wt
        on wt.department = se.department and wt.active
      where se.business_id = p_business_id
      order by se.created_at desc
      limit 1
    ),
    'reports', coalesce((
      select jsonb_agg(row_to_json(r) order by r.period_end desc)
      from (
        select sr.id, sr.period_start, sr.period_end, sr.metrics, sr.summary,
               sr.status, sr.client_viewed_at, sr.client_response,
               sr.client_response_note, sr.client_responded_at, sr.updated_at
        from public.service_reports sr
        where sr.business_id = p_business_id
          and sr.status in ('ready', 'sent')
        order by sr.period_end desc
        limit 12
      ) r
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_client_service_desk(uuid) from public, anon;
grant execute on function public.get_client_service_desk(uuid) to authenticated;
