-- 1) Add fixed search_path to email queue helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

-- 2) Revoke public EXECUTE on trigger-only / service-only SECURITY DEFINER functions.
--    These are invoked by triggers, cron, or service_role only — never by app users.
REVOKE EXECUTE ON FUNCTION public.assign_founding_member()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_founding_bronze()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_free_listing_quota()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_tow_status_transitions()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_tow_bid_accepted()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_tow_status_change()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_towing_providers()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_verification()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_pending_sales()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_paid_subscription(uuid)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;