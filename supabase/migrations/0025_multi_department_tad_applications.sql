-- Expand the TAD application pipeline from Sales Admin to every managed department.
-- Keeps the original Sales submission RPC for backwards compatibility while
-- introducing a department-aware public RPC and department-aware onboarding.

alter table public.tad_applications
  add column if not exists department text not null default 'sales';

alter table public.tad_applications
  drop constraint if exists tad_applications_department_check;
alter table public.tad_applications
  add constraint tad_applications_department_check
  check (department in ('invoice', 'sales', 'client', 'property', 'practice', 'member'));

alter table public.tad_applications
  drop constraint if exists tad_applications_follow_up_problem_check;
alter table public.tad_applications
  add constraint tad_applications_workflow_problem_check
  check (follow_up_problem in (
    'missed', 'ownership', 'next_action', 'visibility', 'reporting',
    'missing_information', 'approval_delay', 'duplicates', 'filing',
    'missing_documents', 'onboarding_delay', 'handover',
    'lost_requests', 'supplier_delay', 'scheduling', 'completion_proof',
    'booking_gaps', 'confirmation_gaps', 'no_show_followup',
    'attendance_risk', 'payment_followup', 'churn_risk', 'reactivation',
    'none'
  ));

create index if not exists tad_applications_department_status_idx
  on public.tad_applications(department, status, submitted_at desc);

create or replace function public.submit_tad_department_application(
  p_department text,
  p_business_name text,
  p_contact_name text,
  p_email text,
  p_active_records integer,
  p_workflow_problem text,
  p_current_tools text,
  p_required_outcome text,
  p_owner_available boolean,
  p_data_authority boolean,
  p_boundary_accepted boolean,
  p_request_fingerprint text,
  p_source text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.tad_applications%rowtype;
  v_application public.tad_applications%rowtype;
  v_score integer := 0;
  v_ready boolean := false;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if p_department not in ('invoice', 'sales', 'client', 'property', 'practice', 'member') then
    raise exception 'invalid_department';
  end if;
  if nullif(trim(coalesce(p_business_name, '')), '') is null then raise exception 'business_name_required'; end if;
  if nullif(trim(coalesce(p_contact_name, '')), '') is null then raise exception 'contact_name_required'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'valid_email_required'; end if;
  if p_active_records is null or p_active_records < 0 or p_active_records > 10000 then raise exception 'invalid_active_records'; end if;
  if p_workflow_problem not in (
    'missed', 'ownership', 'next_action', 'visibility', 'reporting',
    'missing_information', 'approval_delay', 'duplicates', 'filing',
    'missing_documents', 'onboarding_delay', 'handover',
    'lost_requests', 'supplier_delay', 'scheduling', 'completion_proof',
    'booking_gaps', 'confirmation_gaps', 'no_show_followup',
    'attendance_risk', 'payment_followup', 'churn_risk', 'reactivation',
    'none'
  ) then raise exception 'invalid_workflow_problem'; end if;
  if char_length(trim(coalesce(p_required_outcome, ''))) < 5 then raise exception 'required_outcome_required'; end if;
  if not coalesce(p_owner_available, false) then raise exception 'owner_availability_required'; end if;
  if not coalesce(p_data_authority, false) then raise exception 'data_authority_required'; end if;
  if not coalesce(p_boundary_accepted, false) then raise exception 'boundary_acceptance_required'; end if;
  if char_length(trim(coalesce(p_request_fingerprint, ''))) < 32 then raise exception 'request_fingerprint_required'; end if;

  if (
    select count(*) from public.tad_applications
    where request_fingerprint = trim(p_request_fingerprint)
      and submitted_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'rate_limit_exceeded';
  end if;

  select * into v_existing
  from public.tad_applications
  where lower(email) = v_email
    and department = p_department
    and submitted_at > now() - interval '24 hours'
  order by submitted_at desc
  limit 1;

  if v_existing.id is not null then
    return jsonb_build_object(
      'id', v_existing.id,
      'department', v_existing.department,
      'duplicate', true,
      'status', v_existing.status,
      'readiness_ready', v_existing.readiness_ready
    );
  end if;

  if p_active_records between 10 and 100 then
    v_score := v_score + 3;
  elsif p_active_records > 100 then
    v_score := v_score + 2;
  end if;
  if p_workflow_problem <> 'none' then v_score := v_score + 2; end if;
  if p_owner_available then v_score := v_score + 2; end if;
  if p_data_authority then v_score := v_score + 2; end if;
  if p_boundary_accepted then v_score := v_score + 1; end if;

  v_ready := v_score >= 8
    and p_active_records >= 10
    and p_workflow_problem <> 'none'
    and p_owner_available
    and p_data_authority
    and p_boundary_accepted;

  insert into public.tad_applications(
    department, business_name, contact_name, email, active_records, follow_up_problem,
    current_tools, required_outcome, owner_available, data_authority,
    boundary_accepted, readiness_score, readiness_ready, source,
    request_fingerprint
  ) values (
    p_department, left(trim(p_business_name), 160), left(trim(p_contact_name), 160), v_email,
    p_active_records, p_workflow_problem, nullif(left(trim(coalesce(p_current_tools, '')), 300), ''),
    left(trim(p_required_outcome), 700), p_owner_available, p_data_authority,
    p_boundary_accepted, v_score, v_ready,
    coalesce(nullif(left(trim(coalesce(p_source, '')), 80), ''), p_department || '_admin_offer'),
    left(trim(p_request_fingerprint), 128)
  ) returning * into v_application;

  insert into public.tad_application_events(
    application_id, event_type, to_status, detail
  ) values (
    v_application.id, 'submitted', 'new',
    format('%s Admin readiness %s/10; ready=%s', initcap(v_application.department), v_application.readiness_score, v_application.readiness_ready)
  );

  return jsonb_build_object(
    'id', v_application.id,
    'department', v_application.department,
    'duplicate', false,
    'status', v_application.status,
    'readiness_ready', v_application.readiness_ready
  );
end;
$$;

revoke all on function public.submit_tad_department_application(
  text, text, text, text, integer, text, text, text, boolean, boolean, boolean, text, text
) from public;
grant execute on function public.submit_tad_department_application(
  text, text, text, text, integer, text, text, text, boolean, boolean, boolean, text, text
) to anon, authenticated;

create or replace function public.list_tad_applications()
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.uid() is null or not public.is_tad_operator(auth.uid()) then
    raise exception 'operator_access_required';
  end if;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'new', (select count(*) from public.tad_applications where status = 'new'),
      'reviewing', (select count(*) from public.tad_applications where status = 'reviewing'),
      'qualified', (select count(*) from public.tad_applications where status = 'qualified'),
      'onboarding', (select count(*) from public.tad_applications where status = 'onboarding'),
      'converted', (select count(*) from public.tad_applications where status = 'converted')
    ),
    'applications', coalesce((
      select jsonb_agg(row_to_json(x) order by x.submitted_at desc)
      from (
        select a.id, a.department, a.business_name, a.contact_name, a.email, a.active_records,
               a.follow_up_problem, a.current_tools, a.required_outcome,
               a.owner_available, a.data_authority, a.boundary_accepted,
               a.readiness_score, a.readiness_ready, a.status,
               a.qualification_notes, a.commercial_decision,
               a.managed_business_id, a.source, a.submitted_at, a.updated_at,
               b.name as managed_business_name
        from public.tad_applications a
        left join public.businesses b on b.id = a.managed_business_id
        order by a.submitted_at desc
        limit 250
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.start_tad_application_onboarding(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_application public.tad_applications%rowtype;
  v_workspace jsonb;
  v_business_id uuid;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then raise exception 'operator_access_required'; end if;

  select * into v_application
  from public.tad_applications
  where id = p_application_id
  for update;

  if v_application.id is null then raise exception 'application_not_found'; end if;
  if v_application.status not in ('qualified', 'onboarding') then raise exception 'application_must_be_qualified'; end if;

  if v_application.managed_business_id is null then
    v_workspace := public.create_managed_business(
      v_application.business_name,
      'Service business',
      v_application.contact_name,
      v_application.email,
      v_application.department,
      'setup'
    );
    v_business_id := (v_workspace->>'business_id')::uuid;

    update public.tad_applications
    set managed_business_id = v_business_id,
        status = 'onboarding',
        commercial_decision = case
          when commercial_decision = 'pending' then 'accepted'
          else commercial_decision
        end
    where id = v_application.id;

    insert into public.tad_application_events(
      application_id, actor_id, event_type, from_status, to_status, detail
    ) values (
      v_application.id, v_uid, 'onboarding_started',
      v_application.status, 'onboarding',
      format('Created managed %s Admin workspace %s', v_application.department, v_business_id)
    );
  else
    v_business_id := v_application.managed_business_id;
  end if;

  return jsonb_build_object(
    'application_id', v_application.id,
    'business_id', v_business_id,
    'department', v_application.department,
    'status', 'onboarding'
  );
end;
$$;

revoke all on function public.list_tad_applications() from public, anon;
revoke all on function public.start_tad_application_onboarding(uuid) from public, anon;
grant execute on function public.list_tad_applications() to authenticated;
grant execute on function public.start_tad_application_onboarding(uuid) to authenticated;
