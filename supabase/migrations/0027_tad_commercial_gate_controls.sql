-- Make the commercial gate required by onboarding operable from Admin HQ.

create or replace function public.confirm_tad_application_commercial_gate(
  p_application_id uuid,
  p_payment_status text,
  p_payment_reference text,
  p_scope_accepted boolean
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

  if p_payment_status not in ('not_requested', 'pending', 'paid', 'waived', 'refunded') then
    raise exception 'invalid_payment_status';
  end if;

  select * into v_before
  from public.tad_applications
  where id = p_application_id
  for update;

  if v_before.id is null then raise exception 'application_not_found'; end if;
  if v_before.commercial_decision <> 'accepted' then
    raise exception 'commercial_acceptance_required';
  end if;

  update public.tad_applications
  set payment_status = p_payment_status,
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
    'commercial_gate_updated',
    v_before.status,
    v_after.status,
    format(
      'payment_status=%s; payment_reference=%s; scope_accepted=%s',
      v_after.payment_status,
      coalesce(v_after.payment_reference, 'none'),
      v_after.scope_accepted_at is not null
    )
  );

  return jsonb_build_object(
    'id', v_after.id,
    'payment_status', v_after.payment_status,
    'payment_reference', v_after.payment_reference,
    'payment_confirmed_at', v_after.payment_confirmed_at,
    'scope_accepted_at', v_after.scope_accepted_at,
    'ready_for_onboarding',
      v_after.commercial_decision = 'accepted'
      and v_after.payment_status in ('paid', 'waived')
      and v_after.scope_accepted_at is not null
  );
end;
$$;

revoke all on function public.confirm_tad_application_commercial_gate(uuid, text, text, boolean) from public, anon;
grant execute on function public.confirm_tad_application_commercial_gate(uuid, text, text, boolean) to authenticated;
