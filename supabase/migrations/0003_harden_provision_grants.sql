-- Keep account provisioning callable only by signed-in users.
-- The function already checks auth.uid(), but this removes anon visibility
-- from Supabase's exposed RPC surface.

revoke execute on function public.provision_my_business(text, text) from anon;
grant execute on function public.provision_my_business(text, text) to authenticated;
