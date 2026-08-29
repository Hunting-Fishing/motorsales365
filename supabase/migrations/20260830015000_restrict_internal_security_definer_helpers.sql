-- Standalone hardening: these SECURITY DEFINER helpers are internal mutation
-- primitives used by trusted triggers/server routes. They are not public RPCs.

revoke execute on function public.accredit_staff_partner(uuid)
  from public, anon, authenticated;
grant execute on function public.accredit_staff_partner(uuid) to service_role;

revoke execute on function public.backfill_parts_wanted(uuid)
  from public, anon, authenticated;
grant execute on function public.backfill_parts_wanted(uuid) to service_role;

revoke execute on function public.dispatch_expand_stale()
  from public, anon, authenticated;
grant execute on function public.dispatch_expand_stale() to service_role;

revoke execute on function public.dispatch_match_providers(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.dispatch_match_providers(uuid, integer) to service_role;

revoke execute on function public.notify_user(uuid, text, text, text, text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.notify_user(uuid, text, text, text, text, text, uuid, jsonb)
  to service_role;

revoke execute on function public.pp_award_bounty(text, text, text)
  from public, anon, authenticated;
grant execute on function public.pp_award_bounty(text, text, text) to service_role;
