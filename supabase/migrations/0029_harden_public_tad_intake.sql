-- Public callers reach the department intake RPC through the server route, but the
-- RPC is also visible through PostgREST. Enforce capacity limits at the table so a
-- caller cannot bypass the application-layer IP limiter with fresh fingerprints.
create or replace function public.guard_tad_application_intake()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(new.email, '')));
begin
  perform pg_advisory_xact_lock(hashtext('tad_application_intake:' || date_trunc('hour', now())::text));

  if (
    select count(*)
    from public.tad_applications
    where submitted_at > now() - interval '1 hour'
  ) >= 100 then
    raise exception 'intake_capacity_reached';
  end if;

  if (
    select count(*)
    from public.tad_applications
    where lower(email) = v_email
      and submitted_at > now() - interval '24 hours'
  ) >= 6 then
    raise exception 'email_application_limit_reached';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_tad_application_intake() from public, anon, authenticated;

drop trigger if exists tad_application_intake_guard on public.tad_applications;
create trigger tad_application_intake_guard
before insert on public.tad_applications
for each row execute function public.guard_tad_application_intake();

-- The multi-department endpoint replaced the original Sales-only public RPC.
-- Keep the function for migration compatibility, but remove it from the API.
revoke all on function public.submit_tad_application(
  text,text,text,integer,text,text,text,boolean,boolean,boolean,text,text
) from public, anon, authenticated;
