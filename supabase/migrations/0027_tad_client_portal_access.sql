-- Make the TAD promise "the client receives portal access" true without
-- granting access by request parameters or exposing membership tables.
-- An authenticated user may claim only managed workspaces whose verified
-- primary contact email exactly matches the email on their Supabase account.

create or replace function public.claim_tad_client_access()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_business_id uuid;
  v_claimed integer := 0;
  v_business_ids uuid[] := array[]::uuid[];
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select lower(trim(email))
  into v_email
  from auth.users
  where id = v_uid;

  if v_email is null or v_email = '' then
    raise exception 'verified_email_required';
  end if;

  for v_business_id in
    select b.id
    from public.businesses b
    where b.managed_by_tad
      and b.service_status <> 'closed'
      and lower(trim(coalesce(b.primary_contact_email, ''))) = v_email
    order by b.created_at
  loop
    insert into public.business_memberships(business_id, user_id, role, active)
    values (v_business_id, v_uid, 'manager', true)
    on conflict (business_id, user_id) do update
      set active = true,
          role = case
            when public.business_memberships.role in ('owner', 'operator')
              then public.business_memberships.role
            else 'manager'
          end;

    v_claimed := v_claimed + 1;
    v_business_ids := array_append(v_business_ids, v_business_id);

    insert into public.tad_application_events(
      application_id, actor_id, event_type, from_status, to_status, detail
    )
    select a.id, v_uid, 'client_portal_access_claimed', a.status, a.status,
           'Primary contact activated TAD Client Portal access.'
    from public.tad_applications a
    where a.managed_business_id = v_business_id
      and not exists (
        select 1
        from public.tad_application_events e
        where e.application_id = a.id
          and e.actor_id = v_uid
          and e.event_type = 'client_portal_access_claimed'
      );
  end loop;

  if v_claimed > 0 then
    insert into public.user_preferences(user_id, active_business_id, updated_at)
    values (v_uid, v_business_ids[1], now())
    on conflict (user_id) do update
      set active_business_id = case
            when public.user_preferences.active_business_id = any(v_business_ids)
              then public.user_preferences.active_business_id
            else excluded.active_business_id
          end,
          updated_at = now();
  end if;

  return jsonb_build_object(
    'claimed', v_claimed,
    'business_ids', to_jsonb(v_business_ids)
  );
end;
$$;

revoke all on function public.claim_tad_client_access() from public, anon;
grant execute on function public.claim_tad_client_access() to authenticated;
