
-- 1) listing_verifications: remove anon public access
DROP POLICY IF EXISTS "Public reads verification status for active listings" ON public.listing_verifications;
REVOKE SELECT ON public.listing_verifications FROM anon;

-- Safe minimal public view exposing only status (name avoids existing enum type)
CREATE OR REPLACE VIEW public.public_listing_verification_status AS
SELECT
  v.listing_id,
  v.status,
  v.created_at,
  v.updated_at
FROM public.listing_verifications v
JOIN public.listings l ON l.id = v.listing_id
WHERE l.status = 'active';

GRANT SELECT ON public.public_listing_verification_status TO anon, authenticated;

-- 2) qr_lead_captures: scope advertising role to own referral codes
DROP POLICY IF EXISTS "Advertising read all QR leads" ON public.qr_lead_captures;
CREATE POLICY "Advertising read own QR leads"
  ON public.qr_lead_captures FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'advertising'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.staff_referrals s
      WHERE s.referral_code = qr_lead_captures.referral_code
        AND s.staff_user_id = auth.uid()
    )
  );

-- 3) qr_scans: scope sales + advertising roles to own referral codes
DROP POLICY IF EXISTS "Sales read qr_scans" ON public.qr_scans;
CREATE POLICY "Sales read own qr_scans"
  ON public.qr_scans FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.staff_referrals s
      WHERE s.referral_code = qr_scans.referral_code
        AND s.staff_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Advertising read qr_scans" ON public.qr_scans;
CREATE POLICY "Advertising read own qr_scans"
  ON public.qr_scans FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'advertising'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.staff_referrals s
      WHERE s.referral_code = qr_scans.referral_code
        AND s.staff_user_id = auth.uid()
    )
  );
