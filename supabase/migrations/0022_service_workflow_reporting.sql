create or replace function public.generate_weekly_service_report(
  p_business_id uuid,
  p_period_start date,
  p_period_end date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid:=auth.uid();
  v_metrics jsonb;
  v_summary text;
  v_report public.service_reports%rowtype;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then
    raise exception 'operator access required';
  end if;
  if not public.can_access_business(p_business_id,v_uid) then
    raise exception 'business not accessible';
  end if;
  if p_period_end<p_period_start then raise exception 'invalid reporting period'; end if;

  select jsonb_build_object(
    'actions_completed',(
      select count(*) from public.actions
      where business_id=p_business_id
        and status='done'
        and completed_at::date between p_period_start and p_period_end
    ),
    'actions_due_now',(
      select count(*) from public.actions
      where business_id=p_business_id
        and status='open'
        and due_date<=p_period_end
    ),
    'new_leads',(
      select count(*) from public.leads
      where business_id=p_business_id
        and received_at::date between p_period_start and p_period_end
    ),
    'open_quotes',(
      select count(*) from public.quotes
      where business_id=p_business_id and status='sent'
    ),
    'open_quote_value',(
      select coalesce(sum(amount),0) from public.quotes
      where business_id=p_business_id and status='sent'
    ),
    'overdue_invoices',(
      select count(*) from public.invoices
      where business_id=p_business_id
        and kind='customer'
        and status='sent'
        and due_date<p_period_end
    ),
    'overdue_value',(
      select coalesce(sum(amount),0) from public.invoices
      where business_id=p_business_id
        and kind='customer'
        and status='sent'
        and due_date<p_period_end
    ),
    'pending_approvals',(
      select count(*) from public.service_approvals
      where business_id=p_business_id and status='pending'
    ),
    'workflow_open',(
      select count(*)
      from public.service_work_items wi
      join public.service_workflow_templates wt on wt.department=wi.department and wt.active
      where wi.business_id=p_business_id
        and not exists(
          select 1 from jsonb_array_elements_text(wt.config->'closed_statuses') closed(value)
          where closed.value=wi.status
        )
    ),
    'workflow_blocked',(
      select count(*) from public.service_work_items
      where business_id=p_business_id and blocked_reason is not null
    ),
    'workflow_overdue',(
      select count(*)
      from public.service_work_items wi
      join public.service_workflow_templates wt on wt.department=wi.department and wt.active
      where wi.business_id=p_business_id
        and wi.due_date<p_period_end
        and not exists(
          select 1 from jsonb_array_elements_text(wt.config->'closed_statuses') closed(value)
          where closed.value=wi.status
        )
    ),
    'workflow_completed',(
      select count(*) from public.service_work_items
      where business_id=p_business_id
        and completed_at::date between p_period_start and p_period_end
    )
  ) into v_metrics;

  v_summary:=format(
    '%s actions completed; %s still due; %s workflow records completed; %s open; %s blocked; %s overdue; %s approvals waiting.',
    v_metrics->>'actions_completed',
    v_metrics->>'actions_due_now',
    v_metrics->>'workflow_completed',
    v_metrics->>'workflow_open',
    v_metrics->>'workflow_blocked',
    v_metrics->>'workflow_overdue',
    v_metrics->>'pending_approvals'
  );

  insert into public.service_reports(
    business_id,period_start,period_end,metrics,summary,status,created_by,updated_at
  ) values(
    p_business_id,p_period_start,p_period_end,v_metrics,v_summary,'ready',v_uid,now()
  )
  on conflict(business_id,period_start,period_end) do update
    set metrics=excluded.metrics,
        summary=excluded.summary,
        status='ready',
        created_by=v_uid,
        updated_at=now()
  returning * into v_report;

  return jsonb_build_object(
    'id',v_report.id,
    'business_id',v_report.business_id,
    'period_start',v_report.period_start,
    'period_end',v_report.period_end,
    'metrics',v_report.metrics,
    'summary',v_report.summary,
    'status',v_report.status
  );
end;
$$;

revoke all on function public.generate_weekly_service_report(uuid,date,date) from public,anon;
grant execute on function public.generate_weekly_service_report(uuid,date,date) to authenticated;
