-- Client-facing Service Desk for managed TAD engagements.
-- Owners and managers can review approvals, blockers, workflow progress and
-- weekly reports without receiving the full operator interface.

alter table public.service_reports
  add column if not exists client_viewed_at timestamptz,
  add column if not exists client_response text
    check (client_response is null or client_response in ('continue', 'change', 'stop')),
  add column if not exists client_response_note text,
  add column if not exists client_responded_by uuid references auth.users(id) on delete set null,
  add column if not exists client_responded_at timestamptz;

create index if not exists service_reports_client_response_idx
  on public.service_reports(business_id, client_response, period_end desc);

create or replace function public.get_client_service_desk(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_engagement public.service_engagements%rowtype;
  v_can_manage boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.can_access_business(p_business_id, v_uid) then
    raise exception 'business not accessible';
  end if;

  v_can_manage := public.can_manage_business(p_business_id, v_uid);

  select se.* into v_engagement
  from public.service_engagements se
  where se.business_id = p_business_id
  order by
    case se.status
      when 'active' then 1
      when 'pilot' then 2
      when 'onboarding' then 3
      when 'planned' then 4
      when 'paused' then 5
      else 6
    end,
    se.created_at desc
  limit 1;

  return jsonb_build_object(
    'can_manage', v_can_manage,
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
    'engagement', case
      when v_engagement.id is null then null
      else jsonb_build_object(
        'id', v_engagement.id,
        'department', v_engagement.department,
        'service_level', v_engagement.service_level,
        'status', v_engagement.status,
        'start_date', v_engagement.start_date,
        'next_review_date', v_engagement.next_review_date,
        'template_key', v_engagement.template_key
      )
    end,
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
        select count(*)
        from public.service_work_items wi
        join public.service_workflow_templates wt
          on wt.department = wi.department and wt.active
        where wi.business_id = p_business_id
          and wi.blocked_reason is not null
          and not exists (
            select 1
            from jsonb_array_elements_text(wt.config->'closed_statuses') closed(value)
            where closed.value = wi.status
          )
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
      select jsonb_agg(row_to_json(x) order by (x.status = 'pending') desc, x.due_date nulls last, x.created_at desc)
      from (
        select sa.id, sa.title, sa.detail, sa.amount, sa.status, sa.due_date,
               sa.decision_note, sa.decided_at, sa.created_at
        from public.service_approvals sa
        where sa.business_id = p_business_id
        order by sa.created_at desc
        limit 30
      ) x
    ), '[]'::jsonb),
    'workflow', case
      when v_engagement.id is null then null
      else (
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
                and wi.department = v_engagement.department
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
                and wi.department = v_engagement.department
                and not exists (
                  select 1
                  from jsonb_array_elements_text(wt.config->'closed_statuses') closed(value)
                  where closed.value = wi.status
                )
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
        from public.service_workflow_templates wt
        where wt.department = v_engagement.department and wt.active
        order by wt.version desc
        limit 1
      )
    end,
    'reports', coalesce((
      select jsonb_agg(row_to_json(r) order by r.period_end desc)
      from (
        select sr.id, sr.period_start, sr.period_end, sr.metrics, sr.summary,
               sr.status, sr.client_response, sr.client_response_note,
               sr.client_responded_at, sr.updated_at
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

create or replace function public.decide_client_service_approval(
  p_approval_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_approval public.service_approvals%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'invalid approval decision'; end if;

  select * into v_approval
  from public.service_approvals
  where id = p_approval_id
  for update;

  if v_approval.id is null then raise exception 'approval not found'; end if;
  if not public.can_manage_business(v_approval.business_id, v_uid) then
    raise exception 'manager access required';
  end if;
  if v_approval.status <> 'pending' then raise exception 'approval already decided'; end if;

  update public.service_approvals
  set status = p_decision,
      decision_note = nullif(trim(p_note), ''),
      decided_by = v_uid,
      decided_at = now()
  where id = v_approval.id
  returning * into v_approval;

  return jsonb_build_object(
    'id', v_approval.id,
    'business_id', v_approval.business_id,
    'status', v_approval.status,
    'decided_at', v_approval.decided_at
  );
end;
$$;

create or replace function public.respond_to_service_report(
  p_report_id uuid,
  p_response text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_report public.service_reports%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_response not in ('continue', 'change', 'stop') then raise exception 'invalid report response'; end if;

  select * into v_report
  from public.service_reports
  where id = p_report_id
  for update;

  if v_report.id is null then raise exception 'service report not found'; end if;
  if not public.can_manage_business(v_report.business_id, v_uid) then
    raise exception 'manager access required';
  end if;

  update public.service_reports
  set client_viewed_at = coalesce(client_viewed_at, now()),
      client_response = p_response,
      client_response_note = nullif(trim(p_note), ''),
      client_responded_by = v_uid,
      client_responded_at = now(),
      updated_at = now()
  where id = v_report.id
  returning * into v_report;

  return jsonb_build_object(
    'id', v_report.id,
    'business_id', v_report.business_id,
    'response', v_report.client_response,
    'responded_at', v_report.client_responded_at
  );
end;
$$;

create or replace function public.get_tad_client_responses()
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then
    raise exception 'operator access required';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.client_responded_at desc)
    from (
      select sr.id, sr.business_id, b.name as business_name,
             sr.period_start, sr.period_end, sr.client_response,
             sr.client_response_note, sr.client_responded_at
      from public.service_reports sr
      join public.businesses b on b.id = sr.business_id
      where b.managed_by_tad and sr.client_response is not null
      order by sr.client_responded_at desc
      limit 30
    ) x
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_client_service_desk(uuid) from public, anon;
revoke all on function public.decide_client_service_approval(uuid, text, text) from public, anon;
revoke all on function public.respond_to_service_report(uuid, text, text) from public, anon;
revoke all on function public.get_tad_client_responses() from public, anon;
grant execute on function public.get_client_service_desk(uuid) to authenticated;
grant execute on function public.decide_client_service_approval(uuid, text, text) to authenticated;
grant execute on function public.respond_to_service_report(uuid, text, text) to authenticated;
grant execute on function public.get_tad_client_responses() to authenticated;
