-- Signup attribution is invoked server-side with the service-role client after
-- a successful signup. Direct anon/authenticated RPC execution is unnecessary
-- and would allow callers to supply another user's id.

revoke execute on function public.link_signup_attribution(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.link_signup_attribution(uuid, uuid, text, text) to service_role;
