
-- 1) affiliate_links: hide affiliate_id_env from public/authenticated reads
REVOKE SELECT (affiliate_id_env) ON public.affiliate_links FROM anon, authenticated;

-- 3) profiles: scope sales UPDATE to assigned users only
DROP POLICY IF EXISTS "Sales update account status" ON public.profiles;
CREATE POLICY "Sales update account status"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'sales'::app_role) AND is_sales_assigned_user(auth.uid(), id))
  WITH CHECK (has_role(auth.uid(), 'sales'::app_role) AND is_sales_assigned_user(auth.uid(), id));

-- 4) referral_visits: scope sales reads to their own referral codes
DROP POLICY IF EXISTS "Sales read referral_visits" ON public.referral_visits;
CREATE POLICY "Sales read referral_visits"
  ON public.referral_visits
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND credited_referral_code IN (
      SELECT sr.referral_code
      FROM public.staff_referrals sr
      WHERE sr.staff_user_id = auth.uid()
    )
  );

-- 5) user_roles: scope sales reads to assigned users only
DROP POLICY IF EXISTS "Sales view user_roles" ON public.user_roles;
CREATE POLICY "Sales view user_roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND is_sales_assigned_user(auth.uid(), user_roles.user_id)
  );
