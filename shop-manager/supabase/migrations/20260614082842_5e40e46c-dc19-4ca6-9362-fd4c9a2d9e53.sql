
DROP POLICY IF EXISTS "Allow authenticated users full access to business_industries" ON public.business_industries;
DROP POLICY IF EXISTS "business_industries_select" ON public.business_industries;
DROP POLICY IF EXISTS "business_industries_insert" ON public.business_industries;
DROP POLICY IF EXISTS "business_industries_modify" ON public.business_industries;

CREATE POLICY "business_industries_select" ON public.business_industries
  FOR SELECT USING (true);
CREATE POLICY "business_industries_insert" ON public.business_industries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "business_industries_modify" ON public.business_industries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

DROP POLICY IF EXISTS "Allow read access to customer_referrals for all users" ON public.customer_referrals;
DROP POLICY IF EXISTS "Allow insert access to customer_referrals for authenticated users" ON public.customer_referrals;
DROP POLICY IF EXISTS "Allow update access to customer_referrals for authenticated users" ON public.customer_referrals;
DROP POLICY IF EXISTS "customer_referrals_shop_scoped" ON public.customer_referrals;

CREATE POLICY "customer_referrals_shop_scoped" ON public.customer_referrals
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_referrals.referrer_id AND c.shop_id = public.get_current_user_shop_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_referrals.referrer_id AND c.shop_id = public.get_current_user_shop_id()));

DROP POLICY IF EXISTS "Allow read access to referral_transactions for all users" ON public.referral_transactions;
DROP POLICY IF EXISTS "Allow insert access to referral_transactions for authenticated users" ON public.referral_transactions;
DROP POLICY IF EXISTS "referral_transactions_shop_scoped" ON public.referral_transactions;

CREATE POLICY "referral_transactions_shop_scoped" ON public.referral_transactions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = referral_transactions.referrer_id AND c.shop_id = public.get_current_user_shop_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = referral_transactions.referrer_id AND c.shop_id = public.get_current_user_shop_id()));

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='diy_bay_rate_history' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.diy_bay_rate_history', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "diy_bay_rate_history_select" ON public.diy_bay_rate_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.diy_bay_rates b WHERE b.id = diy_bay_rate_history.bay_id AND b.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "diy_bay_rate_history_insert" ON public.diy_bay_rate_history
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.diy_bay_rates b WHERE b.id = diy_bay_rate_history.bay_id AND b.shop_id = public.get_current_user_shop_id()));

DROP POLICY IF EXISTS "Allow all operations on discount_audit_log" ON public.discount_audit_log;
DROP POLICY IF EXISTS "discount_audit_log_select" ON public.discount_audit_log;
DROP POLICY IF EXISTS "discount_audit_log_insert" ON public.discount_audit_log;

CREATE POLICY "discount_audit_log_select" ON public.discount_audit_log
  FOR SELECT TO authenticated
  USING (performed_by = auth.uid()::text OR public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY "discount_audit_log_insert" ON public.discount_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
