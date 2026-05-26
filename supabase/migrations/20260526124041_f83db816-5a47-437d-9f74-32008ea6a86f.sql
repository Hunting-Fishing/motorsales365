
-- Triggers only — no RPC callers
REVOKE EXECUTE ON FUNCTION public.grant_business_trial() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_vehicles_set_slug() FROM PUBLIC, anon, authenticated;

-- Drop anon access from helpers that should only be callable by signed-in users
REVOKE EXECUTE ON FUNCTION public.can_manage_org(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_shop(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.org_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_org_invite(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.self_serve_change_plan(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.preview_org_invite(text) FROM PUBLIC, anon;
