-- Cycle 20: tighten Google source table grants and internal RPC access.
-- This keeps intentional public assessment/report RPCs unchanged.

-- Google OAuth token storage should be service-role only.
revoke all on table public.source_connection_secrets from anon;
revoke all on table public.source_connection_secrets from authenticated;
revoke all on table public.source_connection_secrets from public;
grant select, insert, update, delete on table public.source_connection_secrets to service_role;

-- Import events are written by server/service-role sync jobs.
-- Owners may read them through the existing authenticated RLS SELECT policy.
revoke all on table public.source_import_events from anon;
revoke all on table public.source_import_events from authenticated;
revoke all on table public.source_import_events from public;
grant select on table public.source_import_events to authenticated;
grant select, insert, update, delete on table public.source_import_events to service_role;

-- Automation settings are app-only and require an authenticated business owner.
revoke all on function public.get_or_create_automation_settings() from anon;
revoke all on function public.get_or_create_automation_settings() from public;
grant execute on function public.get_or_create_automation_settings() to authenticated;
grant execute on function public.get_or_create_automation_settings() to service_role;

-- Soft-launch dashboard helpers should not be callable by anonymous users.
revoke all on function public.is_soft_launch_admin() from anon;
revoke all on function public.is_soft_launch_admin() from public;
grant execute on function public.is_soft_launch_admin() to authenticated;
grant execute on function public.is_soft_launch_admin() to service_role;

revoke all on function public.get_soft_launch_dashboard() from anon;
revoke all on function public.get_soft_launch_dashboard() from public;
grant execute on function public.get_soft_launch_dashboard() to authenticated;
grant execute on function public.get_soft_launch_dashboard() to service_role;
