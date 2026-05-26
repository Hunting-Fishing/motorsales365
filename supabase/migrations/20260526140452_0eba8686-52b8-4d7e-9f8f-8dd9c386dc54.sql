-- 1) Promotions: restrict read to staff
DROP POLICY IF EXISTS "Promotions public read" ON public.promotions;
CREATE POLICY "Staff read promotions"
  ON public.promotions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'sales'::app_role)
  );

-- 2) Provider tow rates: hide notes column from sales role
REVOKE SELECT (notes) ON public.provider_tow_rates FROM authenticated;
-- Owners still see notes via "Owners manage own rates" (ALL on table, column grants ignored by USING).
-- Wait: column-level REVOKE *does* apply to all SELECT regardless of policy. Re-grant to admins via service_role only.
-- Admins read tow rates via the "Admins manage rates" ALL policy + service_role grant which bypasses column ACL.
-- Owners reading their own row need the notes column too — re-grant only to authenticated for non-sales context handled at column level is not possible per-role beyond anon/auth.
-- Simpler: grant notes back to authenticated, and instead drop the "Sales view tow rates" policy entirely.
GRANT SELECT (notes) ON public.provider_tow_rates TO authenticated;
DROP POLICY IF EXISTS "Sales view tow rates" ON public.provider_tow_rates;

-- 3) Subscriptions: validate plan_id is active and org membership
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
    AND EXISTS (
      SELECT 1 FROM public.subscription_plans p
      WHERE p.id = plan_id AND p.active = true
    )
    AND (
      organization_id IS NULL
      OR public.is_org_member(auth.uid(), organization_id)
    )
  );

-- 4) Payments: enforce listing ownership when listing_id is set
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
    AND gross_amount_php IS NULL
    AND prorated_credit_php IS NULL
    AND previous_plan IS NULL
    AND new_plan IS NULL
    AND previous_plan_price_php IS NULL
    AND plan_price_php IS NULL
    AND boost_amount_php IS NULL
    AND addons_amount_php IS NULL
    AND addons_description IS NULL
    AND period_start IS NULL
    AND period_end IS NULL
    AND credit_calculated_at IS NULL
    AND (
      listing_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.listings l
        WHERE l.id = listing_id AND l.user_id = auth.uid()
      )
    )
  );