
DROP POLICY IF EXISTS "Sales view listings" ON public.listings;
CREATE POLICY "Sales view listings"
ON public.listings FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND public.is_sales_assigned_user(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Sales read referral_redemptions" ON public.referral_redemptions;
CREATE POLICY "Sales read referral_redemptions"
ON public.referral_redemptions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = referral_redemptions.staff_referral_id
      AND s.staff_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Sales read user_referrals" ON public.user_referrals;
CREATE POLICY "Sales read user_referrals"
ON public.user_referrals FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = user_referrals.referred_by_staff_id
      AND s.staff_user_id = auth.uid()
  )
);
