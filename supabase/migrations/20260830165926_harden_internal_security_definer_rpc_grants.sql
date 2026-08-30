-- Standalone target hardening: internal SECURITY DEFINER helpers are invoked by
-- database trigger functions and do not require direct Data API execution.
-- Keep service_role access for controlled server-side maintenance.

revoke execute on function public.ensure_business_team_thread(uuid) from public, anon, authenticated;
grant execute on function public.ensure_business_team_thread(uuid) to service_role;

revoke execute on function public.recompute_signup_intent(uuid) from public, anon, authenticated;
grant execute on function public.recompute_signup_intent(uuid) to service_role;

revoke execute on function public.recompute_signup_intent(uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.recompute_signup_intent(uuid, text, text, text, text, text, text) to service_role;
