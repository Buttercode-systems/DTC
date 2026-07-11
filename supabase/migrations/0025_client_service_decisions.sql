-- Manager-scoped client decisions for approvals and weekly service reports.

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
  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid approval decision';
  end if;

  select * into v_approval
  from public.service_approvals
  where id = p_approval_id
  for update;

  if v_approval.id is null then raise exception 'approval not found'; end if;
  if not public.can_manage_business(v_approval.business_id, v_uid) then
    raise exception 'manager access required';
  end if;
  if v_approval.status <> 'pending' then
    raise exception 'approval already decided';
  end if;

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
  if p_response not in ('continue', 'change', 'stop') then
    raise exception 'invalid report response';
  end if;

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

revoke all on function public.decide_client_service_approval(uuid, text, text) from public, anon;
revoke all on function public.respond_to_service_report(uuid, text, text) from public, anon;
grant execute on function public.decide_client_service_approval(uuid, text, text) to authenticated;
grant execute on function public.respond_to_service_report(uuid, text, text) to authenticated;
