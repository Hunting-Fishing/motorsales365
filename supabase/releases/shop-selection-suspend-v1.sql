-- Stop switching, retaining all outcomes, scoped profile data and authority guards.
-- The authorized list remains readable. Do NOT restore direct profile/role edits.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.shop_selection_change_v1(jsonb,boolean),
  shop_selection_v1.execute(jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
