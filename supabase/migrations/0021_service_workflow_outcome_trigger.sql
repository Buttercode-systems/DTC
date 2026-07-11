create or replace function public.reflect_service_workflow_outcome()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.entity_table='service_work_items'
     and new.entity_id is not null
     and (
       old.outcome_code is distinct from new.outcome_code
       or old.outcome_note is distinct from new.outcome_note
       or old.next_action_date is distinct from new.next_action_date
     ) then
    update public.service_work_items
    set last_outcome_code=new.outcome_code,
        last_outcome_note=new.outcome_note,
        due_date=case when new.next_action_date is not null then new.next_action_date else due_date end,
        next_action=case
          when new.next_action_date is not null and new.outcome_note is not null
            then left(new.outcome_note,500)
          else next_action
        end,
        updated_at=now()
    where id=new.entity_id
      and business_id=new.business_id;

    insert into public.service_work_item_events(
      work_item_id,business_id,actor_id,event_type,note,metadata
    ) values(
      new.entity_id,new.business_id,auth.uid(),'action_outcome',new.outcome_note,
      jsonb_build_object(
        'outcome_code',new.outcome_code,
        'next_action_date',new.next_action_date,
        'action_id',new.id
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists actions_reflect_service_workflow_outcome on public.actions;
create trigger actions_reflect_service_workflow_outcome
after update of outcome_code,outcome_note,next_action_date on public.actions
for each row
execute function public.reflect_service_workflow_outcome();

revoke all on function public.reflect_service_workflow_outcome() from public,anon,authenticated;
