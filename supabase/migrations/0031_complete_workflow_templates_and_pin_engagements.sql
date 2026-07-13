-- Complete the six paid TAD workflow templates and pin every new engagement
-- to the active template version used at onboarding time.

insert into public.service_workflow_templates(key, department, name, version, config, active)
values
(
  'property-admin-v1','property','Property Admin',1,
  jsonb_build_object(
    'statuses',jsonb_build_array('New Request','Needs Triage','Waiting for Owner Approval','Supplier Quote Needed','Waiting for Supplier','Scheduled','In Progress','Completion Proof Needed','Completed','Cancelled'),
    'closed_statuses',jsonb_build_array('Completed','Cancelled'),
    'fields',jsonb_build_array(
      jsonb_build_object('key','property_unit','type','text','label','Property / unit','required',true),
      jsonb_build_object('key','request_type','type','text','label','Request type','required',true),
      jsonb_build_object('key','urgency','type','select','label','Urgency','options',jsonb_build_array('Low','Normal','High','Emergency')),
      jsonb_build_object('key','owner_approval','type','select','label','Owner approval','options',jsonb_build_array('Not required','Pending','Approved','Rejected')),
      jsonb_build_object('key','supplier','type','text','label','Supplier'),
      jsonb_build_object('key','completion_evidence','type','url','label','Completion evidence')
    )
  ),true
),
(
  'practice-admin-v1','practice','Practice / Booking Admin',1,
  jsonb_build_object(
    'statuses',jsonb_build_array('New Booking','Needs Confirmation','Confirmed','Reschedule Requested','Waiting for Client','Front Desk Follow-up','Completed','No-show Follow-up','Cancelled'),
    'closed_statuses',jsonb_build_array('Completed','Cancelled'),
    'data_warning','Use this workflow only for non-clinical booking and front-desk administration. Do not record diagnoses, clinical notes, identity numbers or unnecessary health information.',
    'fields',jsonb_build_array(
      jsonb_build_object('key','booking_reference','type','text','label','Booking reference','required',true),
      jsonb_build_object('key','service_type','type','text','label','Service / appointment type'),
      jsonb_build_object('key','appointment_date','type','date','label','Appointment date'),
      jsonb_build_object('key','confirmation_status','type','select','label','Confirmation','options',jsonb_build_array('Pending','Confirmed','Reschedule requested','Cancelled')),
      jsonb_build_object('key','front_desk_owner','type','text','label','Front-desk owner'),
      jsonb_build_object('key','administrative_note','type','text','label','Administrative note')
    )
  ),true
),
(
  'member-admin-v1','member','Member Admin',1,
  jsonb_build_object(
    'statuses',jsonb_build_array('New Member','Onboarding','Active','Attendance Risk','Payment Follow-up','Churn Risk','Reactivation Due','Reactivated','Inactive','Cancelled'),
    'closed_statuses',jsonb_build_array('Inactive','Cancelled'),
    'fields',jsonb_build_array(
      jsonb_build_object('key','member_reference','type','text','label','Member reference','required',true),
      jsonb_build_object('key','onboarding_status','type','select','label','Onboarding','options',jsonb_build_array('Not started','In progress','Complete')),
      jsonb_build_object('key','attendance_risk','type','select','label','Attendance risk','options',jsonb_build_array('None','Watch','At risk')),
      jsonb_build_object('key','payment_status','type','select','label','Payment status','options',jsonb_build_array('Current','Follow-up due','Arrangement','Not applicable')),
      jsonb_build_object('key','reactivation_status','type','select','label','Reactivation','options',jsonb_build_array('Not required','Eligible','Contacted','Reactivated','Declined')),
      jsonb_build_object('key','last_contact_date','type','date','label','Last contact date')
    )
  ),true
)
on conflict (key) do update
set department=excluded.department,name=excluded.name,version=excluded.version,
    config=excluded.config,active=excluded.active,updated_at=now();

update public.service_engagements e
set template_key=(
      select swt.key
      from public.service_workflow_templates swt
      where swt.department=e.department and swt.active
      order by swt.version desc
      limit 1
    ),
    updated_at=now()
where e.template_key is null
  and exists (
    select 1 from public.service_workflow_templates swt
    where swt.department=e.department and swt.active
  );

create or replace function public.create_managed_business(
  p_name text,p_industry text,p_contact_name text,p_contact_email text,
  p_department text,p_service_level text default 'setup'
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_business public.businesses%rowtype;
  v_engagement public.service_engagements%rowtype;
  v_template_key text;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then raise exception 'operator_access_required'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'business_name_required'; end if;
  if p_department not in ('invoice','sales','client','property','practice','member','core') then raise exception 'invalid_department'; end if;
  if p_service_level not in ('audit','setup','managed','support') then raise exception 'invalid_service_level'; end if;

  select key into v_template_key
  from public.service_workflow_templates
  where department=p_department and active
  order by version desc
  limit 1;

  if p_department<>'core' and v_template_key is null then raise exception 'workflow_template_not_found'; end if;

  insert into public.businesses(owner_id,name,industry,managed_by_tad,primary_contact_name,primary_contact_email,service_status)
  values(v_uid,left(trim(p_name),200),nullif(trim(p_industry),''),true,nullif(trim(p_contact_name),''),nullif(trim(p_contact_email),''),'pilot')
  returning * into v_business;

  insert into public.business_memberships(business_id,user_id,role,active)
  values(v_business.id,v_uid,'operator',true)
  on conflict(business_id,user_id) do update set role='operator',active=true;

  insert into public.service_engagements(business_id,department,service_level,status,assigned_operator,start_date,next_review_date,template_key)
  values(v_business.id,p_department,p_service_level,'onboarding',v_uid,current_date,current_date+7,v_template_key)
  returning * into v_engagement;

  insert into public.actions(business_id,key,kind,title,detail,priority,due_date,status,assigned_to,source)
  values(v_business.id,'service_setup:'||v_engagement.id::text,'service_setup','Map the current '||p_department||' workflow — '||v_business.name,'Confirm capture points, owners, due dates, approval gates, baseline measures and the first 14-day pilot.',95,current_date,'open',v_uid,'tad_service');

  perform public.set_active_business(v_business.id);
  return jsonb_build_object('business_id',v_business.id,'engagement_id',v_engagement.id,'name',v_business.name,'department',v_engagement.department,'template_key',v_engagement.template_key,'status',v_engagement.status);
end;
$$;

revoke all on function public.create_managed_business(text,text,text,text,text,text) from public,anon;
grant execute on function public.create_managed_business(text,text,text,text,text,text) to authenticated;
