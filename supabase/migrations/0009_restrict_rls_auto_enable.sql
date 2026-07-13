-- Restrict Supabase's optional RLS auto-enable event-trigger helper.
-- Some production projects contain this infrastructure helper while a fresh
-- local Supabase stack does not. The migration must be safe in both cases.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public;
    revoke all on function public.rls_auto_enable() from anon;
    revoke all on function public.rls_auto_enable() from authenticated;
    grant execute on function public.rls_auto_enable() to service_role;
  end if;
end
$$;
