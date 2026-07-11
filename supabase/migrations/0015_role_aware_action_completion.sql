-- Make linked-action completion work for authorised owners, members and TAD
-- operators while keeping viewer memberships read-only.

create or replace function public.complete_action_safely(p_action_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_action public.actions%rowtype;
  v_template public.invoices%rowtype;
  v_now timestamptz := now();
  v_issued date;
  v_due date;
  v_next date;
  v_number text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select a.* into v_action
  from public.actions a
  where a.id = p_action_id
    and public.can_work_business(a.business_id, v_uid)
  for update;

  if v_action.id is null then raise exception 'action not found'; end if;
  if v_action.status = 'done' then
    return jsonb_build_object(
      'id', v_action.id,
      'kind', v_action.kind,
      'entity_table', v_action.entity_table,
      'already_done', true
    );
  end if;
  if v_action.status not in ('open', 'snoozed') then
    raise exception 'action is not completable';
  end if;

  if v_action.entity_id is not null then
    case v_action.kind
      when 'lead_response' then
        update public.leads
        set status = 'responded', responded_at = v_now
        where id = v_action.entity_id
          and business_id = v_action.business_id;
        if not found then raise exception 'linked lead not found'; end if;

      when 'quote_followup' then
        update public.quotes
        set last_followup_at = v_now
        where id = v_action.entity_id
          and business_id = v_action.business_id;
        if not found then raise exception 'linked quote not found'; end if;

      when 'invoice_chase' then
        update public.invoices
        set last_chase_at = v_now
        where id = v_action.entity_id
          and business_id = v_action.business_id;
        if not found then raise exception 'linked invoice not found'; end if;

      when 'supplier_approval' then
        update public.invoices
        set status = 'approved'
        where id = v_action.entity_id
          and business_id = v_action.business_id
          and kind = 'supplier';
        if not found then raise exception 'linked supplier invoice not found'; end if;

      when 'recurring_invoice' then
        select * into v_template
        from public.invoices
        where id = v_action.entity_id
          and business_id = v_action.business_id
        for update;

        if v_template.id is null or v_template.next_issue_date is null then
          raise exception 'recurring template not found';
        end if;

        v_issued := v_template.next_issue_date;
        v_due := v_issued + 7;
        v_next := (v_issued + interval '1 month')::date;
        v_number := left(
          v_template.number || '-' || to_char(v_issued, 'YYYY-MM'),
          60
        );

        if not exists (
          select 1 from public.invoices
          where business_id = v_action.business_id
            and number = v_number
        ) then
          insert into public.invoices(
            business_id, customer_id, kind, number, description,
            amount, status, issued_at, due_date
          ) values (
            v_action.business_id, v_template.customer_id, 'customer',
            v_number, v_template.description, v_template.amount,
            'sent', v_issued, v_due
          );
        end if;

        update public.invoices
        set next_issue_date = v_next
        where id = v_template.id;

      else
        null;
    end case;
  end if;

  update public.actions
  set status = 'done',
      completed_at = v_now,
      completed_by = v_uid,
      snoozed_until = null
  where id = v_action.id;

  return jsonb_build_object(
    'id', v_action.id,
    'kind', v_action.kind,
    'entity_table', v_action.entity_table,
    'already_done', false
  );
end;
$$;

create or replace function public.complete_action_with_outcome(
  p_action_id uuid,
  p_outcome_code text default null,
  p_outcome_note text default null,
  p_next_action_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_action public.actions%rowtype;
  v_completed jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  if p_outcome_code is not null and p_outcome_code not in (
    'contacted', 'no_answer', 'follow_up', 'won', 'lost',
    'paid', 'approved', 'completed', 'not_needed', 'other'
  ) then
    raise exception 'invalid outcome';
  end if;

  if p_next_action_date is not null and p_next_action_date < current_date then
    raise exception 'next action date is in the past';
  end if;

  select a.* into v_action
  from public.actions a
  where a.id = p_action_id
    and public.can_work_business(a.business_id, v_uid)
  for update;

  if v_action.id is null then raise exception 'action not found'; end if;

  v_completed := public.complete_action_safely(p_action_id);

  update public.actions
  set completed_by = v_uid,
      outcome_code = p_outcome_code,
      outcome_note = nullif(trim(p_outcome_note), ''),
      next_action_date = p_next_action_date
  where id = p_action_id;

  if p_next_action_date is not null then
    insert into public.actions(
      business_id, key, kind, title, detail, priority,
      entity_table, entity_id, contact_phone, due_date,
      status, assigned_to, source
    ) values (
      v_action.business_id,
      'manual_followup:' || v_action.id::text || ':' || p_next_action_date::text,
      'manual_followup',
      'Follow up — ' || v_action.title,
      coalesce(
        nullif(trim(p_outcome_note), ''),
        'Continue the previous action and record the outcome.'
      ),
      greatest(v_action.priority - 5, 10),
      v_action.entity_table,
      v_action.entity_id,
      v_action.contact_phone,
      p_next_action_date,
      'open',
      coalesce(v_action.assigned_to, v_uid),
      'outcome'
    )
    on conflict (business_id, key) do nothing;
  end if;

  return v_completed || jsonb_build_object(
    'outcome_code', p_outcome_code,
    'next_action_date', p_next_action_date
  );
end;
$$;

revoke all on function public.complete_action_safely(uuid) from public;
revoke all on function public.complete_action_safely(uuid) from anon;
revoke all on function public.complete_action_with_outcome(uuid, text, text, date) from public;
revoke all on function public.complete_action_with_outcome(uuid, text, text, date) from anon;
grant execute on function public.complete_action_safely(uuid) to authenticated;
grant execute on function public.complete_action_with_outcome(uuid, text, text, date) to authenticated;
