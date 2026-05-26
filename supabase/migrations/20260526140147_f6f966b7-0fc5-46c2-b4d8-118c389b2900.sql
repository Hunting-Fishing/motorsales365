-- 1) qr_scans: drop email branch
DROP POLICY IF EXISTS "Staff read own qr_scans" ON public.qr_scans;
CREATE POLICY "Staff read own qr_scans"
  ON public.qr_scans
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.referral_code = qr_scans.referral_code
      AND s.staff_user_id = auth.uid()
  ));

-- 2) referral_redemptions: drop email branch
DROP POLICY IF EXISTS "Staff read own redemptions" ON public.referral_redemptions;
CREATE POLICY "Staff read own redemptions"
  ON public.referral_redemptions
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = referral_redemptions.staff_referral_id
      AND s.staff_user_id = auth.uid()
  ));

-- 3) user_referrals: drop email branch
DROP POLICY IF EXISTS "Staff read own credited signups" ON public.user_referrals;
CREATE POLICY "Staff read own credited signups"
  ON public.user_referrals
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = user_referrals.referred_by_staff_id
      AND s.staff_user_id = auth.uid()
  ));

-- 4) payments: also block financial metadata fields on self-insert
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
  );

-- 5) listings.contact_phone: hide from anonymous visitors
REVOKE SELECT (contact_phone) ON public.listings FROM anon;

-- 6) Realtime authorization: default-deny on realtime.messages
-- Our app uses postgres_changes (gated by underlying table RLS), so this
-- denies future broadcast/presence subscriptions until explicitly allowed.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='realtime' AND table_name='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "Default deny realtime channel" ON realtime.messages';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    EXECUTE 'CREATE POLICY "Default deny realtime channel" ON realtime.messages FOR ALL TO authenticated, anon USING (false) WITH CHECK (false)';
  END IF;
END $$;