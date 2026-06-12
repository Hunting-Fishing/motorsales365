GRANT EXECUTE ON FUNCTION public.can_support(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.can_moderate(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.can_manage_org(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.can_manage_ads(uuid) TO anon;