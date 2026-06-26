
-- 1) lead_offers: drop broad buyer SELECT policy (reads go through server functions)
DROP POLICY IF EXISTS "Buyers read their unlocked offers" ON public.lead_offers;

-- 2) payment_method_config: restrict public read to authenticated users only
DROP POLICY IF EXISTS "Public can read enabled methods" ON public.payment_method_config;
CREATE POLICY "Authenticated can read enabled methods"
  ON public.payment_method_config
  FOR SELECT
  TO authenticated
  USING (enabled = true OR has_role(auth.uid(), 'admin'::app_role));

-- 3) staff_referrals: remove advertising full-row read; provide safe directory view
DROP POLICY IF EXISTS "Advertising read staff_referrals" ON public.staff_referrals;

CREATE OR REPLACE VIEW public.staff_referrals_directory
WITH (security_invoker = false) AS
SELECT
  id,
  staff_user_id,
  referral_code,
  full_name,
  active,
  created_at
FROM public.staff_referrals
WHERE
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'advertising'::app_role)
  OR has_role(auth.uid(), 'sales'::app_role)
  OR auth.uid() = staff_user_id;

GRANT SELECT ON public.staff_referrals_directory TO authenticated;
