-- Versioned workflow definitions used by the shared TAD workflow engine.

insert into public.service_workflow_templates(key,department,name,version,config)
values
('invoice-admin-v1','invoice','Invoice Admin',1,
 jsonb_build_object(
  'statuses',jsonb_build_array('New','Needs Capture','Missing Info','Possible Duplicate','Ready for Review','Waiting for Approval','Approved','Paid','Filed','Rejected'),
  'closed_statuses',jsonb_build_array('Paid','Filed','Rejected'),
  'fields',jsonb_build_array(
   jsonb_build_object('key','supplier_name','label','Supplier','type','text','required',true),
   jsonb_build_object('key','document_type','label','Document type','type','select','options',jsonb_build_array('Invoice','Receipt','Proof of Payment','Statement')),
   jsonb_build_object('key','invoice_number','label','Reference','type','text'),
   jsonb_build_object('key','amount','label','Amount','type','number'),
   jsonb_build_object('key','approval_owner','label','Approver','type','text'),
   jsonb_build_object('key','document_link','label','Document link','type','url')
  )
 )),
('sales-admin-v1','sales','Sales Admin',1,
 jsonb_build_object(
  'statuses',jsonb_build_array('New','Needs Response','Contacted','Waiting for Client','Quote Needed','Quote Sent','Follow-up Due','Won','Lost','Cold','Closed'),
  'closed_statuses',jsonb_build_array('Won','Lost','Cold','Closed'),
  'fields',jsonb_build_array(
   jsonb_build_object('key','contact_name','label','Contact','type','text','required',true),
   jsonb_build_object('key','source','label','Source','type','text'),
   jsonb_build_object('key','service_needed','label','Service needed','type','text','required',true),
   jsonb_build_object('key','urgency','label','Urgency','type','select','options',jsonb_build_array('Low','Normal','High')),
   jsonb_build_object('key','quote_amount','label','Quote amount','type','number'),
   jsonb_build_object('key','outcome_reason','label','Outcome reason','type','text')
  )
 )),
('client-admin-v1','client','Client Admin',1,
 jsonb_build_object(
  'statuses',jsonb_build_array('New Client','Welcome Sent','Documents Requested','Waiting for Client','Internal Setup','Payment/Agreement Pending','Ready to Start','Active','Stuck','Cancelled'),
  'closed_statuses',jsonb_build_array('Active','Cancelled'),
  'fields',jsonb_build_array(
   jsonb_build_object('key','client_name','label','Client','type','text','required',true),
   jsonb_build_object('key','service_package','label','Package','type','text'),
   jsonb_build_object('key','documents_received','label','Documents received','type','select','options',jsonb_build_array('No','Partial','Yes')),
   jsonb_build_object('key','missing_documents','label','Missing documents','type','text'),
   jsonb_build_object('key','agreement_status','label','Agreement','type','select','options',jsonb_build_array('Pending','Sent','Signed','Not applicable')),
   jsonb_build_object('key','payment_status','label','Payment','type','select','options',jsonb_build_array('Pending','Unpaid','Paid','Not applicable'))
  )
 )),
('property-admin-v1','property','Property Admin',1,
 jsonb_build_object(
  'statuses',jsonb_build_array('New Request','Tenant Contacted','Quote Needed','Quote Sent','Owner Approval','Approved','Scheduled','In Progress','Completed','Closed','Blocked','Cancelled'),
  'closed_statuses',jsonb_build_array('Completed','Closed','Cancelled'),
  'fields',jsonb_build_array(
   jsonb_build_object('key','property_name','label','Property','type','text','required',true),
   jsonb_build_object('key','unit','label','Unit','type','text','required',true),
   jsonb_build_object('key','request_type','label','Request type','type','text','required',true),
   jsonb_build_object('key','urgency','label','Urgency','type','select','options',jsonb_build_array('Low','Normal','High','Emergency')),
   jsonb_build_object('key','supplier','label','Supplier','type','text'),
   jsonb_build_object('key','proof_link','label','Completion proof','type','url')
  )
 )),
('practice-admin-v1','practice','Practice / Booking Admin',1,
 jsonb_build_object(
  'statuses',jsonb_build_array('New Booking','Needs Confirmation','Confirmed','Documents Needed','Payment Pending','Ready for Appointment','Completed','No-show','Cancelled','Follow-up Due'),
  'closed_statuses',jsonb_build_array('Completed','Cancelled'),
  'data_warning','Use a protected client reference only. Do not enter clinical details, identity numbers or health information.',
  'fields',jsonb_build_array(
   jsonb_build_object('key','client_reference','label','Protected client reference','type','text','required',true),
   jsonb_build_object('key','service','label','Service','type','text','required',true),
   jsonb_build_object('key','appointment_date','label','Appointment date','type','date'),
   jsonb_build_object('key','confirmation_sent','label','Confirmation sent','type','select','options',jsonb_build_array('No','Yes')),
   jsonb_build_object('key','payment_status','label','Payment','type','select','options',jsonb_build_array('Pending','Unpaid','Paid','Not applicable')),
   jsonb_build_object('key','no_show_risk','label','No-show risk','type','select','options',jsonb_build_array('Low','Normal','High'))
  )
 )),
('member-admin-v1','member','Member Admin',1,
 jsonb_build_object(
  'statuses',jsonb_build_array('New Member','Onboarding','Active','Attendance Risk','Payment Due','Follow-up Due','Reactivation','Retained','Cancelled','Dormant'),
  'closed_statuses',jsonb_build_array('Retained','Cancelled','Dormant'),
  'fields',jsonb_build_array(
   jsonb_build_object('key','member_name','label','Member','type','text','required',true),
   jsonb_build_object('key','plan','label','Plan','type','text'),
   jsonb_build_object('key','payment_status','label','Payment','type','select','options',jsonb_build_array('Pending','Unpaid','Paid','Not applicable')),
   jsonb_build_object('key','last_attendance_date','label','Last attendance','type','date'),
   jsonb_build_object('key','risk_level','label','Risk level','type','select','options',jsonb_build_array('Low','Normal','High')),
   jsonb_build_object('key','outcome_reason','label','Outcome reason','type','text')
  )
 )),
('core-admin-v1','core','DueToday Core',1,
 jsonb_build_object(
  'statuses',jsonb_build_array('New','Assigned','In Progress','Waiting','Blocked','Ready for Review','Completed','Cancelled'),
  'closed_statuses',jsonb_build_array('Completed','Cancelled'),
  'fields',jsonb_build_array(
   jsonb_build_object('key','work_type','label','Work type','type','text','required',true),
   jsonb_build_object('key','requester','label','Requester','type','text'),
   jsonb_build_object('key','value_or_impact','label','Value or impact','type','text'),
   jsonb_build_object('key','evidence_link','label','Evidence link','type','url')
  )
 ))
on conflict(key) do update
set name=excluded.name,
    version=excluded.version,
    config=excluded.config,
    active=true,
    updated_at=now();

update public.service_engagements
set template_key=department||'-admin-v1'
where template_key is null;
