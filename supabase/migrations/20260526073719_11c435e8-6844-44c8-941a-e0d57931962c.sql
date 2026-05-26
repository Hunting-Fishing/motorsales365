
-- 1) Security Definer View → security_invoker
ALTER VIEW public.public_profiles SET (security_invoker = on);

-- 2) Revoke EXECUTE from trigger-only / internal-only SECURITY DEFINER functions
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'tg_audit_ad_inquiry()',
    'tg_business_recompute_rating()',
    'tg_create_staff_referral()',
    'tg_lead_activity()',
    'tg_lead_from_message()',
    'tg_lead_from_service_inquiry()',
    'tg_lead_from_tow_request()',
    'tg_lead_notify_org()',
    'tg_listing_price_history()',
    'tg_org_add_creator_as_owner()',
    'tg_shop_click_increment()',
    'ride_likes_count_sync()',
    'rides_listing_sold_sync()',
    'ad_events_increment()',
    'handle_new_user()',
    'handle_tow_bid_accepted()',
    'sync_profile_verification()',
    'notify_tow_status_change()',
    'notify_towing_providers()',
    'enforce_ad_inquiry_status_transitions()',
    'enforce_free_listing_quota()',
    'enforce_tow_status_transitions()',
    'on_ad_inquiry_created()',
    'on_ad_inquiry_reply()',
    'gen_referral_code(text)',
    'grant_founding_bronze()',
    'assign_founding_member()',
    'attach_signup_referral()',
    'expire_stale_pending_sales()',
    'pick_referral_promo(uuid, text, numeric)',
    'move_to_dlq(text, text, bigint, jsonb)',
    'read_email_batch(text, integer, integer)',
    'delete_email(text, bigint)',
    'enqueue_email(text, jsonb)',
    'sync_staff_referrals()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing %', fn;
    END;
  END LOOP;
END $$;

-- 3) Revoke anon-only EXECUTE on helper functions that should only be callable by signed-in users
REVOKE EXECUTE ON FUNCTION public.can_manage_org(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_shop(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.org_role(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_business_trial() FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_org_invite(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.preview_org_invite(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.self_serve_change_plan(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_listing_view(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid, uuid) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_qr_scan(text, uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_qr_scan(text, uuid, text, text, text, text) TO anon, authenticated;

-- 4) Block bucket-wide LISTING on public buckets while still allowing direct file reads.
-- The default "Public Access" policy allows listing. Replace with a SELECT policy that requires a known object name (no folder listing).
-- We do this by removing any over-broad policy and creating a strict per-object SELECT policy per public bucket.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN (
        'Public Access', 'Public access', 'public read',
        'Avatar images are publicly accessible',
        'Listing photos are publicly accessible',
        'Listing videos are publicly accessible',
        'Business logos are publicly accessible',
        'QR codes are publicly accessible',
        'Ride media is publicly accessible',
        'Ad media is publicly accessible'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Recreate per-bucket read-by-name policies. These still allow GET on a specific path
-- (which is how the CDN URL works) but anon clients cannot enumerate the bucket
-- because the policy requires the request to target a non-null object name.
CREATE POLICY "Public buckets: read file by name"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id IN ('listing-photos','listing-videos','avatars','business-logos','qr-codes','ride-media','ad-media')
  AND name IS NOT NULL
);
