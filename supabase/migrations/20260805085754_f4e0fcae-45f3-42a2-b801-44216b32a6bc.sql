-- 1. advertisements: advertiser PII is staff-only; visitors get no access at all
REVOKE ALL ON TABLE public.advertisements FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertisements TO authenticated;
GRANT ALL ON public.advertisements TO service_role;

-- 2. lead_offers: contact fields only via admin policy / unlock policy; no anon access
REVOKE ALL ON TABLE public.lead_offers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_offers TO authenticated;
GRANT ALL ON public.lead_offers TO service_role;

-- 3. sales_rep_profiles: rep + admin only, never anon
REVOKE ALL ON TABLE public.sales_rep_profiles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_rep_profiles TO authenticated;
GRANT ALL ON public.sales_rep_profiles TO service_role;

-- 4. provider_tow_rates: owner + admin only, never anon
REVOKE ALL ON TABLE public.provider_tow_rates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_tow_rates TO authenticated;
GRANT ALL ON public.provider_tow_rates TO service_role;

-- 5. business_bookings: guests may create a booking but can never read/modify rows
REVOKE ALL ON TABLE public.business_bookings FROM anon;
GRANT INSERT ON public.business_bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_bookings TO authenticated;
GRANT ALL ON public.business_bookings TO service_role;

-- 6. listing_views: allow view tracking inserts scoped to a visible listing
DROP POLICY IF EXISTS "Anyone can record a listing view" ON public.listing_views;
CREATE POLICY "Anyone can record a listing view"
ON public.listing_views FOR INSERT TO anon, authenticated
WITH CHECK (
  (viewer_id IS NULL OR viewer_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_views.listing_id
      AND l.status IN ('active', 'pending_sale', 'sold')
  )
);
REVOKE ALL ON TABLE public.listing_views FROM anon, authenticated;
GRANT SELECT, INSERT ON public.listing_views TO anon, authenticated;
GRANT ALL ON public.listing_views TO service_role;

-- 7. referral_visits: allow visitors to record their own visit, never read others
DROP POLICY IF EXISTS "Visitors can record their own referral visit" ON public.referral_visits;
CREATE POLICY "Visitors can record their own referral visit"
ON public.referral_visits FOR INSERT TO anon, authenticated
WITH CHECK (linked_user_id IS NULL OR linked_user_id = auth.uid());

REVOKE ALL ON TABLE public.referral_visits FROM anon, authenticated;
GRANT INSERT ON public.referral_visits TO anon;
GRANT SELECT, INSERT ON public.referral_visits TO authenticated;
GRANT ALL ON public.referral_visits TO service_role;