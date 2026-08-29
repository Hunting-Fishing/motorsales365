-- Restrict direct RPC access to maintenance helpers that are executed
-- internally by postgres-owned trigger/helper functions or trusted server code.
-- Preserve service_role and postgres execution while removing public client access.

REVOKE ALL ON FUNCTION public.match_listing_to_parts_wanted(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_listing_to_parts_wanted(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.recompute_seller_rating(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_seller_rating(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.pp_recompute_payout_total(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pp_recompute_payout_total(uuid) TO service_role;
