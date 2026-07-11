-- Surface pending client approvals in DueToday and prevent a generic action
-- completion from bypassing the human decision recorded on service_approvals.

create or replace function public.sync_service_approval_action()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignee uuid;
begin
  select coalesce(
    (
      select bm.user_id
      from public.business_memberships bm
      where bm.business_id = new.business_id
        and bm.active
        and bm.role in ('owner', 'manager')
      order by case bm.role when 'owner' then 1 else 2 end, bm.created_at
      limit 1
    ),
    b.owner_id
  ) into v_assignee
  from public.businesses b
  where b.id = new.business_id;

  if new.status = 'pending' then
    insert into public.actions(
      business_id, key, kind, title, detail, priority,
      entity_table, entity_id, due_date, status,
      assigned_to, source
    ) values (
      new.business_id,
      'service_approval:' || new.id::text,
      'client_approval',
      'Decision required — ' || new.title,
      new.detail,
      98,
      'service_approvals',
      new.id,
      coalesce(new.due_date, current_date),
      'open',
      v_assignee,
      'tad_service'
    )
    on conflict (business_id, key) do update
      set title = excluded.title,
          detail = excluded.detail,
          priority = excluded.priority,
          entity_table = excluded.entity_table,
          entity_id = excluded.entity_id,
          due_date = excluded.due_date,
          status = 'open',
          snoozed_until = null,
          completed_at = null,
          completed_by = null,
          outcome_code = null,
          outcome_note = null,
          assigned_to = excluded.assigned_to,
          source = excluded.source;
  else
    update public.actions
    set status = 'done',
        snoozed_until = null,
        completed_at = coalesce(new.decided_at, now()),
        completed_by = new.decided_by,
        outcome_code = new.status,
        outcome_note = new.decision_note
    where business_id = new.business_id
      and key = 'service_approval:' || new.id::text
      and status in ('open', 'snoozed');
  end if;

  return new;
end;
$$;

create or replace function public.guard_client_approval_action_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.kind = 'client_approval'
     and old.status in ('open', 'snoozed')
     and new.status = 'done'
     and exists (
       select 1
       from public.service_approvals sa
       where sa.id = old.entity_id
         and sa.business_id = old.business_id
         and sa.status = 'pending'
     ) then
    raise exception 'approval must be decided in the Service Desk';
  end if;
  return new;
end;
$$;

drop trigger if exists service_approval_action_sync on public.service_approvals;
create trigger service_approval_action_sync
after insert or update of status, title, detail, due_date, decision_note, decided_at, decided_by
on public.service_approvals
for each row execute function public.sync_service_approval_action();

drop trigger if exists guard_client_approval_action_completion on public.actions;
create trigger guard_client_approval_action_completion
before update of status on public.actions
for each row execute function public.guard_client_approval_action_completion();

-- Backfill any approvals that were already pending before the trigger existed.
insert into public.actions(
  business_id, key, kind, title, detail, priority,
  entity_table, entity_id, due_date, status,
  assigned_to, source
)
select
  sa.business_id,
  'service_approval:' || sa.id::text,
  'client_approval',
  'Decision required — ' || sa.title,
  sa.detail,
  98,
  'service_approvals',
  sa.id,
  coalesce(sa.due_date, current_date),
  'open',
  coalesce(
    (
      select bm.user_id
      from public.business_memberships bm
      where bm.business_id = sa.business_id
        and bm.active
        and bm.role in ('owner', 'manager')
      order by case bm.role when 'owner' then 1 else 2 end, bm.created_at
      limit 1
    ),
    b.owner_id
  ),
  'tad_service'
from public.service_approvals sa
join public.businesses b on b.id = sa.business_id
where sa.status = 'pending'
on conflict (business_id, key) do update
  set title = excluded.title,
      detail = excluded.detail,
      priority = excluded.priority,
      entity_table = excluded.entity_table,
      entity_id = excluded.entity_id,
      due_date = excluded.due_date,
      status = 'open',
      snoozed_until = null,
      completed_at = null,
      completed_by = null,
      outcome_code = null,
      outcome_note = null,
      assigned_to = excluded.assigned_to,
      source = excluded.source;
