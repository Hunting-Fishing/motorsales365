-- Lock is_staff_account on self-insert / self-update
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND is_staff_account = false
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND NOT (verification_status IS DISTINCT FROM (
    SELECT p.verification_status FROM public.profiles p WHERE p.id = auth.uid()
  ))
  AND NOT (verified_at IS DISTINCT FROM (
    SELECT p.verified_at FROM public.profiles p WHERE p.id = auth.uid()
  ))
  AND NOT (is_founding_member IS DISTINCT FROM (
    SELECT p.is_founding_member FROM public.profiles p WHERE p.id = auth.uid()
  ))
  AND NOT (founding_member_number IS DISTINCT FROM (
    SELECT p.founding_member_number FROM public.profiles p WHERE p.id = auth.uid()
  ))
  AND NOT (account_status IS DISTINCT FROM (
    SELECT p.account_status FROM public.profiles p WHERE p.id = auth.uid()
  ))
  AND NOT (is_staff_account IS DISTINCT FROM (
    SELECT p.is_staff_account FROM public.profiles p WHERE p.id = auth.uid()
  ))
);

-- Scope sales role read to their own staff_referrals row, matching "Staff read own promotions"
DROP POLICY IF EXISTS "Sales read staff_promotions" ON public.staff_promotions;
CREATE POLICY "Sales read staff_promotions"
ON public.staff_promotions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = staff_promotions.staff_referral_id
      AND s.staff_user_id = auth.uid()
  )
);
