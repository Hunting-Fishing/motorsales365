-- 1. Storage: remove broad QR-codes listing policy (bucket is still public, getPublicUrl works)
DROP POLICY IF EXISTS "QR codes public read" ON storage.objects;

-- 2. Revoke EXECUTE on internal functions from anon/authenticated/public
-- Trigger-only functions (fired by triggers, never called directly)
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'assign_founding_member','attach_signup_referral','enforce_ad_inquiry_status_transitions',
    'enforce_free_listing_quota','enforce_tow_status_transitions','grant_founding_bronze',
    'handle_new_user','handle_tow_bid_accepted','notify_tow_status_change',
    'notify_towing_providers','on_ad_inquiry_created','on_ad_inquiry_reply',
    'sync_profile_verification','tg_audit_ad_inquiry','tg_business_recompute_rating',
    'tg_create_staff_referral','tg_org_add_creator_as_owner','tg_staff_referral_audit',
    'tg_staff_referral_audit_insert','validate_ad_inquiry',
    -- Server / cron-only
    'enqueue_email','read_email_batch','delete_email','move_to_dlq',
    'expire_stale_pending_sales','upsert_currency_rates',
    -- Internal helpers (called by other SECURITY DEFINER fns)
    'gen_referral_code','pick_referral_promo'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      -- some have non-default signatures or may not exist; skip silently
      NULL;
    END;
  END LOOP;
END $$;

-- Handle functions with specific signatures explicitly
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_currency_rates(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pick_referral_promo(uuid, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_referral_code(text) FROM PUBLIC, anon, authenticated;

-- 3. Tighten ad_inquiries insert: keep public form open, but reject malformed payloads via existing validate trigger
-- Ensure validation trigger fires BEFORE insert (idempotent)
DROP TRIGGER IF EXISTS trg_validate_ad_inquiry ON public.ad_inquiries;
CREATE TRIGGER trg_validate_ad_inquiry
  BEFORE INSERT OR UPDATE ON public.ad_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.validate_ad_inquiry();

-- 4. Ensure ad_inquiry status-transition + audit triggers are wired
DROP TRIGGER IF EXISTS trg_enforce_ad_inquiry_status ON public.ad_inquiries;
CREATE TRIGGER trg_enforce_ad_inquiry_status
  BEFORE UPDATE ON public.ad_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ad_inquiry_status_transitions();

DROP TRIGGER IF EXISTS trg_audit_ad_inquiry ON public.ad_inquiries;
CREATE TRIGGER trg_audit_ad_inquiry
  AFTER INSERT OR UPDATE ON public.ad_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_ad_inquiry();

DROP TRIGGER IF EXISTS trg_ad_inquiry_created_email ON public.ad_inquiries;
CREATE TRIGGER trg_ad_inquiry_created_email
  AFTER INSERT ON public.ad_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.on_ad_inquiry_created();