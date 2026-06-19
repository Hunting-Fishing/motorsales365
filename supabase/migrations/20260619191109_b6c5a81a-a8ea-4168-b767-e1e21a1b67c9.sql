
-- 1. Helper: assignment check for sales reps (scoped to users)
CREATE OR REPLACE FUNCTION public.is_sales_assigned_user(_rep uuid, _target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sales_rep_assignments
    WHERE rep_user_id = _rep
      AND active = true
      AND subject_type = 'user'
      AND subject_id = _target_user
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_sales_assigned_user(uuid, uuid) TO authenticated;

-- 2. profiles: replace blanket Sales policy with scoped policy
DROP POLICY IF EXISTS "Sales view all profiles" ON public.profiles;
CREATE POLICY "Sales view assigned profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND public.is_sales_assigned_user(auth.uid(), id)
  );

-- 3. payments: replace blanket Sales policy with scoped policy
DROP POLICY IF EXISTS "Sales view payments" ON public.payments;
CREATE POLICY "Sales view assigned payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND public.is_sales_assigned_user(auth.uid(), user_id)
  );

-- 4. subscriptions: replace blanket Sales policy with scoped policy
DROP POLICY IF EXISTS "Sales view subscriptions" ON public.subscriptions;
CREATE POLICY "Sales view assigned subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND public.is_sales_assigned_user(auth.uid(), user_id)
  );

-- 5. ad_inquiries: remove email-based identity, keep submitter_user_id only
DROP POLICY IF EXISTS "Submitter reads own inquiry" ON public.ad_inquiries;
CREATE POLICY "Submitter reads own inquiry"
  ON public.ad_inquiries FOR SELECT
  TO authenticated
  USING (submitter_user_id IS NOT NULL AND submitter_user_id = auth.uid());

-- 6. ad_inquiry_messages
DROP POLICY IF EXISTS "Submitter reads own thread" ON public.ad_inquiry_messages;
CREATE POLICY "Submitter reads own thread"
  ON public.ad_inquiry_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_inquiries i
      WHERE i.id = ad_inquiry_messages.inquiry_id
        AND i.submitter_user_id = auth.uid()
    )
  );

-- 7. ad_inquiry_audit
DROP POLICY IF EXISTS "Submitter reads own audit" ON public.ad_inquiry_audit;
CREATE POLICY "Submitter reads own audit"
  ON public.ad_inquiry_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_inquiries i
      WHERE i.id = ad_inquiry_audit.inquiry_id
        AND i.submitter_user_id = auth.uid()
    )
  );

-- 8. service_inquiries
DROP POLICY IF EXISTS "Submitter reads own inquiry" ON public.service_inquiries;
CREATE POLICY "Submitter reads own inquiry"
  ON public.service_inquiries FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 9. organization_invites: helper that checks current user's email from auth.users
-- and guards against recycled emails by requiring the invite to be newer than the
-- current user's account creation.
CREATE OR REPLACE FUNCTION public.can_read_org_invite(_invite_email text, _invite_created_at timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = lower(_invite_email)
      AND u.email_confirmed_at IS NOT NULL
      AND _invite_created_at >= u.created_at
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_read_org_invite(text, timestamptz) TO authenticated;

DROP POLICY IF EXISTS "Invitee reads own invite" ON public.organization_invites;
CREATE POLICY "Invitee reads own invite"
  ON public.organization_invites FOR SELECT
  TO authenticated
  USING (public.can_read_org_invite(email, created_at));

-- 10. is_365_staff: remove email-domain shortcut, rely on user_roles only
CREATE OR REPLACE FUNCTION public.is_365_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','moderator')
  );
$$;
