
-- Add new staff roles. ALTER TYPE ADD VALUE cannot be used in the same
-- transaction as its values, so all subsequent code references role::text.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advertising';

-- Helper: any non-user role
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text <> 'user'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_moderate(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','moderator')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_support(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','moderator','support','sales')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_ads(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','advertising')
  )
$$;

CREATE OR REPLACE FUNCTION public.current_plan_tier(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT p.name FROM public.subscriptions s
       JOIN public.subscription_plans p ON p.id = s.plan_id
      WHERE s.user_id = _user_id
        AND s.status = 'active'
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
      ORDER BY p.price_php DESC LIMIT 1),
    'Free'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_business_account(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND verification_status = 'verified'
      AND business_kind IN ('dealer','repair_shop','insurance')
  )
$$;

-- Lock down EXECUTE: revoke from public/anon, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_moderate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_moderate(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_support(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_support(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_manage_ads(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_ads(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.current_plan_tier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_plan_tier(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_business_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_business_account(uuid) TO authenticated;

-- Ad placement + status enums
DO $$ BEGIN
  CREATE TYPE public.ad_placement AS ENUM (
    'homepage_banner','category_banner','listing_sidebar','newsletter','sponsored_post','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_inquiry_status AS ENUM (
    'new','in_review','quoted','won','lost','spam'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ad inquiries table
CREATE TABLE IF NOT EXISTS public.ad_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  company text,
  email text NOT NULL,
  phone text,
  placement public.ad_placement NOT NULL DEFAULT 'other',
  budget_range text,
  start_date date,
  message text NOT NULL,
  status public.ad_inquiry_status NOT NULL DEFAULT 'new',
  assigned_to uuid,
  internal_notes text,
  submitter_user_id uuid,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_inquiries_status_idx ON public.ad_inquiries(status);
CREATE INDEX IF NOT EXISTS ad_inquiries_email_idx ON public.ad_inquiries(lower(email));

ALTER TABLE public.ad_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit
CREATE POLICY "Anyone can submit ad inquiry"
ON public.ad_inquiries FOR INSERT
WITH CHECK (true);

-- Ad staff (admin or advertising) can read all
CREATE POLICY "Ad staff read all inquiries"
ON public.ad_inquiries FOR SELECT
USING (public.can_manage_ads(auth.uid()));

-- Submitter can read their own (signed-in + matching email or user id)
CREATE POLICY "Submitter reads own inquiry"
ON public.ad_inquiries FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    submitter_user_id = auth.uid()
    OR lower(email) = lower(COALESCE((auth.jwt() ->> 'email'),''))
  )
);

-- Ad staff update
CREATE POLICY "Ad staff update inquiries"
ON public.ad_inquiries FOR UPDATE
USING (public.can_manage_ads(auth.uid()))
WITH CHECK (public.can_manage_ads(auth.uid()));

-- Only admin delete
CREATE POLICY "Admins delete inquiries"
ON public.ad_inquiries FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Threaded replies
CREATE TABLE IF NOT EXISTS public.ad_inquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.ad_inquiries(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_name text,
  sender_email text,
  body text NOT NULL,
  from_staff boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_inquiry_messages_inquiry_idx ON public.ad_inquiry_messages(inquiry_id);

ALTER TABLE public.ad_inquiry_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can post a non-staff reply
CREATE POLICY "Anyone can reply to inquiry"
ON public.ad_inquiry_messages FOR INSERT
WITH CHECK (
  from_staff = false
  OR public.can_manage_ads(auth.uid())
);

-- Ad staff read all
CREATE POLICY "Ad staff read all messages"
ON public.ad_inquiry_messages FOR SELECT
USING (public.can_manage_ads(auth.uid()));

-- Submitter reads their thread
CREATE POLICY "Submitter reads own thread"
ON public.ad_inquiry_messages FOR SELECT
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ad_inquiries i
    WHERE i.id = ad_inquiry_messages.inquiry_id
      AND (
        i.submitter_user_id = auth.uid()
        OR lower(i.email) = lower(COALESCE((auth.jwt() ->> 'email'),''))
      )
  )
);

-- updated_at trigger on ad_inquiries
DROP TRIGGER IF EXISTS set_ad_inquiries_updated_at ON public.ad_inquiries;
CREATE TRIGGER set_ad_inquiries_updated_at
BEFORE UPDATE ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Extend account_audit_log INSERT to include moderator/support staff (admin+sales were original)
DROP POLICY IF EXISTS "Staff write audit log" ON public.account_audit_log;
CREATE POLICY "Staff write audit log"
ON public.account_audit_log FOR INSERT
WITH CHECK (auth.uid() = actor_id AND public.can_support(auth.uid()));

-- Allow moderator/support read on audit log + listings + reports + verification_requests
CREATE POLICY "Support read audit log"
ON public.account_audit_log FOR SELECT
USING (public.can_support(auth.uid()));

CREATE POLICY "Support read listings"
ON public.listings FOR SELECT
USING (public.can_support(auth.uid()));

CREATE POLICY "Support read reports"
ON public.reports FOR SELECT
USING (public.can_support(auth.uid()));

CREATE POLICY "Moderators update reports"
ON public.reports FOR UPDATE
USING (public.can_moderate(auth.uid()))
WITH CHECK (public.can_moderate(auth.uid()));

CREATE POLICY "Support read verification requests"
ON public.verification_requests FOR SELECT
USING (public.can_support(auth.uid()));

CREATE POLICY "Moderators update verification requests"
ON public.verification_requests FOR UPDATE
USING (public.can_moderate(auth.uid()))
WITH CHECK (public.can_moderate(auth.uid()));

CREATE POLICY "Moderators update listings"
ON public.listings FOR UPDATE
USING (public.can_moderate(auth.uid()))
WITH CHECK (public.can_moderate(auth.uid()));

CREATE POLICY "Support read profiles"
ON public.profiles FOR SELECT
USING (public.can_support(auth.uid()));
