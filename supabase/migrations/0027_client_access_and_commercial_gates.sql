-- Make the managed-service promise enforceable:
-- 1. no application onboarding before scope and payment are confirmed;
-- 2. every managed client can receive a secure, email-matched portal invitation;
-- 3. operators can inspect and revoke client access without exposing auth tables.

alter table public.tad_applications
  add column if not exists payment_status text not null default 'not_requested',
  add column if not exists payment_reference text,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists scope_accepted_at timestamptz;

alter table public.tad_applications
  drop constraint if exists tad_applications_payment_status_check;
alter table public.tad_applications
  add constraint tad_applications_payment_status_check
  check (payment_status in ('not_requested', 'pending', 'paid', 'waived', 'refunded'));

create table if not exists public.managed_client_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  role text not null default 'owner',
  token_hash text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  check (email = lower(trim(email))),
  check (role in ('owner', 'manager', 'viewer')),
  check (status in ('pending', 'claimed', 'revoked', 'expired'))
);

create unique index if not exists managed_client_invitations_pending_email_idx
  on public.managed_client_invitations(business_id, email)
  where status = 'pending';
create index if not exists managed_client_invitations_business_idx
  on public.managed_client_invitations(business_id, created_at desc);

alter table public.managed_client_invitations enable row level security;
revoke all on table public.managed_client_invitations from public, anon, authenticated;

create or replace function public.review_tad_application(
  p_application_id uuid,
  p_status text,
  p_qualification_notes text default null,
  p_commercial_decision text default 'pending',
  p_payment_status text default 'not_requested',
  p_payment_reference text default null,
  p_scope_accepted boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_before public.tad_applications%rowtype;
  v_after public.tad_applications%rowtype;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then
    raise exception 'operator_access_required';
  end if;
  if p_status not in ('new', 'reviewing', 'qualified', 'declined', 'onboarding', 'converted') then
    raise exception 'invalid_application_status';
  end if;
  if p_commercial_decision not in ('pending', 'accepted', 'declined', 'needs_scope') then
    raise exception 'invalid_commercial_decision';
  end if;
  if p_payment_status not in ('not_requested', 'pending', 'paid', 'waived', 'refunded') then
    raise exception 'invalid_payment_status';
  end if;

  select * into v_before
  from public.tad_applications
  where id = p_application_id
  for update;

  if v_before.id is null then raise exception 'application_not_found'; end if;
  if p_status in ('onboarding', 'converted') and v_before.managed_business_id is null then
    raise exception 'managed_business_required';
  end if;

  update public.tad_applications
  set status = p_status,
      qualification_notes = nullif(left(trim(coalesce(p_qualification_notes, '')), 2000), ''),
      commercial_decision = p_commercial_decision,
      payment_status = p_payment_status,
      payment_reference = nullif(left(trim(coalesce(p_payment_reference, '')), 200), ''),
      payment_confirmed_at = case
        when p_payment_status in ('paid', 'waived') then coalesce(payment_confirmed_at, now())
        else null
      end,
      scope_accepted_at = case
        when p_scope_accepted then coalesce(scope_accepted_at, now())
        else null
      end
  where id = p_application_id
  returning * into v_after;

  insert into public.tad_application_events(
    application_id, actor_id, event_type, from_status, to_status, detail
  ) values (
    v_after.id,
    v_uid,
    'review_updated',
    v_before.status,
    v_after.status,
    left(format(
      'decision=%s; payment=%s; scope=%s; %s',
      v_after.commercial_decision,
      v_after.payment_status,
      case when v_after.scope_accepted_at is null then 'pending' else 'accepted' end,
      coalesce(v_after.qualification_notes, '')
    ), 500)
  );

  return jsonb_build_object(
    'id', v_after.id,
    'status', v_after.status,
    'commercial_decision', v_after.commercial_decision,
    'payment_status', v_after.payment_status,
    'scope_accepted', v_after.scope_accepted_at is not null,
    'managed_business_id', v_after.managed_business_id
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
  if v_uid is null or not public.is_tad_operator(v_uid) then
    raise exception 'operator_access_required';
  end if;

  select * into v_application
  from public.tad_applications
  where id = p_application_id
  for update;

  if v_application.id is null then raise exception 'application_not_found'; end if;
  if v_application.status not in ('qualified', 'onboarding') then
    raise exception 'application_must_be_qualified';
  end if;
  if v_application.commercial_decision <> 'accepted' then
    raise exception 'commercial_acceptance_required';
  end if;
  if v_application.payment_status not in ('paid', 'waived') then
    raise exception 'payment_confirmation_required';
  end if;
  if v_application.scope_accepted_at is null then
    raise exception 'scope_acceptance_required';
  end if;

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
        status = 'onboarding'
    where id = v_application.id;

    insert into public.tad_application_events(
      application_id, actor_id, event_type, from_status, to_status, detail
    ) values (
      v_application.id,
      v_uid,
      'onboarding_started',
      v_application.status,
      'onboarding',
      format('Created managed %s Admin workspace %s after scope and payment confirmation', v_application.department, v_business_id)
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

create or replace function public.create_managed_client_invitation(
  p_business_id uuid,
  p_email text,
  p_role text default 'owner'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text;
  v_invitation public.managed_client_invitations%rowtype;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then
    raise exception 'operator_access_required';
  end if;
  if not exists (
    select 1 from public.businesses
    where id = p_business_id and managed_by_tad
  ) then
    raise exception 'managed_business_not_found';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'valid_email_required';
  end if;
  if p_role not in ('owner', 'manager', 'viewer') then
    raise exception 'invalid_client_role';
  end if;

  update public.managed_client_invitations
  set status = 'revoked', revoked_by = v_uid, revoked_at = now()
  where business_id = p_business_id
    and email = v_email
    and status = 'pending';

  v_token := replace(replace(replace(encode(extensions.gen_random_bytes(32), 'base64'), '+', '-'), '/', '_'), '=', '');

  insert into public.managed_client_invitations(
    business_id, email, role, token_hash, status, expires_at, created_by
  ) values (
    p_business_id,
    v_email,
    p_role,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    'pending',
    now() + interval '7 days',
    v_uid
  ) returning * into v_invitation;

  return jsonb_build_object(
    'id', v_invitation.id,
    'business_id', v_invitation.business_id,
    'email', v_invitation.email,
    'role', v_invitation.role,
    'token', v_token,
    'expires_at', v_invitation.expires_at
  );
end;
$$;

create or replace function public.get_managed_client_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_invitation public.managed_client_invitations%rowtype;
  v_business public.businesses%rowtype;
begin
  if char_length(trim(coalesce(p_token, ''))) < 32 then
    return null;
  end if;

  select * into v_invitation
  from public.managed_client_invitations
  where token_hash = encode(extensions.digest(trim(p_token), 'sha256'), 'hex')
  limit 1;

  if v_invitation.id is null then return null; end if;
  select * into v_business from public.businesses where id = v_invitation.business_id;

  return jsonb_build_object(
    'id', v_invitation.id,
    'business_id', v_invitation.business_id,
    'business_name', v_business.name,
    'email', v_invitation.email,
    'role', v_invitation.role,
    'status', case
      when v_invitation.status = 'pending' and v_invitation.expires_at <= now() then 'expired'
      else v_invitation.status
    end,
    'expires_at', v_invitation.expires_at
  );
end;
$$;

create or replace function public.claim_managed_client_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_user_email text;
  v_invitation public.managed_client_invitations%rowtype;
  v_department text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select lower(trim(email)) into v_user_email from auth.users where id = v_uid;

  select * into v_invitation
  from public.managed_client_invitations
  where token_hash = encode(extensions.digest(trim(coalesce(p_token, '')), 'sha256'), 'hex')
  for update;

  if v_invitation.id is null then raise exception 'invitation_not_found'; end if;
  if v_invitation.status <> 'pending' then raise exception 'invitation_not_pending'; end if;
  if v_invitation.expires_at <= now() then
    update public.managed_client_invitations set status = 'expired' where id = v_invitation.id;
    raise exception 'invitation_expired';
  end if;
  if v_user_email is distinct from v_invitation.email then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into public.business_memberships(business_id, user_id, role, active)
  values(v_invitation.business_id, v_uid, v_invitation.role, true)
  on conflict(business_id, user_id) do update
    set role = excluded.role,
        active = true;

  if v_invitation.role = 'owner' then
    update public.businesses set owner_id = v_uid where id = v_invitation.business_id;
  end if;

  insert into public.user_preferences(user_id, active_business_id, updated_at)
  values(v_uid, v_invitation.business_id, now())
  on conflict(user_id) do update
    set active_business_id = excluded.active_business_id,
        updated_at = now();

  update public.managed_client_invitations
  set status = 'claimed', claimed_by = v_uid, claimed_at = now()
  where id = v_invitation.id;

  select department into v_department
  from public.service_engagements
  where business_id = v_invitation.business_id
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'business_id', v_invitation.business_id,
    'role', v_invitation.role,
    'department', v_department,
    'status', 'claimed'
  );
end;
$$;

create or replace function public.get_managed_client_access(p_business_id uuid)
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
    raise exception 'operator_access_required';
  end if;
  if not exists (select 1 from public.businesses where id = p_business_id and managed_by_tad) then
    raise exception 'managed_business_not_found';
  end if;

  return jsonb_build_object(
    'memberships', coalesce((
      select jsonb_agg(row_to_json(x) order by x.email)
      from (
        select bm.user_id, lower(u.email) as email, bm.role, bm.active, bm.created_at
        from public.business_memberships bm
        join auth.users u on u.id = bm.user_id
        where bm.business_id = p_business_id
          and bm.role in ('owner', 'manager', 'viewer')
      ) x
    ), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(row_to_json(x) order by x.created_at desc)
      from (
        select i.id, i.email, i.role,
               case when i.status = 'pending' and i.expires_at <= now() then 'expired' else i.status end as status,
               i.expires_at, i.created_at, i.claimed_at, i.revoked_at
        from public.managed_client_invitations i
        where i.business_id = p_business_id
        order by i.created_at desc
        limit 30
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.revoke_managed_client_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_business_id uuid;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then
    raise exception 'operator_access_required';
  end if;

  update public.managed_client_invitations
  set status = 'revoked', revoked_by = v_uid, revoked_at = now()
  where id = p_invitation_id and status = 'pending'
  returning business_id into v_business_id;

  return v_business_id is not null;
end;
$$;

create or replace function public.deactivate_managed_client_access(
  p_business_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_changed boolean := false;
begin
  if v_uid is null or not public.is_tad_operator(v_uid) then
    raise exception 'operator_access_required';
  end if;
  if not exists (select 1 from public.businesses where id = p_business_id and managed_by_tad) then
    raise exception 'managed_business_not_found';
  end if;

  update public.business_memberships
  set active = false
  where business_id = p_business_id
    and user_id = p_user_id
    and role in ('owner', 'manager', 'viewer');
  v_changed := found;

  if v_changed then
    update public.businesses
    set owner_id = v_uid
    where id = p_business_id and owner_id = p_user_id;
    update public.user_preferences
    set active_business_id = null, updated_at = now()
    where user_id = p_user_id and active_business_id = p_business_id;
  end if;

  return v_changed;
end;
$$;

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
               a.payment_status, a.payment_reference, a.payment_confirmed_at,
               a.scope_accepted_at,
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

revoke all on function public.review_tad_application(uuid,text,text,text,text,text,boolean) from public, anon;
revoke all on function public.create_managed_client_invitation(uuid,text,text) from public, anon;
revoke all on function public.get_managed_client_invitation(text) from public;
revoke all on function public.claim_managed_client_invitation(text) from public, anon;
revoke all on function public.get_managed_client_access(uuid) from public, anon;
revoke all on function public.revoke_managed_client_invitation(uuid) from public, anon;
revoke all on function public.deactivate_managed_client_access(uuid,uuid) from public, anon;

grant execute on function public.review_tad_application(uuid,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.create_managed_client_invitation(uuid,text,text) to authenticated;
grant execute on function public.get_managed_client_invitation(text) to anon, authenticated;
grant execute on function public.claim_managed_client_invitation(text) to authenticated;
grant execute on function public.get_managed_client_access(uuid) to authenticated;
grant execute on function public.revoke_managed_client_invitation(uuid) to authenticated;
grant execute on function public.deactivate_managed_client_access(uuid,uuid) to authenticated;
