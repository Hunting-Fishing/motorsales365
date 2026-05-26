-- 1) subscriptions: tighten self-insert
DROP POLICY IF EXISTS "Users insert own subscription" ON public.subscriptions;
CREATE POLICY "Users insert own subscription"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND complimentary = false
    AND discount_percent = 0
    AND stripe_subscription_id IS NULL
    AND stripe_customer_id IS NULL
  );

-- 2) payments: tighten self-insert
DROP POLICY IF EXISTS "Users insert own payments" ON public.payments;
CREATE POLICY "Users insert own payments"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND paid_at IS NULL
    AND amount_php > 0
    AND method IS NULL
    AND reference IS NULL
  );

-- 3) staff_referrals: drop email-based SELECT branch
DROP POLICY IF EXISTS "Staff read own referral row" ON public.staff_referrals;
CREATE POLICY "Staff read own referral row"
  ON public.staff_referrals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = staff_user_id);

-- 4) staff_promotions: drop email-based branch on "Staff read own promotions"
DROP POLICY IF EXISTS "Staff read own promotions" ON public.staff_promotions;
CREATE POLICY "Staff read own promotions"
  ON public.staff_promotions
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = staff_promotions.staff_referral_id
      AND s.staff_user_id = auth.uid()
  ));

-- 5) provider_tow_rates: remove public read (notes column was leaking)
DROP POLICY IF EXISTS "Provider rates public read" ON public.provider_tow_rates;
-- Sales/admins keep read via existing role-policies; owners keep CRUD via "Owners manage own rates".
CREATE POLICY "Sales view tow rates"
  ON public.provider_tow_rates
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'sales'::app_role));