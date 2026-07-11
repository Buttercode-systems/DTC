-- Make the existing app action API workflow-aware without changing callers.
-- Standard lead/quote/invoice actions retain their existing transaction logic;
-- generic managed-workflow actions update the linked workflow record atomically.

create or replace function public.complete_action_with_outcome_v2(
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
  v_record public.workflow_records%rowtype;
  v_template public.workflow_templates%rowtype;
  v_terminal_status text;
  v_done boolean;
  v_now timestamptz := now();
  v_completed jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  if p_outcome_code is not null and p_outcome_code not in (
    'contacted', 'no_answer', 'follow_up', 'won', 'lost', 'paid',
    'approved', 'completed', 'not_needed', 'other'
  ) then raise exception 'invalid outcome'; end if;
  if p_next_action_date is not null and p_next_action_date < current_date then
    raise exception 'next action date is in the past';
  end if;

  select * into v_action
  from public.actions
  where id = p_action_id and public.can_work_business(business_id, v_uid)
  for update;
  if v_action.id is null then raise exception 'action not found'; end if;

  if v_action.entity_table is distinct from 'workflow_records' then
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
        coalesce(nullif(trim(p_outcome_note), ''), 'Continue the previous action and record the outcome.'),
        greatest(v_action.priority - 5, 10),
        v_action.entity_table,
        v_action.entity_id,
        v_action.contact_phone,
        p_next_action_date,
        'open',
        coalesce(v_action.assigned_to, v_uid),
        'outcome'
      ) on conflict (business_id, key) do nothing;
    end if;

    return v_completed || jsonb_build_object(
      'outcome_code', p_outcome_code,
      'next_action_date', p_next_action_date
    );
  end if;

  if v_action.status = 'done' then
    return jsonb_build_object('id', v_action.id, 'kind', v_action.kind, 'already_done', true);
  end if;
  if v_action.status not in ('open', 'snoozed') then raise exception 'action is not completable'; end if;

  select * into v_record
  from public.workflow_records
  where id = v_action.entity_id and business_id = v_action.business_id
  for update;
  if v_record.id is null then raise exception 'workflow record not found'; end if;

  select wt.* into v_template
  from public.workflow_instances wi
  join public.workflow_templates wt on wt.id = wi.template_id
  where wi.id = v_record.workflow_instance_id;
  v_terminal_status := coalesce(v_template.definition->>'default_terminal_status', v_record.status);
  v_done := coalesce(p_outcome_code, 'completed') in ('won', 'lost', 'paid', 'approved', 'completed', 'not_needed');

  update public.actions
  set status = 'done',
      completed_at = v_now,
      completed_by = v_uid,
      outcome_code = p_outcome_code,
      outcome_note = nullif(trim(p_outcome_note), ''),
      next_action_date = p_next_action_date,
      snoozed_until = null
  where id = v_action.id;

  update public.workflow_records
  set status = case when v_done then v_terminal_status else status end,
      next_action = case
        when v_done then null
        when p_next_action_date is not null then coalesce(nullif(trim(p_outcome_note), ''), next_action, 'Follow up')
        else next_action
      end,
      due_date = case
        when v_done then null
        when p_next_action_date is not null then p_next_action_date
        else due_date
      end,
      last_outcome_code = p_outcome_code,
      last_outcome_note = nullif(trim(p_outcome_note), ''),
      last_outcome_at = v_now,
      completed_at = case when v_done then v_now else completed_at end,
      updated_at = v_now
  where id = v_record.id;

  insert into public.workflow_events(
    business_id, workflow_instance_id, workflow_record_id, actor_id, event_name, metadata
  ) values (
    v_record.business_id,
    v_record.workflow_instance_id,
    v_record.id,
    v_uid,
    'action_outcome_recorded',
    jsonb_build_object(
      'action_id', v_action.id,
      'outcome_code', p_outcome_code,
      'next_action_date', p_next_action_date
    )
  );

  perform public.sync_workflow_actions(v_record.business_id);

  return jsonb_build_object(
    'id', v_action.id,
    'kind', v_action.kind,
    'entity_table', v_action.entity_table,
    'outcome_code', p_outcome_code,
    'next_action_date', p_next_action_date,
    'workflow_record_id', v_record.id,
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
language sql
security definer
set search_path = ''
as $$
  select public.complete_action_with_outcome_v2(
    p_action_id,
    p_outcome_code,
    p_outcome_note,
    p_next_action_date
  );
$$;

revoke all on function public.complete_action_with_outcome_v2(uuid, text, text, date) from public, anon;
revoke all on function public.complete_action_with_outcome(uuid, text, text, date) from public, anon;
grant execute on function public.complete_action_with_outcome_v2(uuid, text, text, date) to authenticated;
grant execute on function public.complete_action_with_outcome(uuid, text, text, date) to authenticated;
