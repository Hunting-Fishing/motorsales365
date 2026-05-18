
-- ============================================================
-- 1. Storage: drop broad public SELECT (anon LIST) on public buckets
-- ============================================================
-- Bucket-level "public" flag still allows anonymous GET via
-- /storage/v1/object/public/{bucket}/{path}. RLS SELECT on
-- storage.objects only governs LIST and signed-URL flows.
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "business-logos public read" ON storage.objects;
DROP POLICY IF EXISTS "listing-photos public read" ON storage.objects;
DROP POLICY IF EXISTS "listing-videos public read" ON storage.objects;
DROP POLICY IF EXISTS "qr-codes public read" ON storage.objects;

-- ============================================================
-- 2. SECURITY DEFINER: revoke from anon/public
-- ============================================================
-- Trigger functions are fired by Postgres internally and don't
-- need EXECUTE granted to roles. Revoke from anon + public.
REVOKE EXECUTE ON FUNCTION public.attach_signup_referral() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tg_business_recompute_rating() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tg_staff_referral_audit() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tg_staff_referral_audit_insert() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tg_create_staff_referral() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.gen_referral_code(text) FROM anon, public;

-- Helper that should only be invoked by other security-definer
-- functions (apply_referral_redemption, preview_referral_discount).
REVOKE EXECUTE ON FUNCTION public.pick_referral_promo(uuid, text, numeric) FROM anon, public;

-- Admin-only management functions.
REVOKE EXECUTE ON FUNCTION public.sync_staff_referrals() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.sync_staff_referrals() TO authenticated;

-- Service-role-only (cron-driven currency refresh).
REVOKE EXECUTE ON FUNCTION public.upsert_currency_rates(jsonb) FROM anon, public, authenticated;
GRANT  EXECUTE ON FUNCTION public.upsert_currency_rates(jsonb) TO service_role;

-- Authenticated-only: discount preview + redemption.
REVOKE EXECUTE ON FUNCTION public.preview_referral_discount(text, numeric) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.preview_referral_discount(text, numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.apply_referral_redemption(text, numeric, uuid, uuid, uuid, jsonb) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.apply_referral_redemption(text, numeric, uuid, uuid, uuid, jsonb) TO authenticated;

-- Intentionally KEEP anon EXECUTE on:
--   * record_qr_scan(...)  -> QR landing page is visited by anonymous users.
--   * increment_listing_view(...) -> Anonymous listing view counter.
--   * has_role / can_* / current_plan_tier / is_*  -> Read-only role checks.
