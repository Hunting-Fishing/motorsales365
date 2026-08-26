
-- ============================================================================
-- SOURCE MIGRATION: 20260706060958_d3327508-28b4-441c-8c04-04a1ae4ec6a3.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  now_ts timestamptz := now();
  day_start timestamptz := date_trunc('day', now_ts);
  d7 timestamptz := now_ts - interval '7 days';
  d30 timestamptz := now_ts - interval '30 days';
  h24 timestamptz := now_ts - interval '24 hours';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'users', jsonb_build_object(
      'total', (SELECT count(*) FROM public.profiles),
      'signups', jsonb_build_object(
        'today', (SELECT count(*) FROM public.profiles WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.profiles WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.profiles WHERE created_at >= d30)
      ),
      'verifiedSellers', (SELECT count(*) FROM public.profiles WHERE verification_status = 'verified'),
      'activeAccounts',  (SELECT count(*) FROM public.profiles WHERE coalesce(account_status,'active') = 'active'),
      'foundingMembers', (SELECT count(*) FROM public.profiles WHERE is_founding_member = true)
    ),
    'scans', jsonb_build_object(
      'total', jsonb_build_object(
        'today', (SELECT count(*) FROM public.qr_scans WHERE scanned_at >= day_start),
        'd7',    (SELECT count(*) FROM public.qr_scans WHERE scanned_at >= d7),
        'd30',   (SELECT count(*) FROM public.qr_scans WHERE scanned_at >= d30)
      ),
      'partnerSignups7d', (
        SELECT count(*) FROM public.user_referrals ur
        WHERE ur.signup_date >= d7
          AND (ur.credited_referral_code IS NOT NULL OR ur.first_referral_code IS NOT NULL)
      ),
      'topStaff', (
        SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
          SELECT s.referral_code AS code,
                 coalesce(nullif(s.full_name,''), s.referral_code) AS name,
                 count(q.id)::int AS scans,
                 (SELECT count(*)::int FROM public.user_referrals ur
                    WHERE (ur.credited_referral_code = s.referral_code
                       OR ur.first_referral_code = s.referral_code)
                      AND ur.signup_date >= d30) AS signups
          FROM public.staff_referrals s
          LEFT JOIN public.qr_scans q
            ON q.referral_code = s.referral_code AND q.scanned_at >= d30
          WHERE coalesce(s.active, true)
          GROUP BY s.referral_code, s.full_name
          ORDER BY count(q.id) DESC NULLS LAST
          LIMIT 5
        ) t
      ),
      'topPartners', (
        SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
          SELECT p.referral_code AS code,
                 coalesce(nullif(p.display_name,''), p.referral_code) AS name,
                 count(q.id)::int AS scans,
                 (SELECT count(*)::int FROM public.user_referrals ur
                    WHERE (ur.credited_referral_code = p.referral_code
                       OR ur.first_referral_code = p.referral_code)
                      AND ur.signup_date >= d30) AS signups
          FROM public.partner_program_partners p
          LEFT JOIN public.qr_scans q
            ON q.referral_code = p.referral_code AND q.scanned_at >= d30
          WHERE coalesce(p.active, true)
          GROUP BY p.referral_code, p.display_name
          ORDER BY count(q.id) DESC NULLS LAST
          LIMIT 5
        ) t
      )
    ),
    'productivity', jsonb_build_object(
      'listingsCreated', jsonb_build_object(
        'today', (SELECT count(*) FROM public.listings WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.listings WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.listings WHERE created_at >= d30)
      ),
      'activeListings',  (SELECT count(*) FROM public.listings WHERE status::text = 'active'),
      'pendingPayment',  (SELECT count(*) FROM public.listings WHERE status::text = 'pending_payment'),
      'boostsSold', jsonb_build_object(
        'today', (SELECT count(*) FROM public.listing_boosts WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.listing_boosts WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.listing_boosts WHERE created_at >= d30)
      ),
      'messagesSent', jsonb_build_object(
        'today', (SELECT count(*) FROM public.messages WHERE created_at >= day_start),
        'd7',    (SELECT count(*) FROM public.messages WHERE created_at >= d7),
        'd30',   (SELECT count(*) FROM public.messages WHERE created_at >= d30)
      ),
      'revenue', jsonb_build_object(
        'today', coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid' AND coalesce(paid_at, created_at) >= day_start), 0),
        'd7',    coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid' AND coalesce(paid_at, created_at) >= d7), 0),
        'd30',   coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid' AND coalesce(paid_at, created_at) >= d30), 0)
      ),
      'revenueTotal', coalesce((SELECT sum(amount_php) FROM public.payments WHERE status='paid'), 0)
    ),
    'health', jsonb_build_object(
      'pendingVerifications', (SELECT count(*) FROM public.verification_requests WHERE status = 'pending'),
      'pendingPayments',      (SELECT count(*) FROM public.payments WHERE status = 'pending'),
      'failedPayments24h',    (SELECT count(*) FROM public.payments WHERE status = 'failed' AND created_at >= h24),
      'openReports',          (SELECT count(*) FROM public.reports WHERE status IN ('open','pending','submitted','under_review')),
      'unacknowledgedAlerts', (SELECT count(*) FROM public.ops_alerts WHERE coalesce(acknowledged, false) = false),
      'pendingClaimReviews',  (SELECT count(*) FROM public.business_claim_requests WHERE status = 'pending')
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE INDEX IF NOT EXISTS idx_user_referrals_signup_date
  ON public.user_referrals(signup_date);
CREATE INDEX IF NOT EXISTS idx_user_referrals_first_code
  ON public.user_referrals(first_referral_code);


-- ============================================================================
-- SOURCE MIGRATION: 20260707030403_7ec9381d-6c4b-4bca-899d-b4e894adb6f8.sql
-- ============================================================================
-- Restrict role_permissions SELECT
DROP POLICY IF EXISTS "Authenticated can read role permissions" ON public.role_permissions;

CREATE POLICY "Admins read all role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read their own role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = role_permissions.role
  )
);

-- Scope sales INSERT/UPDATE on subscriptions to assigned users
DROP POLICY IF EXISTS "Sales insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Sales manage subscriptions" ON public.subscriptions;

CREATE POLICY "Sales insert assigned subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'sales'::app_role)
  AND public.is_sales_assigned_user(auth.uid(), user_id)
);

CREATE POLICY "Sales update assigned subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'sales'::app_role)
  AND public.is_sales_assigned_user(auth.uid(), user_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'sales'::app_role)
  AND public.is_sales_assigned_user(auth.uid(), user_id)
);


-- ============================================================================
-- SOURCE MIGRATION: 20260707031454_7349bfbb-6ba5-415f-ba4a-63cd39c90f88.sql
-- ============================================================================
-- Staff Academy article table
CREATE TABLE public.staff_academy_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('playbook','feature','coming-soon','infographic','script','compliance')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','coming-soon','draft')),
  hero_emoji TEXT,
  hero_image_url TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_academy_articles TO authenticated;
GRANT ALL ON public.staff_academy_articles TO service_role;

ALTER TABLE public.staff_academy_articles ENABLE ROW LEVEL SECURITY;

-- Staff (via role or @365motorsales.com email) can read published rows
CREATE POLICY "Staff read published articles"
ON public.staff_academy_articles
FOR SELECT
TO authenticated
USING (
  status <> 'draft'
  AND (
    public.is_staff(auth.uid())
    OR ((auth.jwt() ->> 'email') ILIKE '%@365motorsales.com')
  )
);

-- Admins can do anything
CREATE POLICY "Admins read all articles"
ON public.staff_academy_articles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert articles"
ON public.staff_academy_articles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update articles"
ON public.staff_academy_articles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete articles"
ON public.staff_academy_articles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-bump updated_at (reuse project helper if present, else create local)
CREATE OR REPLACE FUNCTION public.staff_academy_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_staff_academy_touch
BEFORE UPDATE ON public.staff_academy_articles
FOR EACH ROW EXECUTE FUNCTION public.staff_academy_touch_updated_at();

CREATE INDEX idx_staff_academy_sort ON public.staff_academy_articles (sort_order, updated_at DESC);
CREATE INDEX idx_staff_academy_category ON public.staff_academy_articles (category);


-- ============================================================================
-- SOURCE MIGRATION: 20260707032926_14a53ed0-2a8d-464d-ace9-fd0b9348ad26.sql
-- ============================================================================

-- Assets table for Staff Academy media library
CREATE TABLE public.staff_academy_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  kind text NOT NULL CHECK (kind IN ('infographic','script','image','video','document')),
  storage_path text NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  mime_type text,
  file_size bigint,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft')),
  sort_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_academy_assets TO authenticated;
GRANT ALL ON public.staff_academy_assets TO service_role;

ALTER TABLE public.staff_academy_assets ENABLE ROW LEVEL SECURITY;

-- Helper: is this user staff (365motorsales.com email or admin role)?
CREATE OR REPLACE FUNCTION public.is_staff_academy_viewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) LIKE '%@365motorsales.com'
  ) OR public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'moderator')
    OR public.has_role(_user_id, 'support')
    OR public.has_role(_user_id, 'sales');
$$;

CREATE POLICY "Staff read published assets"
  ON public.staff_academy_assets FOR SELECT TO authenticated
  USING (status = 'active' AND public.is_staff_academy_viewer(auth.uid()));

CREATE POLICY "Admins read all assets"
  ON public.staff_academy_assets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert assets"
  ON public.staff_academy_assets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update assets"
  ON public.staff_academy_assets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete assets"
  ON public.staff_academy_assets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER staff_academy_assets_set_updated_at
  BEFORE UPDATE ON public.staff_academy_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX staff_academy_assets_kind_idx ON public.staff_academy_assets (kind);
CREATE INDEX staff_academy_assets_status_idx ON public.staff_academy_assets (status);
CREATE INDEX staff_academy_assets_sort_idx ON public.staff_academy_assets (sort_order);

-- Storage policies for the private bucket
CREATE POLICY "Staff read staff-academy-assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'staff-academy-assets' AND public.is_staff_academy_viewer(auth.uid()));

CREATE POLICY "Admins write staff-academy-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'staff-academy-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update staff-academy-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'staff-academy-assets' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'staff-academy-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete staff-academy-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'staff-academy-assets' AND public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- SOURCE MIGRATION: 20260707035635_7d2b1a07-5394-44db-a776-960b45aa686a.sql
-- ============================================================================

CREATE TABLE public.staff_academy_article_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.staff_academy_articles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created','published','unpublished','status_changed','updated')),
  from_status TEXT,
  to_status TEXT,
  title TEXT,
  slug TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX staff_academy_article_history_article_idx
  ON public.staff_academy_article_history(article_id, created_at DESC);

GRANT SELECT ON public.staff_academy_article_history TO authenticated;
GRANT ALL ON public.staff_academy_article_history TO service_role;

ALTER TABLE public.staff_academy_article_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view article history"
  ON public.staff_academy_article_history
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_staff_academy_article_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_from TEXT;
  v_to TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := CASE WHEN NEW.status = 'active' THEN 'published' ELSE 'created' END;
    v_from := NULL;
    v_to := NEW.status;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'active' THEN
        v_action := 'published';
      ELSIF OLD.status = 'active' THEN
        v_action := 'unpublished';
      ELSE
        v_action := 'status_changed';
      END IF;
      v_from := OLD.status;
      v_to := NEW.status;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.staff_academy_article_history
    (article_id, action, from_status, to_status, title, slug, changed_by, snapshot)
  VALUES (
    NEW.id, v_action, v_from, v_to, NEW.title, NEW.slug, NEW.updated_by,
    jsonb_build_object(
      'title', NEW.title,
      'description', NEW.description,
      'category', NEW.category,
      'status', NEW.status,
      'tags', NEW.tags,
      'sections', NEW.sections,
      'hero_emoji', NEW.hero_emoji,
      'hero_image_url', NEW.hero_image_url
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER staff_academy_articles_history
AFTER INSERT OR UPDATE ON public.staff_academy_articles
FOR EACH ROW EXECUTE FUNCTION public.log_staff_academy_article_change();


-- ============================================================================
-- SOURCE MIGRATION: 20260707040025_b9000316-7857-4be7-b4ff-9b1401174bf6.sql
-- ============================================================================

CREATE TABLE public.staff_academy_article_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES public.staff_academy_articles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX staff_academy_article_views_article_idx
  ON public.staff_academy_article_views(article_id, created_at DESC);
CREATE INDEX staff_academy_article_views_slug_idx
  ON public.staff_academy_article_views(slug, created_at DESC);

GRANT SELECT, INSERT ON public.staff_academy_article_views TO authenticated;
GRANT ALL ON public.staff_academy_article_views TO service_role;

ALTER TABLE public.staff_academy_article_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own view"
  ON public.staff_academy_article_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Admins can read view analytics"
  ON public.staff_academy_article_views
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- SOURCE MIGRATION: 20260707070949_d718892b-ccd8-45c4-a81b-058bb9b75211.sql
-- ============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_signup_intent_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_signup_intent_check
  CHECK (signup_intent IS NULL OR signup_intent = ANY (ARRAY['buyer','private_seller','business','service_provider','internal_staff']));

CREATE TABLE IF NOT EXISTS public.internal_org_settings (
  key text PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_org_settings TO service_role;
ALTER TABLE public.internal_org_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct client access" ON public.internal_org_settings;
CREATE POLICY "No direct client access" ON public.internal_org_settings FOR SELECT USING (false);

INSERT INTO public.internal_org_settings(key, org_id)
VALUES ('canonical_365', 'd45bc407-1510-46e5-9ff2-a9789ad002fa')
ON CONFLICT (key) DO UPDATE SET org_id = EXCLUDED.org_id, updated_at = now();

CREATE OR REPLACE FUNCTION public.canonical_365_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT org_id FROM public.internal_org_settings WHERE key='canonical_365'
$$;

CREATE OR REPLACE FUNCTION public.is_internal_365_email(_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT _email IS NOT NULL AND lower(_email) LIKE '%@365motorsales.com'
$$;

CREATE OR REPLACE FUNCTION public.is_internal_365_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND p.is_staff_account = true
      AND p.parent_org_id = public.canonical_365_org_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
DECLARE
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first text := NULLIF(m->>'first_name', '');
  v_last  text := NULLIF(m->>'last_name', '');
  v_full  text := NULLIF(m->>'full_name', '');
  v_intent text := NULLIF(m->>'signup_intent', '');
  v_business_name text := NULLIF(m->>'business_name', '');
  v_business_address text := NULLIF(m->>'business_address', '');
  v_street_address text := NULLIF(m->>'street_address', '');
  v_postal_code text := NULLIF(m->>'postal_code', '');
  v_business_kind_raw text := NULLIF(m->>'business_kind', '');
  v_business_kind business_kind := NULL;
  v_city text := NULLIF(m->>'signup_city', '');
  v_region text := NULLIF(m->>'signup_region', '');
  v_province text := NULLIF(m->>'signup_province', '');
  v_phone text := NULLIF(m->>'phone', '');
  v_phone_e164 text := NULL;
  v_phone_digits text;
  v_is_business boolean;
  v_seller_type seller_type;
  v_ref_code text := NULLIF(m->>'referral_code','');
  v_src_raw text := lower(NULLIF(m->>'signup_source',''));
  v_signup_source text;
  v_is_internal boolean := public.is_internal_365_email(NEW.email);
  v_canonical_org uuid;
BEGIN
  IF v_is_internal THEN
    v_intent := 'internal_staff';
    v_business_name := NULL;
    v_business_address := NULL;
    v_business_kind := NULL;
    v_canonical_org := public.canonical_365_org_id();
  END IF;

  v_is_business := (NOT v_is_internal) AND v_intent IN ('business','service_provider');
  v_seller_type := CASE WHEN v_is_business THEN 'business'::seller_type ELSE 'private'::seller_type END;

  IF v_full IS NULL AND (v_first IS NOT NULL OR v_last IS NOT NULL) THEN
    v_full := trim(concat_ws(' ', v_first, v_last));
  END IF;
  IF v_full IS NULL THEN v_full := NEW.email; END IF;

  IF v_phone IS NOT NULL THEN
    v_phone_digits := regexp_replace(v_phone, '[^0-9+]', '', 'g');
    IF v_phone_digits LIKE '+%' THEN
      v_phone_e164 := v_phone_digits;
    ELSIF v_phone_digits LIKE '09%' AND length(v_phone_digits) = 11 THEN
      v_phone_e164 := '+63' || substring(v_phone_digits from 2);
    ELSIF v_phone_digits LIKE '9%' AND length(v_phone_digits) = 10 THEN
      v_phone_e164 := '+63' || v_phone_digits;
    ELSIF v_phone_digits LIKE '63%' AND length(v_phone_digits) = 12 THEN
      v_phone_e164 := '+' || v_phone_digits;
    END IF;
  END IF;

  IF v_is_business AND v_business_kind_raw IS NOT NULL THEN
    BEGIN
      v_business_kind := v_business_kind_raw::business_kind;
    EXCEPTION WHEN others THEN
      v_business_kind := NULL;
    END;
  END IF;

  IF v_src_raw IN ('qr','link','direct') THEN
    v_signup_source := v_src_raw;
  ELSIF v_ref_code IS NOT NULL THEN
    v_signup_source := 'link';
  ELSE
    v_signup_source := 'direct';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, first_name, last_name, phone, phone_e164,
    signup_intent, signup_city, signup_region, signup_province,
    street_address, postal_code,
    business_name, business_address, business_region, business_province, business_city, business_postal_code,
    business_kind, seller_type, signup_source,
    is_staff_account, parent_org_id
  ) VALUES (
    NEW.id, v_full, v_first, v_last, v_phone, v_phone_e164,
    v_intent, v_city, v_region, v_province,
    v_street_address, v_postal_code,
    CASE WHEN v_is_business THEN v_business_name END,
    CASE WHEN v_is_business THEN v_business_address END,
    CASE WHEN v_is_business THEN v_region END,
    CASE WHEN v_is_business THEN v_province END,
    CASE WHEN v_is_business THEN v_city END,
    CASE WHEN v_is_business THEN v_postal_code END,
    v_business_kind,
    v_seller_type,
    v_signup_source,
    v_is_internal,
    v_canonical_org
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    signup_intent = COALESCE(EXCLUDED.signup_intent, public.profiles.signup_intent),
    is_staff_account = EXCLUDED.is_staff_account OR public.profiles.is_staff_account,
    parent_org_id = COALESCE(EXCLUDED.parent_org_id, public.profiles.parent_org_id);

  IF v_is_internal AND v_canonical_org IS NOT NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_canonical_org, NEW.id, 'member'::org_role)
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.block_internal_staff_business()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.is_internal_365_staff(NEW.owner_id) THEN
    RAISE EXCEPTION 'Internal 365 MotorSales staff cannot create a separate business. Contact your admin to be added to the team.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_block_internal_staff_business ON public.businesses;
CREATE TRIGGER trg_block_internal_staff_business
BEFORE INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.block_internal_staff_business();

CREATE OR REPLACE FUNCTION public.block_internal_staff_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.id = public.canonical_365_org_id() THEN
    RETURN NEW;
  END IF;
  IF public.is_internal_365_staff(NEW.created_by) THEN
    RAISE EXCEPTION 'Internal 365 MotorSales staff cannot create a separate organization.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_block_internal_staff_org ON public.organizations;
CREATE TRIGGER trg_block_internal_staff_org
BEFORE INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.block_internal_staff_org();

-- Backfill (no seller_type change to avoid unrelated recompute trigger bug)
DO $$
DECLARE
  v_canonical uuid := public.canonical_365_org_id();
  v_admin uuid;
  r record;
BEGIN
  SELECT created_by INTO v_admin FROM public.organizations WHERE id = v_canonical;

  FOR r IN
    SELECT u.id, u.email
    FROM auth.users u
    WHERE lower(u.email) LIKE '%@365motorsales.com'
  LOOP
    UPDATE public.profiles
    SET is_staff_account = true,
        parent_org_id = v_canonical,
        signup_intent = 'internal_staff',
        business_name = NULL,
        business_address = NULL,
        business_region = NULL,
        business_province = NULL,
        business_city = NULL,
        business_postal_code = NULL,
        business_kind = NULL
    WHERE id = r.id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_canonical, r.id, 'member'::org_role)
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    UPDATE public.businesses
    SET status = 'archived', owner_id = v_admin
    WHERE owner_id = r.id;

    UPDATE public.organizations
    SET status = 'archived', created_by = v_admin
    WHERE created_by = r.id AND id <> v_canonical;
  END LOOP;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260707080025_262f0b57-b8aa-4af5-bab2-cfddbda4264d.sql
-- ============================================================================

-- 1. Add manager_user_id column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS manager_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_manager_user_id ON public.profiles(manager_user_id);

-- 2. Helper: canonical 365 admin user id
CREATE OR REPLACE FUNCTION public.canonical_365_admin_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'cd233efe-5023-44dd-abfd-a76601436e97'::uuid;
$$;

-- 3. Backfill: every internal-staff profile (except admin themselves) reports to admin
UPDATE public.profiles
SET manager_user_id = public.canonical_365_admin_id()
WHERE is_staff_account = true
  AND id <> public.canonical_365_admin_id()
  AND manager_user_id IS NULL;

-- 4. Patch handle_new_user: after profile is inserted for an internal-staff signup,
--    ensure manager_user_id defaults to admin (or to raw_user_meta_data.manager_user_id
--    when provided by an admin-driven admin API call).
CREATE OR REPLACE FUNCTION public.set_internal_staff_manager()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := public.canonical_365_admin_id();
  v_meta_mgr uuid;
  v_email text;
BEGIN
  IF NEW.is_staff_account IS NOT TRUE THEN RETURN NEW; END IF;
  IF NEW.id = v_admin THEN RETURN NEW; END IF;
  IF NEW.manager_user_id IS NOT NULL THEN RETURN NEW; END IF;

  BEGIN
    SELECT (raw_user_meta_data->>'manager_user_id')::uuid, email
      INTO v_meta_mgr, v_email
    FROM auth.users WHERE id = NEW.id;
  EXCEPTION WHEN others THEN
    v_meta_mgr := NULL;
  END;

  NEW.manager_user_id := COALESCE(v_meta_mgr, v_admin);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_internal_staff_manager ON public.profiles;
CREATE TRIGGER trg_set_internal_staff_manager
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_internal_staff_manager();


-- ============================================================================
-- SOURCE MIGRATION: 20260707080753_afc8dc03-a367-4712-aa1d-0cb0c4310c7b.sql
-- ============================================================================

CREATE TABLE public.staff_dms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) > 0 AND length(body) <= 4000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_dms_pair ON public.staff_dms (
  LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC
);
CREATE INDEX idx_staff_dms_recipient ON public.staff_dms (recipient_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.staff_dms TO authenticated;
GRANT ALL ON public.staff_dms TO service_role;

ALTER TABLE public.staff_dms ENABLE ROW LEVEL SECURITY;

-- Read: only participants
CREATE POLICY "Participants read staff dms"
  ON public.staff_dms FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Insert: sender is caller AND both parties are internal staff
CREATE POLICY "Staff send staff dms"
  ON public.staff_dms FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = sender_id AND p.is_staff_account = true)
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = recipient_id AND p.is_staff_account = true)
    AND sender_id <> recipient_id
  );

-- Update: recipient can mark read
CREATE POLICY "Recipient marks staff dm read"
  ON public.staff_dms FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_dms;


-- ============================================================================
-- SOURCE MIGRATION: 20260707090829_a2dc61f9-cef9-40f8-a590-f3b5b25216da.sql
-- ============================================================================

-- 1. Attachment columns on staff_dms
ALTER TABLE public.staff_dms
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_size integer;

-- Allow body to be empty when there is an attachment
ALTER TABLE public.staff_dms
  ALTER COLUMN body DROP NOT NULL;

-- Ensure either text or attachment is present
ALTER TABLE public.staff_dms
  DROP CONSTRAINT IF EXISTS staff_dms_body_or_attachment_chk;
ALTER TABLE public.staff_dms
  ADD CONSTRAINT staff_dms_body_or_attachment_chk
  CHECK (
    (body IS NOT NULL AND length(btrim(body)) > 0)
    OR attachment_path IS NOT NULL
  );

-- 2. Storage RLS for the private staff-dm-attachments bucket.
-- Only @365motorsales.com staff, and only into their own {uid}/ folder.
DROP POLICY IF EXISTS "Staff can upload own DM attachments" ON storage.objects;
CREATE POLICY "Staff can upload own DM attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'staff-dm-attachments'
  AND (auth.jwt() ->> 'email') ILIKE '%@365motorsales.com'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Staff can read own DM attachments" ON storage.objects;
CREATE POLICY "Staff can read own DM attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff-dm-attachments'
  AND (auth.jwt() ->> 'email') ILIKE '%@365motorsales.com'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Staff can delete own DM attachments" ON storage.objects;
CREATE POLICY "Staff can delete own DM attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'staff-dm-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- ============================================================================
-- SOURCE MIGRATION: 20260708014445_0fe7ee12-5ca2-4fbf-bc88-607758af62e2.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE MIGRATION: 20260708120839_b73df2c1-3bad-464b-8d0e-2feef373ee6b.sql
-- ============================================================================
ALTER TABLE public.signup_failure_events
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_message text;

CREATE INDEX IF NOT EXISTS idx_signup_failure_error_code
  ON public.signup_failure_events (error_code, created_at DESC)
  WHERE error_code IS NOT NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260708123217_5b3e358c-e539-49de-8754-19d253503b91.sql
-- ============================================================================

-- Register cron token for the signup-failure-alerts hook and schedule it.
INSERT INTO public.internal_cron_tokens (job_name, token)
VALUES ('signup_failure_alerts', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (job_name) DO NOTHING;

-- Unschedule any prior version of this job before rescheduling.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'signup-failure-alerts') THEN
    PERFORM cron.unschedule('signup-failure-alerts');
  END IF;
END $$;

SELECT cron.schedule(
  'signup-failure-alerts',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT value FROM public.site_settings WHERE key = 'app_url') || '/api/public/hooks/signup-failure-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE job_name = 'signup_failure_alerts')
    ),
    body := '{}'::jsonb
  );
  $cron$
);


-- ============================================================================
-- SOURCE MIGRATION: 20260708125611_e1cfedea-54a0-4a13-b001-bd85362cc654.sql
-- ============================================================================

-- 1. profiles: add missing capture columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS barangay text;

-- 2. qr_lead_captures: add user_id link
ALTER TABLE public.qr_lead_captures
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS qr_lead_captures_user_id_idx
  ON public.qr_lead_captures(user_id) WHERE user_id IS NOT NULL;

-- 3. qr_scans: add user_id link
ALTER TABLE public.qr_scans
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS qr_scans_user_id_idx
  ON public.qr_scans(user_id) WHERE user_id IS NOT NULL;

-- 4. referral_visits: promote to attribution table
ALTER TABLE public.referral_visits
  ADD COLUMN IF NOT EXISTS linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_lead_capture_id uuid REFERENCES public.qr_lead_captures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signup_source text;
CREATE INDEX IF NOT EXISTS referral_visits_linked_user_id_idx
  ON public.referral_visits(linked_user_id) WHERE linked_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS referral_visits_qr_lead_capture_id_idx
  ON public.referral_visits(qr_lead_capture_id) WHERE qr_lead_capture_id IS NOT NULL;

-- 5. link_signup_attribution — back-fill visitor → user link everywhere in one call
CREATE OR REPLACE FUNCTION public.link_signup_attribution(
  _visitor_id uuid,
  _user_id uuid,
  _referral_code text DEFAULT NULL,
  _signup_source text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.referral_visits%ROWTYPE;
  scans_linked int := 0;
  leads_linked int := 0;
  visit_updated boolean := false;
  referral_upserted boolean := false;
  effective_code text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_user_id');
  END IF;

  -- Look up the visitor's existing attribution row (if any)
  IF _visitor_id IS NOT NULL THEN
    SELECT * INTO v FROM public.referral_visits WHERE visitor_id = _visitor_id;

    IF FOUND THEN
      UPDATE public.referral_visits
         SET linked_user_id = COALESCE(linked_user_id, _user_id),
             linked_at = COALESCE(linked_at, now()),
             signup_source = COALESCE(_signup_source, signup_source)
       WHERE visitor_id = _visitor_id;
      visit_updated := true;
    END IF;

    -- Back-fill qr_scans for this visitor
    UPDATE public.qr_scans
       SET user_id = _user_id
     WHERE visitor_id = _visitor_id
       AND user_id IS NULL;
    GET DIAGNOSTICS scans_linked = ROW_COUNT;

    -- Back-fill qr_lead_captures for this visitor (visitor_id is text there)
    UPDATE public.qr_lead_captures
       SET user_id = _user_id
     WHERE visitor_id = _visitor_id::text
       AND user_id IS NULL;
    GET DIAGNOSTICS leads_linked = ROW_COUNT;
  END IF;

  -- Determine effective referral code: explicit arg > credited > last > first
  effective_code := COALESCE(
    NULLIF(_referral_code, ''),
    v.credited_referral_code,
    v.last_referral_code,
    v.first_referral_code
  );

  -- Insert or update user_referrals if we have any referral context
  IF effective_code IS NOT NULL THEN
    INSERT INTO public.user_referrals(user_id, first_referral_code, last_referral_code, credited_referral_code)
    VALUES (_user_id, COALESCE(v.first_referral_code, effective_code), COALESCE(v.last_referral_code, effective_code), COALESCE(v.credited_referral_code, effective_code))
    ON CONFLICT (user_id) DO UPDATE
      SET last_referral_code = EXCLUDED.last_referral_code,
          credited_referral_code = COALESCE(public.user_referrals.credited_referral_code, EXCLUDED.credited_referral_code);
    referral_upserted := true;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'visit_updated', visit_updated,
    'scans_linked', scans_linked,
    'leads_linked', leads_linked,
    'referral_upserted', referral_upserted,
    'effective_code', effective_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_signup_attribution(uuid, uuid, text, text) TO authenticated, service_role;

-- 6. Owner read policies so users can see their own linked rows
DROP POLICY IF EXISTS "Users can view their own linked scans" ON public.qr_scans;
CREATE POLICY "Users can view their own linked scans"
  ON public.qr_scans FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own linked lead captures" ON public.qr_lead_captures;
CREATE POLICY "Users can view their own linked lead captures"
  ON public.qr_lead_captures FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own linked referral visits" ON public.referral_visits;
CREATE POLICY "Users can view their own linked referral visits"
  ON public.referral_visits FOR SELECT TO authenticated
  USING (linked_user_id = auth.uid());


-- ============================================================================
-- SOURCE MIGRATION: 20260708153505_f6b6ac7a-c38a-43cb-be5e-2e6be4cacbd3.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_profiles_recompute_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_signup_intent(
      NEW.id,
      'profile_insert',
      'seller_type', NULL::text, NEW.seller_type::text,
      'profile', NEW.id::text
    );
  ELSIF NEW.seller_type IS DISTINCT FROM OLD.seller_type THEN
    PERFORM public.recompute_signup_intent(
      NEW.id,
      'seller_type_changed',
      'seller_type', OLD.seller_type::text, NEW.seller_type::text,
      'profile', NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$function$;


-- ============================================================================
-- SOURCE MIGRATION: 20260708160022_e03fc10a-b6d0-47be-b6d3-5fa49f1190a6.sql
-- ============================================================================

-- Remove email-domain shortcut from staff academy viewer helper.
CREATE OR REPLACE FUNCTION public.is_staff_academy_viewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'moderator')
    OR public.has_role(_user_id, 'support')
    OR public.has_role(_user_id, 'sales');
$$;

-- Rebuild staff-dm-attachments storage policies to use verified staff roles
-- instead of the spoofable JWT email claim.
DROP POLICY IF EXISTS "Staff can upload own DM attachments" ON storage.objects;
CREATE POLICY "Staff can upload own DM attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'staff-dm-attachments'
  AND public.is_staff_academy_viewer(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Staff can read own DM attachments" ON storage.objects;
CREATE POLICY "Staff can read own DM attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff-dm-attachments'
  AND public.is_staff_academy_viewer(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- ============================================================================
-- SOURCE MIGRATION: 20260709023324_24974e61-13ff-43ae-bf62-3a0e6ecc181a.sql
-- ============================================================================

-- ============ franchise_tiers ============
CREATE TABLE public.franchise_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  monthly_fee_cents INTEGER NOT NULL DEFAULT 0,
  setup_fee_cents INTEGER NOT NULL DEFAULT 0,
  parts_discount_bps INTEGER NOT NULL DEFAULT 0,
  ad_discount_bps INTEGER NOT NULL DEFAULT 0,
  includes_shop_manager BOOLEAN NOT NULL DEFAULT false,
  includes_inventory BOOLEAN NOT NULL DEFAULT false,
  includes_shared_crm BOOLEAN NOT NULL DEFAULT false,
  branding_rights TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.franchise_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.franchise_tiers TO authenticated;
GRANT ALL ON public.franchise_tiers TO service_role;

ALTER TABLE public.franchise_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tiers"
  ON public.franchise_tiers FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage tiers"
  ON public.franchise_tiers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_franchise_tiers_updated_at
  BEFORE UPDATE ON public.franchise_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ franchise_applications ============
CREATE TABLE public.franchise_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  business_name TEXT NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  city TEXT,
  province TEXT,
  tier_slug TEXT NOT NULL,
  shop_type TEXT,
  years_in_business INTEGER,
  staff_count INTEGER,
  monthly_parts_spend_cents INTEGER,
  existing_brands TEXT[] DEFAULT '{}',
  website_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_review','info_requested','approved','rejected')),
  assigned_tier_slug TEXT,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_franchise_apps_user ON public.franchise_applications(user_id);
CREATE INDEX idx_franchise_apps_email ON public.franchise_applications(lower(contact_email));
CREATE INDEX idx_franchise_apps_status ON public.franchise_applications(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.franchise_applications TO authenticated;
GRANT INSERT ON public.franchise_applications TO anon;
GRANT ALL ON public.franchise_applications TO service_role;

ALTER TABLE public.franchise_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an application"
  ON public.franchise_applications FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND assigned_tier_slug IS NULL
    AND reviewer_id IS NULL
    AND reviewer_notes IS NULL
    AND decided_at IS NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Owners view their own applications"
  ON public.franchise_applications FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid()
      OR lower(contact_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );

CREATE POLICY "Admins view all applications"
  ON public.franchise_applications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update applications"
  ON public.franchise_applications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete applications"
  ON public.franchise_applications FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_franchise_apps_updated_at
  BEFORE UPDATE ON public.franchise_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ franchise_memberships ============
CREATE SEQUENCE IF NOT EXISTS public.franchise_member_number_seq START 1001;

CREATE TABLE public.franchise_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.franchise_applications(id) ON DELETE SET NULL,
  tier_slug TEXT NOT NULL,
  member_number TEXT NOT NULL UNIQUE
    DEFAULT ('365-' || lpad(nextval('public.franchise_member_number_seq')::text, 5, '0')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  renews_at TIMESTAMPTZ,
  ad_discount_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_franchise_memberships_user ON public.franchise_memberships(user_id);
CREATE INDEX idx_franchise_memberships_status ON public.franchise_memberships(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.franchise_memberships TO authenticated;
GRANT ALL ON public.franchise_memberships TO service_role;

ALTER TABLE public.franchise_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own membership"
  ON public.franchise_memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all memberships"
  ON public.franchise_memberships FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage memberships"
  ON public.franchise_memberships FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_franchise_memberships_updated_at
  BEFORE UPDATE ON public.franchise_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ franchise_application_messages ============
CREATE TABLE public.franchise_application_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.franchise_applications(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_franchise_app_messages_app ON public.franchise_application_messages(application_id, created_at);

GRANT SELECT, INSERT ON public.franchise_application_messages TO authenticated;
GRANT ALL ON public.franchise_application_messages TO service_role;

ALTER TABLE public.franchise_application_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants and admins view messages"
  ON public.franchise_application_messages FOR SELECT
  USING (
    (
      NOT is_internal
      AND EXISTS (
        SELECT 1 FROM public.franchise_applications a
        WHERE a.id = application_id
          AND (
            a.user_id = auth.uid()
            OR lower(a.contact_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
          )
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Applicants and admins post messages"
  ON public.franchise_application_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        NOT is_internal
        AND EXISTS (
          SELECT 1 FROM public.franchise_applications a
          WHERE a.id = application_id
            AND (
              a.user_id = auth.uid()
              OR lower(a.contact_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
            )
        )
      )
    )
  );

-- ============ Seed default tiers ============
INSERT INTO public.franchise_tiers
  (slug, name, tagline, monthly_fee_cents, setup_fee_cents, parts_discount_bps, ad_discount_bps,
   includes_shop_manager, includes_inventory, includes_shared_crm, branding_rights, features, is_active, sort_order)
VALUES
  ('partner',
   '365 Partner',
   'Keep your brand. Join the network.',
   0, 0, 500, 1000,
   true, true, true,
   'Independent shop keeps its own name and branding. Displays a "365 Verified Partner" badge on the 365 marketplace and in-store kit.',
   '["Verified Partner badge on 365 marketplace","5% network discount on parts sourced via 365","10% off 365 advertising & boosts","Shop Manager + Inventory software included","Shared customer CRM across partner network","Priority placement in local search"]'::jsonb,
   true, 10),
  ('franchise',
   '365 Franchise',
   'Operate as a full 365 network shop.',
   0, 0, 1500, 2500,
   true, true, true,
   'Shop operates under the 365 brand (co-branded signage, uniforms, marketing). Full territory support and lead routing.',
   '["Co-branded 365 signage, uniforms & marketing kit","15% network discount on parts sourced via 365","25% off 365 advertising & boosts","Shop Manager + Inventory + Shared CRM","Real-time network stock visibility","Lead routing from the 365 marketplace","Territory support & onboarding manager","Franchise trust badge and featured directory listing"]'::jsonb,
   true, 20);


-- ============================================================================
-- SOURCE MIGRATION: 20260709025751_5a50c373-3640-4199-a6fc-e1fe4ebd7a9d.sql
-- ============================================================================

-- 1. Extend businesses & inventory items for network visibility
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS expose_inventory_to_network boolean NOT NULL DEFAULT false;

ALTER TABLE public.business_inventory_items
  ADD COLUMN IF NOT EXISTS price numeric(12,2),
  ADD COLUMN IF NOT EXISTS catalog_part_id uuid REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS network_visible boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS business_inv_sku_lower_idx
  ON public.business_inventory_items (lower(sku)) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS business_inv_catalog_idx
  ON public.business_inventory_items (catalog_part_id) WHERE catalog_part_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS business_inv_network_idx
  ON public.business_inventory_items (business_id) WHERE active AND network_visible;

-- 2. Column-restricted public read on inventory items (no cost, no location, no notes exposed)
GRANT SELECT (id, business_id, sku, name, category, unit, qty_on_hand,
              price, catalog_part_id, active, network_visible, updated_at)
  ON public.business_inventory_items TO anon, authenticated;

DROP POLICY IF EXISTS "inv: public network read" ON public.business_inventory_items;
CREATE POLICY "inv: public network read"
  ON public.business_inventory_items FOR SELECT
  TO anon, authenticated
  USING (
    active
    AND network_visible
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.expose_inventory_to_network
        AND b.status = 'active'
    )
  );

-- 3. Public view joining shop location info for the network stock feed
DROP VIEW IF EXISTS public.network_stock;
CREATE VIEW public.network_stock
WITH (security_invoker = on) AS
SELECT
  i.id,
  i.business_id,
  i.sku,
  i.name,
  i.category,
  i.unit,
  i.qty_on_hand,
  i.price,
  i.catalog_part_id,
  i.updated_at,
  b.name       AS business_name,
  b.slug       AS business_slug,
  b.city,
  b.province,
  b.region,
  b.lat,
  b.lng
FROM public.business_inventory_items i
JOIN public.businesses b ON b.id = i.business_id
WHERE i.active
  AND i.network_visible
  AND b.expose_inventory_to_network
  AND b.status = 'active';

GRANT SELECT ON public.network_stock TO anon, authenticated;

-- 4. Realtime for live stock updates
ALTER TABLE public.business_inventory_items REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'business_inventory_items'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.business_inventory_items';
  END IF;
END $$;

-- 5. Customer inquiries against a specific shop's stocked part
CREATE TABLE IF NOT EXISTS public.network_part_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.business_inventory_items(id) ON DELETE SET NULL,
  sku text,
  part_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  requester_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','fulfilled','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.network_part_inquiries TO authenticated;
GRANT INSERT ON public.network_part_inquiries TO anon;
GRANT ALL ON public.network_part_inquiries TO service_role;

ALTER TABLE public.network_part_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "npi: anyone insert"
  ON public.network_part_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.expose_inventory_to_network
        AND b.status = 'active'
    )
  );

CREATE POLICY "npi: requester read own"
  ON public.network_part_inquiries FOR SELECT
  TO authenticated
  USING (requester_user_id = auth.uid());

CREATE POLICY "npi: shop members read"
  ON public.network_part_inquiries FOR SELECT
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "npi: shop managers update"
  ON public.network_part_inquiries FOR UPDATE
  TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'::business_staff_role))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'::business_staff_role));

CREATE INDEX IF NOT EXISTS npi_business_idx ON public.network_part_inquiries(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS npi_requester_idx ON public.network_part_inquiries(requester_user_id) WHERE requester_user_id IS NOT NULL;

CREATE TRIGGER trg_npi_updated
  BEFORE UPDATE ON public.network_part_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- SOURCE MIGRATION: 20260709031605_e6ef502c-ccd3-4729-82ef-0126d7982b97.sql
-- ============================================================================

-- Migrate legacy status values to the new workflow vocabulary
ALTER TABLE public.network_part_inquiries DROP CONSTRAINT IF EXISTS network_part_inquiries_status_check;

UPDATE public.network_part_inquiries
SET status = 'pending'
WHERE status IN ('new','contacted');

ALTER TABLE public.network_part_inquiries
  ALTER COLUMN status SET DEFAULT 'pending',
  ADD CONSTRAINT network_part_inquiries_status_check
    CHECK (status IN ('pending','accepted','rejected','fulfilled','closed'));

-- Response tracking columns
ALTER TABLE public.network_part_inquiries
  ADD COLUMN IF NOT EXISTS response_note text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Auto-stamp responded_at/responded_by when status changes away from pending
CREATE OR REPLACE FUNCTION public.stamp_network_inquiry_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending' THEN
    IF NEW.responded_at IS NULL OR NEW.responded_at = OLD.responded_at THEN
      NEW.responded_at := now();
    END IF;
    IF NEW.responded_by IS NULL THEN
      NEW.responded_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_npi_stamp_response ON public.network_part_inquiries;
CREATE TRIGGER trg_npi_stamp_response
  BEFORE UPDATE ON public.network_part_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.stamp_network_inquiry_response();

CREATE INDEX IF NOT EXISTS npi_status_idx
  ON public.network_part_inquiries(business_id, status, created_at DESC);


-- ============================================================================
-- SOURCE MIGRATION: 20260709032120_5b7ded67-d4e9-469d-a33c-0eb42fc15732.sql
-- ============================================================================

ALTER TABLE public.network_part_inquiries
  ADD COLUMN IF NOT EXISTS fulfilled_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS fulfilled_quantity numeric(12,2),
  ADD COLUMN IF NOT EXISTS fulfilled_eta timestamptz,
  ADD COLUMN IF NOT EXISTS fulfilled_message text;


-- ============================================================================
-- SOURCE MIGRATION: 20260709032612_de807014-2081-45d2-aeb9-d87eaaf84cfa.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_network_inquiry_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz_name text;
  biz_slug text;
BEGIN
  SELECT name, slug INTO biz_name, biz_slug FROM public.businesses WHERE id = NEW.business_id;

  INSERT INTO public.user_notifications
    (user_id, category, title, body, link_url, entity_type, entity_id, metadata)
  SELECT
    s.user_id,
    'network_inquiry',
    'New parts request: ' || NEW.part_name,
    coalesce(NEW.contact_name, 'A customer') ||
      ' requested ' || NEW.quantity || ' × ' || NEW.part_name ||
      coalesce(' (SKU ' || NEW.sku || ')', ''),
    '/dashboard/business/' || NEW.business_id::text || '/inventory',
    'network_part_inquiry',
    NEW.id,
    jsonb_build_object(
      'business_id', NEW.business_id,
      'business_name', biz_name,
      'status', NEW.status
    )
  FROM public.business_staff s
  WHERE s.business_id = NEW.business_id
    AND s.active
    AND s.role IN ('owner','manager');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_npi_notify_created ON public.network_part_inquiries;
CREATE TRIGGER trg_npi_notify_created
  AFTER INSERT ON public.network_part_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.notify_network_inquiry_created();


CREATE OR REPLACE FUNCTION public.notify_network_inquiry_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz_name text;
  status_label text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.requester_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO biz_name FROM public.businesses WHERE id = NEW.business_id;
  status_label := initcap(NEW.status);

  INSERT INTO public.user_notifications
    (user_id, category, title, body, link_url, entity_type, entity_id, metadata)
  VALUES (
    NEW.requester_user_id,
    'network_inquiry',
    status_label || ': ' || NEW.part_name,
    coalesce(biz_name, 'The shop') ||
      ' marked your request for ' || NEW.part_name || ' as ' || NEW.status ||
      coalesce('. ' || NEW.response_note, '') ||
      coalesce('. ' || NEW.fulfilled_message, ''),
    '/parts/my-requests',
    'network_part_inquiry',
    NEW.id,
    jsonb_build_object(
      'business_id', NEW.business_id,
      'business_name', biz_name,
      'status', NEW.status,
      'fulfilled_price', NEW.fulfilled_price,
      'fulfilled_eta', NEW.fulfilled_eta
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_npi_notify_status ON public.network_part_inquiries;
CREATE TRIGGER trg_npi_notify_status
  AFTER UPDATE ON public.network_part_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.notify_network_inquiry_status_change();


-- ============================================================================
-- SOURCE MIGRATION: 20260709033210_c4809a08-9c0c-4d61-ba3a-e8ac506f4506.sql
-- ============================================================================

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS network_exposure_status text NOT NULL DEFAULT 'none'
    CHECK (network_exposure_status IN ('none','pending','approved','revoked')),
  ADD COLUMN IF NOT EXISTS network_exposure_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS network_exposure_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS network_exposure_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS network_exposure_review_note text;

CREATE INDEX IF NOT EXISTS businesses_network_exposure_status_idx
  ON public.businesses (network_exposure_status)
  WHERE network_exposure_status <> 'none';

DROP VIEW IF EXISTS public.network_stock;
CREATE VIEW public.network_stock
WITH (security_invoker = on) AS
SELECT
  i.id, i.business_id, i.sku, i.name, i.category, i.unit,
  i.qty_on_hand, i.price, i.catalog_part_id, i.updated_at,
  b.name AS business_name, b.slug AS business_slug,
  b.city, b.province, b.region, b.lat, b.lng
FROM public.business_inventory_items i
JOIN public.businesses b ON b.id = i.business_id
WHERE i.active
  AND i.network_visible
  AND b.expose_inventory_to_network
  AND b.network_exposure_status = 'approved'
  AND b.status = 'active';

GRANT SELECT ON public.network_stock TO anon, authenticated;

DROP POLICY IF EXISTS "inv: public network read" ON public.business_inventory_items;
CREATE POLICY "inv: public network read"
  ON public.business_inventory_items FOR SELECT
  TO anon, authenticated
  USING (
    active
    AND network_visible
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.expose_inventory_to_network
        AND b.network_exposure_status = 'approved'
        AND b.status = 'active'
    )
  );

DROP POLICY IF EXISTS "npi: anyone insert" ON public.network_part_inquiries;
CREATE POLICY "npi: anyone insert"
  ON public.network_part_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.expose_inventory_to_network
        AND b.network_exposure_status = 'approved'
        AND b.status = 'active'
    )
  );

CREATE TABLE IF NOT EXISTS public.business_network_exposure_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN (
    'requested','approved','rejected','revoked',
    'owner_enabled','owner_disabled','reapplied'
  )),
  previous_status text,
  new_status text,
  previous_expose boolean,
  new_expose boolean,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.business_network_exposure_audit TO authenticated;
GRANT ALL ON public.business_network_exposure_audit TO service_role;

ALTER TABLE public.business_network_exposure_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bnea: members read"
  ON public.business_network_exposure_audit FOR SELECT
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "bnea: admin read"
  ON public.business_network_exposure_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS bnea_business_created_idx
  ON public.business_network_exposure_audit (business_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.request_network_exposure(
  _business_id uuid,
  _expose boolean,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_status text;
  prev_expose boolean;
  next_status text;
  action_name text;
BEGIN
  IF NOT public.has_business_role(auth.uid(), _business_id, 'manager'::business_staff_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT network_exposure_status, expose_inventory_to_network
    INTO prev_status, prev_expose
  FROM public.businesses
  WHERE id = _business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  IF _expose THEN
    IF prev_status = 'approved' THEN
      next_status := 'approved';
      action_name := 'owner_enabled';
    ELSE
      next_status := 'pending';
      action_name := CASE WHEN prev_status IN ('rejected','revoked') THEN 'reapplied' ELSE 'requested' END;
    END IF;
  ELSE
    next_status := CASE WHEN prev_status = 'approved' THEN 'approved' ELSE 'none' END;
    action_name := 'owner_disabled';
  END IF;

  UPDATE public.businesses
     SET expose_inventory_to_network = _expose,
         network_exposure_status = next_status,
         network_exposure_requested_at = CASE
           WHEN _expose AND next_status = 'pending' THEN now()
           ELSE network_exposure_requested_at
         END
   WHERE id = _business_id;

  INSERT INTO public.business_network_exposure_audit
    (business_id, actor_id, action, previous_status, new_status, previous_expose, new_expose, note)
  VALUES
    (_business_id, auth.uid(), action_name, prev_status, next_status, prev_expose, _expose, _note);

  RETURN jsonb_build_object('status', next_status, 'expose', _expose);
END;
$$;

REVOKE ALL ON FUNCTION public.request_network_exposure(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_network_exposure(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_network_exposure(
  _business_id uuid,
  _decision text,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_status text;
  prev_expose boolean;
  next_status text;
  action_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _decision NOT IN ('approve','reject','revoke') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;

  SELECT network_exposure_status, expose_inventory_to_network
    INTO prev_status, prev_expose
  FROM public.businesses
  WHERE id = _business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  IF _decision = 'approve' THEN
    next_status := 'approved';
    action_name := 'approved';
  ELSIF _decision = 'reject' THEN
    next_status := CASE WHEN prev_status = 'pending' THEN 'none' ELSE prev_status END;
    action_name := 'rejected';
  ELSE
    next_status := 'revoked';
    action_name := 'revoked';
  END IF;

  UPDATE public.businesses
     SET network_exposure_status = next_status,
         network_exposure_reviewed_at = now(),
         network_exposure_reviewed_by = auth.uid(),
         network_exposure_review_note = _note,
         expose_inventory_to_network = CASE
           WHEN _decision = 'approve' THEN expose_inventory_to_network
           ELSE false
         END
   WHERE id = _business_id;

  INSERT INTO public.business_network_exposure_audit
    (business_id, actor_id, action, previous_status, new_status, previous_expose, new_expose, note)
  VALUES
    (_business_id, auth.uid(), action_name, prev_status, next_status, prev_expose,
     CASE WHEN _decision = 'approve' THEN prev_expose ELSE false END, _note);

  RETURN jsonb_build_object('status', next_status);
END;
$$;

REVOKE ALL ON FUNCTION public.review_network_exposure(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_network_exposure(uuid, text, text) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260709033911_3dc415e7-4ec3-47e8-bafa-e2dc520d5f34.sql
-- ============================================================================

ALTER TABLE public.network_part_inquiries
  ADD COLUMN IF NOT EXISTS reserved_quantity numeric(12,2),
  ADD COLUMN IF NOT EXISTS reserved_until timestamptz,
  ADD COLUMN IF NOT EXISTS reserved_item_id uuid REFERENCES public.business_inventory_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS npi_active_reservation_idx
  ON public.network_part_inquiries (reserved_item_id, reserved_until)
  WHERE reserved_item_id IS NOT NULL
    AND reserved_until IS NOT NULL
    AND status = 'accepted';

-- Sum of live holds for a given inventory item
CREATE OR REPLACE FUNCTION public.active_reservation_qty(_item_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(reserved_quantity), 0)::numeric
  FROM public.network_part_inquiries
  WHERE reserved_item_id = _item_id
    AND status = 'accepted'
    AND reserved_until IS NOT NULL
    AND reserved_until > now();
$$;

GRANT EXECUTE ON FUNCTION public.active_reservation_qty(uuid) TO anon, authenticated;

-- Rebuild public feed to expose available_qty (on-hand minus live holds)
DROP VIEW IF EXISTS public.network_stock;
CREATE VIEW public.network_stock
WITH (security_invoker = on) AS
SELECT
  i.id, i.business_id, i.sku, i.name, i.category, i.unit,
  i.qty_on_hand,
  GREATEST(i.qty_on_hand - public.active_reservation_qty(i.id), 0) AS available_qty,
  public.active_reservation_qty(i.id) AS reserved_qty,
  i.price, i.catalog_part_id, i.updated_at,
  b.name AS business_name, b.slug AS business_slug,
  b.city, b.province, b.region, b.lat, b.lng
FROM public.business_inventory_items i
JOIN public.businesses b ON b.id = i.business_id
WHERE i.active
  AND i.network_visible
  AND b.expose_inventory_to_network
  AND b.network_exposure_status = 'approved'
  AND b.status = 'active';

GRANT SELECT ON public.network_stock TO anon, authenticated;

-- Manager-only RPC to reserve stock for a specific inquiry
CREATE OR REPLACE FUNCTION public.reserve_network_inquiry(
  _inquiry_id uuid,
  _business_id uuid,
  _quantity numeric,
  _hours integer,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inq record;
  item record;
  other_reserved numeric;
  hold_until timestamptz;
BEGIN
  IF NOT public.has_business_role(auth.uid(), _business_id, 'manager'::business_staff_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _quantity IS NULL OR _quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  IF _hours IS NULL OR _hours <= 0 OR _hours > 168 THEN
    RAISE EXCEPTION 'Hold window must be between 1 and 168 hours';
  END IF;

  SELECT * INTO inq
  FROM public.network_part_inquiries
  WHERE id = _inquiry_id AND business_id = _business_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inquiry not found';
  END IF;

  IF inq.item_id IS NULL THEN
    RAISE EXCEPTION 'Inquiry is not linked to a specific stock item';
  END IF;

  SELECT id, qty_on_hand INTO item
  FROM public.business_inventory_items
  WHERE id = inq.item_id AND business_id = _business_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  -- Sum other active holds on this item excluding the current inquiry
  SELECT COALESCE(SUM(reserved_quantity), 0)::numeric INTO other_reserved
  FROM public.network_part_inquiries
  WHERE reserved_item_id = item.id
    AND id <> _inquiry_id
    AND status = 'accepted'
    AND reserved_until IS NOT NULL
    AND reserved_until > now();

  IF _quantity > (item.qty_on_hand - other_reserved) THEN
    RAISE EXCEPTION 'Only % available after existing holds', (item.qty_on_hand - other_reserved);
  END IF;

  hold_until := now() + make_interval(hours => _hours);

  UPDATE public.network_part_inquiries
     SET status = 'accepted',
         reserved_item_id = item.id,
         reserved_quantity = _quantity,
         reserved_until = hold_until,
         response_note = COALESCE(_note, response_note),
         responded_at = now(),
         responded_by = auth.uid()
   WHERE id = _inquiry_id;

  RETURN jsonb_build_object(
    'reserved_quantity', _quantity,
    'reserved_until', hold_until
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_network_inquiry(uuid, uuid, numeric, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_network_inquiry(uuid, uuid, numeric, integer, text) TO authenticated;

-- Release helper: clear reservation fields (used when status leaves 'accepted')
CREATE OR REPLACE FUNCTION public.release_network_inquiry(
  _inquiry_id uuid,
  _business_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_business_role(auth.uid(), _business_id, 'manager'::business_staff_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.network_part_inquiries
     SET reserved_quantity = NULL,
         reserved_until = NULL,
         reserved_item_id = NULL,
         responded_at = now(),
         responded_by = auth.uid()
   WHERE id = _inquiry_id AND business_id = _business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.release_network_inquiry(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_network_inquiry(uuid, uuid) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260709034512_8a7efe1e-4333-424c-bb42-05bb9524ae1c.sql
-- ============================================================================

ALTER TABLE public.business_inventory_items
  ADD COLUMN IF NOT EXISTS brand text;

GRANT SELECT (brand) ON public.business_inventory_items TO anon, authenticated;

CREATE INDEX IF NOT EXISTS business_inv_category_lower_idx
  ON public.business_inventory_items (lower(category)) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS business_inv_brand_lower_idx
  ON public.business_inventory_items (lower(brand)) WHERE brand IS NOT NULL;

DROP VIEW IF EXISTS public.network_stock;
CREATE VIEW public.network_stock
WITH (security_invoker = on) AS
SELECT
  i.id, i.business_id, i.sku, i.name, i.category, i.brand, i.unit,
  i.qty_on_hand,
  GREATEST(i.qty_on_hand - public.active_reservation_qty(i.id), 0) AS available_qty,
  public.active_reservation_qty(i.id) AS reserved_qty,
  i.price, i.catalog_part_id, i.updated_at,
  b.name AS business_name, b.slug AS business_slug,
  b.city, b.province, b.region, b.lat, b.lng,
  c.compatible_makes,
  c.compatible_models,
  c.year_min,
  c.year_max
FROM public.business_inventory_items i
JOIN public.businesses b ON b.id = i.business_id
LEFT JOIN public.parts_catalog c ON c.id = i.catalog_part_id
WHERE i.active
  AND i.network_visible
  AND b.expose_inventory_to_network
  AND b.network_exposure_status = 'approved'
  AND b.status = 'active';

GRANT SELECT ON public.network_stock TO anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260709050925_918c4bd8-4b0a-4918-8562-62b2489289d0.sql
-- ============================================================================

ALTER TABLE public.franchise_memberships
  DROP CONSTRAINT IF EXISTS franchise_memberships_status_check;
ALTER TABLE public.franchise_memberships
  ADD CONSTRAINT franchise_memberships_status_check
  CHECK (status IN ('pending_payment','active','past_due','suspended','cancelled'));

ALTER TABLE public.franchise_memberships
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS pending_tier_slug TEXT,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_franchise_memberships_stripe_sub
  ON public.franchise_memberships(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.franchise_tiers
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_monthly_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_setup_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_synced_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.list_public_partners(
  _tier_slug TEXT DEFAULT NULL,
  _province TEXT DEFAULT NULL,
  _limit INT DEFAULT 60
)
RETURNS TABLE (
  membership_id UUID,
  tier_slug TEXT,
  tier_name TEXT,
  member_number TEXT,
  started_at TIMESTAMPTZ,
  business_id UUID,
  business_name TEXT,
  business_slug TEXT,
  city TEXT,
  province TEXT,
  logo_url TEXT,
  cover_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id AS membership_id,
    m.tier_slug,
    t.name AS tier_name,
    m.member_number,
    m.started_at,
    b.id AS business_id,
    b.name AS business_name,
    b.slug AS business_slug,
    b.city,
    b.province,
    b.logo_url,
    b.cover_url
  FROM public.franchise_memberships m
  JOIN public.businesses b ON b.id = m.business_id
  LEFT JOIN public.franchise_tiers t ON t.slug = m.tier_slug
  WHERE m.status = 'active'
    AND m.business_id IS NOT NULL
    AND b.status = 'active'
    AND (_tier_slug IS NULL OR m.tier_slug = _tier_slug)
    AND (_province IS NULL OR lower(b.province) = lower(_province))
  ORDER BY t.sort_order NULLS LAST, m.started_at DESC
  LIMIT GREATEST(1, LEAST(200, _limit));
$$;

GRANT EXECUTE ON FUNCTION public.list_public_partners(TEXT, TEXT, INT) TO anon, authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260709060552_123adf7e-1ad8-41e9-b69a-a952324aa074.sql
-- ============================================================================

CREATE TABLE public.franchise_application_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.franchise_applications(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('approve','reject','request_info','in_review','bulk_approve','tier_change','note_update')),
  from_status TEXT,
  to_status TEXT,
  from_tier TEXT,
  to_tier TEXT,
  reviewer_notes TEXT,
  message_to_applicant TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_franchise_app_audit_app ON public.franchise_application_audit(application_id, created_at DESC);
CREATE INDEX idx_franchise_app_audit_actor ON public.franchise_application_audit(actor_id);

GRANT SELECT ON public.franchise_application_audit TO authenticated;
GRANT ALL ON public.franchise_application_audit TO service_role;

ALTER TABLE public.franchise_application_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all franchise audit entries"
ON public.franchise_application_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Applicants can view their own franchise audit entries"
ON public.franchise_application_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.franchise_applications fa
    WHERE fa.id = franchise_application_audit.application_id
      AND fa.user_id = auth.uid()
  )
);


-- ============================================================================
-- SOURCE MIGRATION: 20260710001100_9dd483f0-8801-42c9-b17e-cce04dd856b5.sql
-- ============================================================================

-- 1. Club membership roster: drop broad public read policy.
-- Public UI now shows only the aggregate member_count from the clubs row.
DROP POLICY IF EXISTS "Public reads members of active clubs" ON public.club_members;

-- 2. Franchise: replace spoofable JWT-email match with a verified auth.users email join.
CREATE OR REPLACE FUNCTION public.current_user_owns_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) = lower(coalesce(_email, ''))
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_owns_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_owns_email(text) TO authenticated;

DROP POLICY IF EXISTS "Owners view their own applications" ON public.franchise_applications;
CREATE POLICY "Owners view their own applications"
ON public.franchise_applications
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR public.current_user_owns_email(contact_email)
  )
);

DROP POLICY IF EXISTS "Applicants and admins view messages" ON public.franchise_application_messages;
CREATE POLICY "Applicants and admins view messages"
ON public.franchise_application_messages
FOR SELECT
TO authenticated
USING (
  (
    NOT is_internal
    AND EXISTS (
      SELECT 1
      FROM public.franchise_applications a
      WHERE a.id = franchise_application_messages.application_id
        AND (
          a.user_id = auth.uid()
          OR public.current_user_owns_email(a.contact_email)
        )
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);


-- ============================================================================
-- SOURCE MIGRATION: 20260710034108_5d384337-c4aa-4b0f-9db3-10393bda2e5e.sql
-- ============================================================================
CREATE TYPE public.lto_doc_type AS ENUM ('cr','or');
CREATE TYPE public.listing_verification_status AS ENUM ('unverified','pending','lto_verified','mismatch','expired');

CREATE TABLE public.listing_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type public.lto_doc_type NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  file_size integer NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, doc_type)
);
CREATE INDEX idx_listing_documents_listing ON public.listing_documents(listing_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_documents TO authenticated;
GRANT ALL ON public.listing_documents TO service_role;
ALTER TABLE public.listing_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own listing documents"
  ON public.listing_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all listing documents"
  ON public.listing_documents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.listing_verifications (
  listing_id uuid NOT NULL PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.listing_verification_status NOT NULL DEFAULT 'unverified',
  extracted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  mismatches_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz,
  verified_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_verifications TO authenticated;
GRANT ALL ON public.listing_verifications TO service_role;
GRANT SELECT ON public.listing_verifications TO anon;
ALTER TABLE public.listing_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own verification"
  ON public.listing_verifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all verifications"
  ON public.listing_verifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public reads verification status for active listings"
  ON public.listing_verifications FOR SELECT TO anon
  USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.status = 'active')
  );

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS verification_status public.listing_verification_status NOT NULL DEFAULT 'unverified';

CREATE OR REPLACE FUNCTION public.sync_listing_verification_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.listings SET verification_status = 'unverified' WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
  UPDATE public.listings SET verification_status = NEW.status WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_listing_verification_status
AFTER INSERT OR UPDATE OR DELETE ON public.listing_verifications
FOR EACH ROW EXECUTE FUNCTION public.sync_listing_verification_status();

CREATE TRIGGER trg_listing_verifications_updated_at
BEFORE UPDATE ON public.listing_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- SOURCE MIGRATION: 20260710034222_13379b58-1899-400b-b56d-c680b5c320fd.sql
-- ============================================================================
CREATE POLICY "Owner reads own listing docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner uploads own listing docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner updates own listing docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner deletes own listing docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins read all listing docs storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'listing-documents' AND public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- SOURCE MIGRATION: 20260710040652_dc16ddc2-7a94-4dff-9bd2-18d0ca42895f.sql
-- ============================================================================
CREATE TABLE public.vin_decode_cache (
  vin text PRIMARY KEY,
  result jsonb NOT NULL,
  source text NOT NULL,
  decoded_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vin_decode_cache TO authenticated;
GRANT ALL ON public.vin_decode_cache TO service_role;

ALTER TABLE public.vin_decode_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read VIN cache"
  ON public.vin_decode_cache
  FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================================
-- SOURCE MIGRATION: 20260710045307_201d3de0-c3d7-4e00-ac7a-289796cc509a.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_listings_match_parts_wanted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.category_slug = 'parts' AND NEW.status = 'active'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.match_listing_to_parts_wanted(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.listing_drafts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  category_slug text,
  form_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_drafts TO authenticated;
GRANT ALL ON public.listing_drafts TO service_role;

ALTER TABLE public.listing_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own draft select" ON public.listing_drafts;
DROP POLICY IF EXISTS "own draft upsert" ON public.listing_drafts;
DROP POLICY IF EXISTS "own draft update" ON public.listing_drafts;
DROP POLICY IF EXISTS "own draft delete" ON public.listing_drafts;

CREATE POLICY "own draft select" ON public.listing_drafts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own draft upsert" ON public.listing_drafts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own draft update" ON public.listing_drafts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own draft delete" ON public.listing_drafts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_listing_drafts_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS listing_drafts_touch ON public.listing_drafts;
CREATE TRIGGER listing_drafts_touch BEFORE UPDATE ON public.listing_drafts
  FOR EACH ROW EXECUTE FUNCTION public.tg_listing_drafts_touch();


-- ============================================================================
-- SOURCE MIGRATION: 20260710051539_39c40ffd-84f4-4989-af0d-330b19a37527.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_listing_media_caps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan text;
  v_photo_cap int;
  v_video_cap int;
  v_count int;
  is_admin boolean := has_role(auth.uid(), 'admin'::app_role);
BEGIN
  IF is_admin THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(plan::text, 'free') INTO v_plan
    FROM public.listings WHERE id = NEW.listing_id;

  IF v_plan = 'upgraded' THEN
    v_photo_cap := 20; v_video_cap := 3;
  ELSIF v_plan = 'standard' THEN
    v_photo_cap := 5;  v_video_cap := 1;
  ELSE
    -- Free plan aligned with FREE_PLAN_LIMITS and /sell copy
    v_photo_cap := 12; v_video_cap := 1;
  END IF;

  IF NEW.type = 'photo' THEN
    SELECT count(*) INTO v_count FROM public.listing_media
      WHERE listing_id = NEW.listing_id AND type = 'photo';
    IF v_count >= v_photo_cap THEN
      RAISE EXCEPTION 'Photo limit reached for % plan (max %).', v_plan, v_photo_cap
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NEW.type = 'video' THEN
    SELECT count(*) INTO v_count FROM public.listing_media
      WHERE listing_id = NEW.listing_id AND type = 'video';
    IF v_count >= v_video_cap THEN
      RAISE EXCEPTION 'Video limit reached for % plan (max %).', v_plan, v_video_cap
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260710053418_5ad16e5f-34db-4532-9dfc-af38d4f013a1.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_listing_media_caps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_listing_user uuid;
  v_listing_plan text;
  v_photo_count integer;
  v_video_count integer;
  v_photo_cap integer;
  v_video_cap integer;
BEGIN
  SELECT l.user_id, COALESCE(l.plan, 'free')
    INTO v_listing_user, v_listing_plan
  FROM public.listings l
  WHERE l.id = NEW.listing_id;

  IF v_listing_user IS NULL THEN
    RAISE EXCEPTION 'Listing not found'
      USING ERRCODE = '23503';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_listing_user THEN
    RAISE EXCEPTION 'Cannot attach media to another user''s listing'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.type = 'photo' THEN
    SELECT COUNT(*)
      INTO v_photo_count
    FROM public.listing_media
    WHERE listing_id = NEW.listing_id
      AND type = 'photo'
      AND id IS DISTINCT FROM NEW.id;

    v_photo_cap := CASE
      WHEN v_listing_plan IN ('standard', 'basic') THEN 5
      WHEN v_listing_plan IN ('upgraded', 'premium', 'dealer') THEN 20
      ELSE 12
    END;

    IF v_photo_count >= v_photo_cap THEN
      RAISE EXCEPTION 'Photo limit reached for % plan (max %)', v_listing_plan, v_photo_cap
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.type = 'video' THEN
    SELECT COUNT(*)
      INTO v_video_count
    FROM public.listing_media
    WHERE listing_id = NEW.listing_id
      AND type = 'video'
      AND id IS DISTINCT FROM NEW.id;

    v_video_cap := CASE
      WHEN v_listing_plan IN ('upgraded', 'premium', 'dealer') THEN 3
      ELSE 1
    END;

    IF v_video_count >= v_video_cap THEN
      RAISE EXCEPTION 'Video limit reached for % plan (max %)', v_listing_plan, v_video_cap
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260711010354_064bbdf4-d81e-4437-98d9-b75c0c57afcb.sql
-- ============================================================================

DROP FUNCTION IF EXISTS public.apply_report_action(uuid,text,text,boolean,boolean,boolean,uuid);

CREATE OR REPLACE FUNCTION public.apply_report_action(
  _report_id uuid,
  _action text,
  _note text DEFAULT NULL,
  _hide_listing boolean DEFAULT false,
  _delete_listing boolean DEFAULT false,
  _notify_poster boolean DEFAULT false,
  _reverses_action_id uuid DEFAULT NULL,
  _severity text DEFAULT 'standard'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _report public.reports%ROWTYPE;
  _listing public.listings%ROWTYPE;
  _delta int := 0;
  _accept_base int := -25;
  _listing_effect text := 'none';
  _new_status text;
  _new_resolution text;
  _action_id uuid;
  _reason_code text;
  _reason_label text;
BEGIN
  IF NOT (public.has_role(_actor,'admin') OR public.has_role(_actor,'moderator')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _report FROM public.reports WHERE id = _report_id FOR UPDATE;
  IF _report.id IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;

  IF _report.listing_id IS NOT NULL THEN
    SELECT * INTO _listing FROM public.listings WHERE id = _report.listing_id;
  END IF;

  IF _action = 'reverse' AND NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'Only admins can reverse decisions';
  END IF;

  _accept_base := CASE lower(COALESCE(_severity,'standard'))
    WHEN 'none' THEN 0
    WHEN 'minor' THEN -5
    WHEN 'moderate' THEN -15
    WHEN 'severe' THEN -50
    ELSE -25
  END;

  IF _action = 'accept' THEN
    _new_status := 'resolved'; _new_resolution := 'accepted';
    _delta := _accept_base;
    _reason_code := CASE WHEN _accept_base = 0 THEN 'report_accepted_no_penalty' ELSE 'report_accepted' END;
    _reason_label := CASE WHEN _accept_base = 0
      THEN 'Report accepted — no penalty (honest mistake)'
      ELSE 'Report accepted against you' END;
  ELSIF _action = 'dismiss' THEN
    _new_status := 'resolved'; _new_resolution := 'dismissed';
    _delta := 0; _reason_code := 'report_dismissed'; _reason_label := 'Report dismissed';
  ELSIF _action = 'reverse' THEN
    _new_status := 'open'; _new_resolution := NULL;
    IF _reverses_action_id IS NOT NULL THEN
      SELECT -score_delta INTO _delta FROM public.report_actions WHERE id = _reverses_action_id;
      _delta := COALESCE(_delta,0);
    END IF;
    _reason_code := 'decision_reversed'; _reason_label := 'Prior moderation decision reversed';
  ELSE
    _new_status := _report.status; _new_resolution := _report.resolution;
  END IF;

  IF _hide_listing AND _listing.id IS NOT NULL THEN
    UPDATE public.listings SET status = 'hidden' WHERE id = _listing.id;
    _listing_effect := 'hidden';
    _delta := _delta - 10;
  END IF;
  IF _delete_listing AND _listing.id IS NOT NULL THEN
    DELETE FROM public.listings WHERE id = _listing.id;
    _listing_effect := 'deleted';
    _delta := _delta - 30;
  END IF;
  IF _action = 'restore_listing' AND _listing.id IS NOT NULL THEN
    UPDATE public.listings SET status = 'active' WHERE id = _listing.id;
    _listing_effect := 'restored';
    _delta := _delta + 10;
  END IF;

  IF _action IN ('accept','dismiss','reverse') THEN
    UPDATE public.reports SET
      status = _new_status,
      resolution = _new_resolution,
      resolved_by = CASE WHEN _new_status='resolved' THEN _actor ELSE NULL END,
      resolved_at = CASE WHEN _new_status='resolved' THEN now() ELSE NULL END
    WHERE id = _report_id;
  END IF;

  INSERT INTO public.report_actions(
    report_id, actor_id, action, prev_status, new_status, prev_resolution, new_resolution,
    score_delta, listing_effect, notified_poster, note, reversed_by_action_id
  ) VALUES (
    _report_id, _actor, _action, _report.status, _new_status, _report.resolution, _new_resolution,
    _delta, _listing_effect, _notify_poster, _note, _reverses_action_id
  ) RETURNING id INTO _action_id;

  IF _action = 'reverse' AND _reverses_action_id IS NOT NULL THEN
    UPDATE public.report_actions SET reversed_by_action_id = _action_id WHERE id = _reverses_action_id;
  END IF;

  IF _listing.user_id IS NOT NULL AND _delta <> 0 THEN
    INSERT INTO public.trust_score_events(
      user_id, delta, reason_code, reason_label, source_type, source_id, actor_id
    ) VALUES (
      _listing.user_id, _delta, _reason_code, _reason_label, 'report', _report_id, _actor
    );
  END IF;

  RETURN _action_id;
END $$;

REVOKE ALL ON FUNCTION public.apply_report_action(uuid,text,text,boolean,boolean,boolean,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_report_action(uuid,text,text,boolean,boolean,boolean,uuid,text) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260711011141_9f8294d9-bbfa-4fdb-a058-d364cdfed91f.sql
-- ============================================================================

-- 1. Remove overbroad sales UPDATE on profiles and replace with a status-only RPC.
DROP POLICY IF EXISTS "Sales update account status" ON public.profiles;

CREATE OR REPLACE FUNCTION public.sales_update_account_status(
  _profile_id uuid,
  _new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'sales'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF NOT public.is_sales_assigned_user(auth.uid(), _profile_id) THEN
    RAISE EXCEPTION 'Not assigned to this customer';
  END IF;

  IF _new_status IS NULL OR length(_new_status) = 0 OR length(_new_status) > 64 THEN
    RAISE EXCEPTION 'Invalid account status';
  END IF;

  UPDATE public.profiles
     SET account_status = _new_status
   WHERE id = _profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sales_update_account_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sales_update_account_status(uuid, text) TO authenticated;

-- 2. Let DM recipients read attachments sent to them.
CREATE POLICY "Staff DM recipients can read attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff-dm-attachments'
  AND EXISTS (
    SELECT 1
      FROM public.staff_dms d
     WHERE d.attachment_path = storage.objects.name
       AND (d.sender_id = auth.uid() OR d.recipient_id = auth.uid())
  )
);


-- ============================================================================
-- SOURCE MIGRATION: 20260711044610_4ba7cad7-f972-4860-893d-7bb76399edd4.sql
-- ============================================================================
GRANT INSERT ON public.reports TO anon;
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260711065141_5acf3fda-e424-43a9-ad55-be9982fe0117.sql
-- ============================================================================

-- Checklists library
CREATE TABLE public.buyer_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  category_slug text,
  pdf_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.buyer_checklists TO anon, authenticated;
GRANT ALL ON public.buyer_checklists TO service_role;
ALTER TABLE public.buyer_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active checklists"
  ON public.buyer_checklists FOR SELECT
  USING (is_active = true);
CREATE POLICY "Admins manage checklists"
  ON public.buyer_checklists FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Items
CREATE TABLE public.buyer_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.buyer_checklists(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  label text NOT NULL,
  hint text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX buyer_checklist_items_checklist_idx ON public.buyer_checklist_items(checklist_id, position);
GRANT SELECT ON public.buyer_checklist_items TO anon, authenticated;
GRANT ALL ON public.buyer_checklist_items TO service_role;
ALTER TABLE public.buyer_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view items of active checklists"
  ON public.buyer_checklist_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.buyer_checklists c WHERE c.id = checklist_id AND c.is_active = true));
CREATE POLICY "Admins manage checklist items"
  ON public.buyer_checklist_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Per-user, per-listing progress
CREATE TABLE public.buyer_checklist_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.buyer_checklist_items(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_checklist_progress TO authenticated;
GRANT ALL ON public.buyer_checklist_progress TO service_role;
ALTER TABLE public.buyer_checklist_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own checklist progress"
  ON public.buyer_checklist_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own checklist progress"
  ON public.buyer_checklist_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own checklist progress"
  ON public.buyer_checklist_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER buyer_checklists_updated_at
  BEFORE UPDATE ON public.buyer_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: PH used-car checklist
WITH c AS (
  INSERT INTO public.buyer_checklists (slug, title, category_slug)
  VALUES ('ph-used-car', 'PH buyer document checklist — Used car', 'cars')
  RETURNING id
)
INSERT INTO public.buyer_checklist_items (checklist_id, position, label, hint)
SELECT c.id, v.position, v.label, v.hint FROM c, (VALUES
  (1, 'Original OR and CR are present', 'Ask for the latest LTO Official Receipt and Certificate of Registration.'),
  (2, 'Registered owner matches the seller''s valid ID', 'If not, ask for the open Deed of Sale chain and previous owner''s ID.'),
  (3, 'Deed of Sale is ready (notarised)', NULL),
  (4, 'Seller can show 2 valid government IDs', NULL),
  (5, 'Chassis number matches the CR and the unit', NULL),
  (6, 'Engine number matches the CR and the unit', NULL),
  (7, 'Plate / conduction sticker matches the CR', NULL),
  (8, 'No encumbrance / chattel mortgage on the CR', 'If marked ''Encumbered,'' ask for the bank''s release of mortgage.'),
  (9, 'Flood, accident, and rebuild history disclosed in writing', NULL),
  (10, 'HPG / PNP clearance done (recommended for high-value units)', 'Highway Patrol Group macro-etching confirms the unit is not stolen.')
) AS v(position, label, hint);

-- Seed: PH used-motorcycle checklist (stub, admin can extend)
WITH c AS (
  INSERT INTO public.buyer_checklists (slug, title, category_slug)
  VALUES ('ph-used-motorcycle', 'PH buyer document checklist — Motorcycle', 'motorcycles')
  RETURNING id
)
INSERT INTO public.buyer_checklist_items (checklist_id, position, label, hint)
SELECT c.id, v.position, v.label, v.hint FROM c, (VALUES
  (1, 'Original OR and CR are present', NULL),
  (2, 'Registered owner matches the seller''s valid ID', NULL),
  (3, 'Deed of Sale is ready (notarised)', NULL),
  (4, 'Chassis and engine numbers match the CR', NULL),
  (5, 'No encumbrance on the CR', NULL),
  (6, 'HPG clearance done (recommended)', NULL)
) AS v(position, label, hint);


-- ============================================================================
-- SOURCE MIGRATION: 20260711065326_ef5ce8a6-5dd5-40f6-be75-52253b43e0d7.sql
-- ============================================================================

CREATE POLICY "Anyone can read buyer guides"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'buyer-guides');

CREATE POLICY "Admins upload buyer guides"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'buyer-guides' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update buyer guides"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'buyer-guides' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete buyer guides"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'buyer-guides' AND public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- SOURCE MIGRATION: 20260711070812_b5fc269f-649d-4705-b255-89d823663b24.sql
-- ============================================================================
-- Notify listing owner when a new message arrives, like Messenger.
CREATE OR REPLACE FUNCTION public.tg_notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
  v_sender_name TEXT;
  v_listing_title TEXT;
BEGIN
  SELECT COALESCE(business_name, full_name, 'Someone')
    INTO v_sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  SELECT title INTO v_listing_title
    FROM public.listings WHERE id = NEW.listing_id;

  v_title := COALESCE(v_sender_name, 'New message') || ' sent you a message';
  v_body  := CASE
    WHEN v_listing_title IS NOT NULL THEN 'Re: ' || v_listing_title || E'\n' || LEFT(NEW.body, 140)
    ELSE LEFT(NEW.body, 200)
  END;

  INSERT INTO public.user_notifications
    (user_id, title, body, link_url, entity_type, entity_id)
  VALUES
    (NEW.recipient_id, v_title, v_body,
     '/dashboard/messages',
     'message', NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_message_recipient ON public.messages;
CREATE TRIGGER trg_notify_message_recipient
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_message_recipient();


-- ============================================================================
-- SOURCE MIGRATION: 20260711072533_71165e8b-c1de-4475-94a1-9c91ae3c46e5.sql
-- ============================================================================
-- Extend messages with attachments
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_thumb_url text,
  ADD COLUMN IF NOT EXISTS attachment_meta jsonb,
  ADD COLUMN IF NOT EXISTS attachment_path text;

-- Allow empty body when attachment present: relax NOT NULL if it was set
ALTER TABLE public.messages ALTER COLUMN body DROP NOT NULL;

-- Mark a conversation unread (most recent inbound message)
CREATE OR REPLACE FUNCTION public.mark_conversation_unread(
  p_listing_id uuid,
  p_other_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT id INTO v_id
  FROM public.messages
  WHERE listing_id = p_listing_id
    AND recipient_id = v_uid
    AND sender_id = p_other_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE public.messages SET read_at = NULL WHERE id = v_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_unread(uuid, uuid) TO authenticated;

-- Update notify trigger to describe attachment when body is empty
CREATE OR REPLACE FUNCTION public.tg_notify_message_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
  v_preview TEXT;
  v_sender_name TEXT;
  v_listing_title TEXT;
BEGIN
  SELECT COALESCE(business_name, full_name, 'Someone')
    INTO v_sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  SELECT title INTO v_listing_title
    FROM public.listings WHERE id = NEW.listing_id;

  v_preview := CASE
    WHEN COALESCE(NEW.body, '') <> '' THEN LEFT(NEW.body, 140)
    WHEN NEW.attachment_type = 'image' THEN '📷 Sent a photo'
    WHEN NEW.attachment_type = 'video' THEN '🎬 Sent a video'
    WHEN NEW.attachment_type = 'gif'   THEN 'Sent a GIF'
    ELSE 'Sent an attachment'
  END;

  v_title := COALESCE(v_sender_name, 'New message') || ' sent you a message';
  v_body  := CASE
    WHEN v_listing_title IS NOT NULL THEN 'Re: ' || v_listing_title || E'\n' || v_preview
    ELSE v_preview
  END;

  INSERT INTO public.user_notifications
    (user_id, title, body, link_url, entity_type, entity_id)
  VALUES
    (NEW.recipient_id, v_title, v_body,
     '/dashboard/messages',
     'message', NEW.id);

  RETURN NEW;
END;
$$;

-- Storage RLS for message-media (private bucket)
-- Path convention: {auth.uid()}/{uuid}.{ext}
CREATE POLICY "message-media: upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "message-media: read own uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "message-media: read as recipient"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-media'
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.attachment_path = storage.objects.name
        AND m.recipient_id = auth.uid()
    )
  );

CREATE POLICY "message-media: delete own uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'message-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260711073331_3314948d-c196-44ff-b656-7be383f5d16b.sql
-- ============================================================================

-- 1. Tables
CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_thread_members (
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','left')),
  last_read_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_thread_members TO authenticated;
GRANT ALL ON public.chat_thread_members TO service_role;
ALTER TABLE public.chat_thread_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  attachment_url text,
  attachment_type text CHECK (attachment_type IN ('image','video','gif')),
  attachment_thumb_url text,
  attachment_path text,
  attachment_meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_thread_messages TO authenticated;
GRANT ALL ON public.chat_thread_messages TO service_role;
ALTER TABLE public.chat_thread_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chat_thread_messages_thread ON public.chat_thread_messages(thread_id, created_at);
CREATE INDEX idx_chat_thread_members_user ON public.chat_thread_members(user_id, status);

-- 2. Helper (SECURITY DEFINER to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_thread_member(_thread uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_thread_members
    WHERE thread_id = _thread AND user_id = _user AND status IN ('active','invited')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_thread_member(_thread uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_thread_members
    WHERE thread_id = _thread AND user_id = _user AND status = 'active'
  );
$$;

-- 3. Policies
CREATE POLICY "Members view threads" ON public.chat_threads
  FOR SELECT TO authenticated
  USING (public.is_thread_member(id, auth.uid()));

CREATE POLICY "Anyone can create threads" ON public.chat_threads
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator can update thread" ON public.chat_threads
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Members see member rows" ON public.chat_thread_members
  FOR SELECT TO authenticated
  USING (public.is_thread_member(thread_id, auth.uid()));

CREATE POLICY "Active members can invite" ON public.chat_thread_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_thread_member(thread_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.created_by = auth.uid())
  );

CREATE POLICY "User can update own membership" ON public.chat_thread_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members view thread messages" ON public.chat_thread_messages
  FOR SELECT TO authenticated
  USING (public.is_thread_member(thread_id, auth.uid()));

CREATE POLICY "Active members can send" ON public.chat_thread_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_active_thread_member(thread_id, auth.uid()));

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_touch_chat_thread()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.chat_threads SET updated_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_touch_chat_thread_on_message
AFTER INSERT ON public.chat_thread_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_chat_thread();

-- 5. Notification trigger for group messages
CREATE OR REPLACE FUNCTION public.tg_notify_chat_thread_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title text;
  v_preview text;
  v_sender_name text;
BEGIN
  SELECT title INTO v_title FROM public.chat_threads WHERE id = NEW.thread_id;
  SELECT COALESCE(business_name, full_name, 'Someone') INTO v_sender_name
  FROM public.public_profiles WHERE id = NEW.sender_id;

  IF NEW.body IS NOT NULL AND length(NEW.body) > 0 THEN
    v_preview := left(NEW.body, 140);
  ELSIF NEW.attachment_type = 'image' THEN v_preview := 'sent a photo';
  ELSIF NEW.attachment_type = 'video' THEN v_preview := 'sent a video';
  ELSIF NEW.attachment_type = 'gif' THEN v_preview := 'sent a GIF';
  ELSE v_preview := 'sent a message';
  END IF;

  INSERT INTO public.user_notifications (user_id, type, title, body, url, metadata)
  SELECT
    m.user_id,
    'chat_message',
    COALESCE(v_title, 'Group chat'),
    v_sender_name || ': ' || v_preview,
    '/dashboard/messages?thread=' || NEW.thread_id::text,
    jsonb_build_object('thread_id', NEW.thread_id, 'sender_id', NEW.sender_id)
  FROM public.chat_thread_members m
  WHERE m.thread_id = NEW.thread_id
    AND m.user_id <> NEW.sender_id
    AND m.status = 'active';

  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_chat_thread_message
AFTER INSERT ON public.chat_thread_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_chat_thread_message();

-- 6. RPCs
CREATE OR REPLACE FUNCTION public.create_group_chat(p_title text, p_member_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_thread_id uuid;
  v_member uuid;
  v_clean text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_clean := btrim(coalesce(p_title, ''));
  IF v_clean = '' THEN RAISE EXCEPTION 'Title is required'; END IF;

  INSERT INTO public.chat_threads (title, created_by) VALUES (v_clean, v_uid)
  RETURNING id INTO v_thread_id;

  INSERT INTO public.chat_thread_members (thread_id, user_id, invited_by, status)
  VALUES (v_thread_id, v_uid, v_uid, 'active');

  IF p_member_ids IS NOT NULL THEN
    FOREACH v_member IN ARRAY p_member_ids LOOP
      IF v_member IS NOT NULL AND v_member <> v_uid THEN
        INSERT INTO public.chat_thread_members (thread_id, user_id, invited_by, status)
        VALUES (v_thread_id, v_member, v_uid, 'invited')
        ON CONFLICT DO NOTHING;

        INSERT INTO public.user_notifications (user_id, type, title, body, url, metadata)
        VALUES (
          v_member,
          'chat_invite',
          'You were invited to a group chat',
          v_clean,
          '/dashboard/messages?thread=' || v_thread_id::text,
          jsonb_build_object('thread_id', v_thread_id, 'invited_by', v_uid)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN v_thread_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_group_chat(text, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.invite_to_thread(p_thread_id uuid, p_user_ids uuid[])
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_title text;
  v_member uuid;
  v_added int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_active_thread_member(p_thread_id, v_uid) THEN
    RAISE EXCEPTION 'Not a member of this thread';
  END IF;
  SELECT title INTO v_title FROM public.chat_threads WHERE id = p_thread_id;
  IF p_user_ids IS NULL THEN RETURN 0; END IF;

  FOREACH v_member IN ARRAY p_user_ids LOOP
    IF v_member IS NOT NULL AND v_member <> v_uid THEN
      INSERT INTO public.chat_thread_members (thread_id, user_id, invited_by, status)
      VALUES (p_thread_id, v_member, v_uid, 'invited')
      ON CONFLICT (thread_id, user_id) DO NOTHING;
      IF FOUND THEN
        v_added := v_added + 1;
        INSERT INTO public.user_notifications (user_id, type, title, body, url, metadata)
        VALUES (
          v_member,
          'chat_invite',
          'You were invited to a group chat',
          v_title,
          '/dashboard/messages?thread=' || p_thread_id::text,
          jsonb_build_object('thread_id', p_thread_id, 'invited_by', v_uid)
        );
      END IF;
    END IF;
  END LOOP;
  RETURN v_added;
END;
$$;
GRANT EXECUTE ON FUNCTION public.invite_to_thread(uuid, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_thread_invite(p_thread_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_accept THEN
    UPDATE public.chat_thread_members
      SET status = 'active', joined_at = now()
      WHERE thread_id = p_thread_id AND user_id = v_uid AND status = 'invited';
  ELSE
    UPDATE public.chat_thread_members
      SET status = 'left'
      WHERE thread_id = p_thread_id AND user_id = v_uid;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.respond_to_thread_invite(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_thread(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.chat_thread_members
    SET status = 'left'
    WHERE thread_id = p_thread_id AND user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.leave_thread(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_thread_read(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.chat_thread_members
    SET last_read_at = now()
    WHERE thread_id = p_thread_id AND user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_thread_read(uuid) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260711073454_cea6ce68-1eda-4711-8431-5d3468395289.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tg_notify_chat_thread_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title text;
  v_preview text;
  v_sender_name text;
BEGIN
  SELECT title INTO v_title FROM public.chat_threads WHERE id = NEW.thread_id;
  SELECT COALESCE(business_name, full_name, 'Someone') INTO v_sender_name
  FROM public.public_profiles WHERE id = NEW.sender_id;

  IF NEW.body IS NOT NULL AND length(NEW.body) > 0 THEN
    v_preview := left(NEW.body, 140);
  ELSIF NEW.attachment_type = 'image' THEN v_preview := 'sent a photo';
  ELSIF NEW.attachment_type = 'video' THEN v_preview := 'sent a video';
  ELSIF NEW.attachment_type = 'gif' THEN v_preview := 'sent a GIF';
  ELSE v_preview := 'sent a message';
  END IF;

  INSERT INTO public.user_notifications (user_id, category, title, body, link_url, entity_type, entity_id, metadata)
  SELECT
    m.user_id,
    'chat_message',
    COALESCE(v_title, 'Group chat'),
    v_sender_name || ': ' || v_preview,
    '/dashboard/messages?thread=' || NEW.thread_id::text,
    'chat_thread',
    NEW.thread_id,
    jsonb_build_object('thread_id', NEW.thread_id, 'sender_id', NEW.sender_id)
  FROM public.chat_thread_members m
  WHERE m.thread_id = NEW.thread_id
    AND m.user_id <> NEW.sender_id
    AND m.status = 'active';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_chat(p_title text, p_member_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_thread_id uuid;
  v_member uuid;
  v_clean text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_clean := btrim(coalesce(p_title, ''));
  IF v_clean = '' THEN RAISE EXCEPTION 'Title is required'; END IF;

  INSERT INTO public.chat_threads (title, created_by) VALUES (v_clean, v_uid)
  RETURNING id INTO v_thread_id;

  INSERT INTO public.chat_thread_members (thread_id, user_id, invited_by, status)
  VALUES (v_thread_id, v_uid, v_uid, 'active');

  IF p_member_ids IS NOT NULL THEN
    FOREACH v_member IN ARRAY p_member_ids LOOP
      IF v_member IS NOT NULL AND v_member <> v_uid THEN
        INSERT INTO public.chat_thread_members (thread_id, user_id, invited_by, status)
        VALUES (v_thread_id, v_member, v_uid, 'invited')
        ON CONFLICT DO NOTHING;

        INSERT INTO public.user_notifications (user_id, category, title, body, link_url, entity_type, entity_id, metadata)
        VALUES (
          v_member, 'chat_invite',
          'You were invited to a group chat', v_clean,
          '/dashboard/messages?thread=' || v_thread_id::text,
          'chat_thread', v_thread_id,
          jsonb_build_object('thread_id', v_thread_id, 'invited_by', v_uid)
        );
      END IF;
    END LOOP;
  END IF;
  RETURN v_thread_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_to_thread(p_thread_id uuid, p_user_ids uuid[])
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_title text;
  v_member uuid;
  v_added int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_active_thread_member(p_thread_id, v_uid) THEN
    RAISE EXCEPTION 'Not a member of this thread';
  END IF;
  SELECT title INTO v_title FROM public.chat_threads WHERE id = p_thread_id;
  IF p_user_ids IS NULL THEN RETURN 0; END IF;

  FOREACH v_member IN ARRAY p_user_ids LOOP
    IF v_member IS NOT NULL AND v_member <> v_uid THEN
      INSERT INTO public.chat_thread_members (thread_id, user_id, invited_by, status)
      VALUES (p_thread_id, v_member, v_uid, 'invited')
      ON CONFLICT (thread_id, user_id) DO NOTHING;
      IF FOUND THEN
        v_added := v_added + 1;
        INSERT INTO public.user_notifications (user_id, category, title, body, link_url, entity_type, entity_id, metadata)
        VALUES (
          v_member, 'chat_invite',
          'You were invited to a group chat', v_title,
          '/dashboard/messages?thread=' || p_thread_id::text,
          'chat_thread', p_thread_id,
          jsonb_build_object('thread_id', p_thread_id, 'invited_by', v_uid)
        );
      END IF;
    END IF;
  END LOOP;
  RETURN v_added;
END;
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260711074001_e72c5982-744f-4023-9045-99a02778d52b.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_thread_unread(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prev timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT max(created_at) INTO v_prev
    FROM public.chat_thread_messages
    WHERE thread_id = p_thread_id
      AND sender_id <> auth.uid();
  UPDATE public.chat_thread_members
    SET last_read_at = CASE
      WHEN v_prev IS NULL THEN NULL
      ELSE v_prev - interval '1 millisecond'
    END
    WHERE thread_id = p_thread_id AND user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_thread_unread(uuid) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260712010743_2fbad4dc-269c-4aed-b5b5-c8a714d5828f.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
  v_sender_name TEXT;
  v_listing_title TEXT;
BEGIN
  IF NEW.recipient_id IS NULL OR NEW.recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(business_name, full_name, 'Someone')
    INTO v_sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  SELECT title INTO v_listing_title
    FROM public.listings WHERE id = NEW.listing_id;

  v_title := COALESCE(v_sender_name, 'New message') || ' sent you a message';
  v_body  := CASE
    WHEN v_listing_title IS NOT NULL THEN 'Re: ' || v_listing_title || E'\n' || LEFT(COALESCE(NEW.body, ''), 140)
    ELSE LEFT(COALESCE(NEW.body, ''), 200)
  END;

  INSERT INTO public.user_notifications
    (user_id, category, title, body, link_url, entity_type, entity_id)
  VALUES
    (NEW.recipient_id, 'messages', v_title, v_body,
     '/dashboard/messages',
     'message', NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_message_recipient ON public.messages;
CREATE TRIGGER trg_notify_message_recipient
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_message_recipient();


-- ============================================================================
-- SOURCE MIGRATION: 20260712012245_5a4e31fb-2e2d-4a6e-9504-fdf3fa8af497.sql
-- ============================================================================

-- 1) listing_verifications: remove anon public access
DROP POLICY IF EXISTS "Public reads verification status for active listings" ON public.listing_verifications;
REVOKE SELECT ON public.listing_verifications FROM anon;

-- Safe minimal public view exposing only status (name avoids existing enum type)
CREATE OR REPLACE VIEW public.public_listing_verification_status AS
SELECT
  v.listing_id,
  v.status,
  v.created_at,
  v.updated_at
FROM public.listing_verifications v
JOIN public.listings l ON l.id = v.listing_id
WHERE l.status = 'active';

GRANT SELECT ON public.public_listing_verification_status TO anon, authenticated;

-- 2) qr_lead_captures: scope advertising role to own referral codes
DROP POLICY IF EXISTS "Advertising read all QR leads" ON public.qr_lead_captures;
CREATE POLICY "Advertising read own QR leads"
  ON public.qr_lead_captures FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'advertising'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.staff_referrals s
      WHERE s.referral_code = qr_lead_captures.referral_code
        AND s.staff_user_id = auth.uid()
    )
  );

-- 3) qr_scans: scope sales + advertising roles to own referral codes
DROP POLICY IF EXISTS "Sales read qr_scans" ON public.qr_scans;
CREATE POLICY "Sales read own qr_scans"
  ON public.qr_scans FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.staff_referrals s
      WHERE s.referral_code = qr_scans.referral_code
        AND s.staff_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Advertising read qr_scans" ON public.qr_scans;
CREATE POLICY "Advertising read own qr_scans"
  ON public.qr_scans FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'advertising'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.staff_referrals s
      WHERE s.referral_code = qr_scans.referral_code
        AND s.staff_user_id = auth.uid()
    )
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260712022741_5d584347-8ea1-4cf5-97a4-c209993eeb90.sql
-- ============================================================================
UPDATE public.businesses SET status = 'active', updated_at = now() WHERE id = '9edc71f5-940b-457d-916b-aaaf34e864de' AND status = 'archived';


-- ============================================================================
-- SOURCE MIGRATION: 20260712053445_e5ece42f-5c6d-4e45-a47e-05759dd82540.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body TEXT;
  v_preview TEXT;
  v_sender_name TEXT;
  v_listing_title TEXT;
BEGIN
  IF NEW.recipient_id IS NULL OR NEW.recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(business_name, full_name, 'Someone')
    INTO v_sender_name
    FROM public.profiles
   WHERE id = NEW.sender_id;

  SELECT title
    INTO v_listing_title
    FROM public.listings
   WHERE id = NEW.listing_id;

  v_preview := CASE
    WHEN COALESCE(NEW.body, '') <> '' THEN LEFT(NEW.body, 140)
    WHEN NEW.attachment_type = 'image' THEN '📷 Sent a photo'
    WHEN NEW.attachment_type = 'video' THEN '🎬 Sent a video'
    WHEN NEW.attachment_type = 'gif' THEN 'Sent a GIF'
    WHEN NEW.attachment_type IS NOT NULL THEN 'Sent an attachment'
    ELSE 'Sent a message'
  END;

  v_title := COALESCE(v_sender_name, 'New message') || ' sent you a message';
  v_body := CASE
    WHEN v_listing_title IS NOT NULL THEN 'Re: ' || v_listing_title || E'\n' || v_preview
    ELSE v_preview
  END;

  INSERT INTO public.user_notifications
    (user_id, category, title, body, link_url, entity_type, entity_id)
  VALUES
    (NEW.recipient_id, 'messages', v_title, v_body, '/dashboard/messages', 'message', NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_message_recipient ON public.messages;
CREATE TRIGGER trg_notify_message_recipient
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_message_recipient();


-- ============================================================================
-- SOURCE MIGRATION: 20260712053952_4bb09603-be11-47ed-aaaf-4114494cbd93.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_message_notifications_read(p_message_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_notifications
     SET read_at = COALESCE(read_at, now())
   WHERE user_id = auth.uid()
     AND category = 'messages'
     AND entity_type = 'message'
     AND entity_id = ANY(p_message_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_message_notifications_read(uuid[]) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260712054230_0cadcc14-52ad-4ffb-9294-fa2c1d058c2f.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_message_notifications_unread(p_message_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_notifications
     SET read_at = NULL
   WHERE user_id = auth.uid()
     AND category = 'messages'
     AND entity_type = 'message'
     AND entity_id = ANY(p_message_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_message_notifications_unread(uuid[]) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260712062336_120321ae-5824-4df8-9d53-0e8b448e5160.sql
-- ============================================================================

-- 1. messages: additive columns
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS starred_by uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_offer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS offer_currency text DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS offer_status text,
  ADD COLUMN IF NOT EXISTS system_kind text;

-- Full-text search index on message bodies
CREATE INDEX IF NOT EXISTS idx_messages_body_fts
  ON public.messages USING gin (to_tsvector('simple', coalesce(body, '')));

-- 2. message_thread_state
CREATE TABLE IF NOT EXISTS public.message_thread_state (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope        text NOT NULL CHECK (scope IN ('dm','group')),
  key          text NOT NULL,
  starred      boolean NOT NULL DEFAULT false,
  archived     boolean NOT NULL DEFAULT false,
  muted        boolean NOT NULL DEFAULT false,
  spam         boolean NOT NULL DEFAULT false,
  color_label  text,
  last_read_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scope, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_thread_state TO authenticated;
GRANT ALL ON public.message_thread_state TO service_role;

ALTER TABLE public.message_thread_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own thread state select" ON public.message_thread_state
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own thread state insert" ON public.message_thread_state
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own thread state update" ON public.message_thread_state
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own thread state delete" ON public.message_thread_state
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mts_user_flags
  ON public.message_thread_state (user_id, archived, spam, starred);

-- 3. quick_replies
CREATE TABLE IF NOT EXISTS public.quick_replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quick_replies TO authenticated;
GRANT ALL ON public.quick_replies TO service_role;

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own quick replies select" ON public.quick_replies
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own quick replies insert" ON public.quick_replies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own quick replies update" ON public.quick_replies
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own quick replies delete" ON public.quick_replies
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quick_replies_user ON public.quick_replies(user_id, sort_order);

CREATE OR REPLACE FUNCTION public.tg_quick_replies_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS quick_replies_touch ON public.quick_replies;
CREATE TRIGGER quick_replies_touch BEFORE UPDATE ON public.quick_replies
  FOR EACH ROW EXECUTE FUNCTION public.tg_quick_replies_touch();

-- 4. Sold / relisted auto system-message trigger
CREATE OR REPLACE FUNCTION public.tg_listing_status_system_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_body text;
  v_buyer uuid;
BEGIN
  IF NEW.status = 'sold' AND (OLD.status IS DISTINCT FROM 'sold') THEN
    v_kind := 'listing_sold';
    v_body := 'This listing was marked SOLD. Thanks!';
  ELSIF NEW.status = 'active' AND OLD.status = 'sold' THEN
    v_kind := 'listing_relisted';
    v_body := 'This listing has been relisted and is available again.';
  ELSE
    RETURN NEW;
  END IF;

  FOR v_buyer IN
    SELECT DISTINCT CASE WHEN sender_id = NEW.user_id THEN recipient_id ELSE sender_id END
    FROM public.messages
    WHERE listing_id = NEW.id
      AND (sender_id = NEW.user_id OR recipient_id = NEW.user_id)
  LOOP
    IF v_buyer IS NULL OR v_buyer = NEW.user_id THEN CONTINUE; END IF;

    INSERT INTO public.messages (sender_id, recipient_id, listing_id, body, system_kind)
    VALUES (NEW.user_id, v_buyer, NEW.id, v_body, v_kind);

    INSERT INTO public.user_notifications (user_id, category, title, body, link_url, entity_type, entity_id)
    VALUES (
      v_buyer,
      'messages',
      CASE WHEN v_kind = 'listing_sold' THEN 'Listing marked sold' ELSE 'Listing relisted' END,
      v_body,
      '/listing/' || NEW.id::text,
      'listing',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listing_status_system_message ON public.listings;
CREATE TRIGGER listing_status_system_message
  AFTER UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_listing_status_system_message();


-- ============================================================================
-- SOURCE MIGRATION: 20260713012516_8b3939aa-63d7-4e0d-8c85-0246b3bb8a21.sql
-- ============================================================================
DROP POLICY IF EXISTS "Applicants and admins post messages" ON public.franchise_application_messages;

CREATE POLICY "Applicants and admins post messages"
  ON public.franchise_application_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        NOT is_internal
        AND EXISTS (
          SELECT 1 FROM public.franchise_applications a
          WHERE a.id = application_id
            AND (
              a.user_id = auth.uid()
              OR public.current_user_owns_email(a.contact_email)
            )
        )
      )
    )
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260713022238_540630d7-d0d4-436b-b5a0-58f9dc07811f.sql
-- ============================================================================

-- =========================================================
-- Document Check: schema
-- =========================================================

CREATE TABLE public.doc_check_countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag_emoji TEXT NOT NULL,
  region TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  currency TEXT,
  drives_on TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doc_check_countries TO anon, authenticated;
GRANT ALL ON public.doc_check_countries TO service_role;
ALTER TABLE public.doc_check_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published countries" ON public.doc_check_countries
  FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage countries" ON public.doc_check_countries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doc_check_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.doc_check_countries(code) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('quick_guide','buying','selling','import','export','insurance','documents')),
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 100,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX doc_check_sections_country_kind_idx ON public.doc_check_sections(country_code, kind, sort_order);
GRANT SELECT ON public.doc_check_sections TO anon, authenticated;
GRANT ALL ON public.doc_check_sections TO service_role;
ALTER TABLE public.doc_check_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published sections" ON public.doc_check_sections
  FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage sections" ON public.doc_check_sections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doc_check_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.doc_check_countries(code) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description_md TEXT NOT NULL DEFAULT '',
  who_issues TEXT,
  typical_cost TEXT,
  validity TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, code)
);
GRANT SELECT ON public.doc_check_documents TO anon, authenticated;
GRANT ALL ON public.doc_check_documents TO service_role;
ALTER TABLE public.doc_check_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read documents" ON public.doc_check_documents
  FOR SELECT USING (true);
CREATE POLICY "admin manage documents" ON public.doc_check_documents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doc_check_agency_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.doc_check_countries(code) ON DELETE CASCADE,
  section_kind TEXT,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doc_check_agency_links TO anon, authenticated;
GRANT ALL ON public.doc_check_agency_links TO service_role;
ALTER TABLE public.doc_check_agency_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read agency links" ON public.doc_check_agency_links
  FOR SELECT USING (true);
CREATE POLICY "admin manage agency links" ON public.doc_check_agency_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doc_check_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  country_code TEXT,
  entity TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.doc_check_audit_log TO authenticated;
GRANT ALL ON public.doc_check_audit_log TO service_role;
ALTER TABLE public.doc_check_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit" ON public.doc_check_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert audit" ON public.doc_check_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_doc_check_countries_updated BEFORE UPDATE ON public.doc_check_countries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_doc_check_sections_updated BEFORE UPDATE ON public.doc_check_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_doc_check_documents_updated BEFORE UPDATE ON public.doc_check_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Seed: countries
-- =========================================================

INSERT INTO public.doc_check_countries (code, name, flag_emoji, region, slug, summary, currency, drives_on, sort_order, is_published) VALUES
  ('ph','Philippines','🇵🇭','Southeast Asia','ph','Vehicle transfer and registration is administered by the Land Transportation Office (LTO). Comprehensive third-party liability (CTPL) insurance is mandatory.','PHP','right', 1, true),
  ('sg','Singapore','🇸🇬','Southeast Asia','sg','Vehicles are administered by LTA. Ownership transfer, COE, and PARF rules apply.','SGD','left', 10, true),
  ('my','Malaysia','🇲🇾','Southeast Asia','my','JPJ manages registration and title transfer. Puspakom inspection is required for used-vehicle transfers.','MYR','left', 11, true),
  ('th','Thailand','🇹🇭','Southeast Asia','th','Department of Land Transport (DLT) handles vehicle transfer, CTPL (Por Ror Bor), and green book updates.','THB','left', 12, true),
  ('vn','Vietnam','🇻🇳','Southeast Asia','vn','Traffic Police handle registration transfer. Import restrictions on used vehicles are strict.','VND','right', 13, true),
  ('id','Indonesia','🇮🇩','Southeast Asia','id','SAMSAT / Korlantas Polri handle STNK/BPKB transfers and annual tax.','IDR','left', 14, true),
  ('us','United States','🇺🇸','North America','us','Vehicle title and registration are handled state-by-state via the DMV. Emissions and safety standards set by NHTSA/EPA.','USD','right', 20, true),
  ('ca','Canada','🇨🇦','North America','ca','Registration is provincial (ICBC, SAAQ, ServiceOntario, etc.). Transport Canada sets federal standards.','CAD','right', 21, true),
  ('uk','United Kingdom','🇬🇧','Europe','uk','DVLA manages V5C logbooks, MOT, and vehicle tax. Import from EU has post-Brexit VAT/duty rules.','GBP','left', 30, true),
  ('de','Germany','🇩🇪','Europe','de','Kfz-Zulassungsstelle handles registration. TÜV/DEKRA inspection required. EU-wide type approval applies.','EUR','right', 31, true),
  ('fr','France','🇫🇷','Europe','fr','ANTS online system for carte grise. Contrôle technique (CT) required every 2 years for used cars.','EUR','right', 32, true),
  ('nl','Netherlands','🇳🇱','Europe','nl','RDW manages kenteken registration. APK inspection mandatory. BPM tax on imports.','EUR','right', 33, true),
  ('es','Spain','🇪🇸','Europe','es','DGT handles transfer of ownership. ITV inspection required. Registration tax on imports.','EUR','right', 34, true),
  ('it','Italy','🇮🇹','Europe','it','Motorizzazione Civile and PRA manage title transfer. Revisione inspection every 2 years.','EUR','right', 35, true),
  ('jp','Japan','🇯🇵','East Asia','jp','Land Transport Bureau handles Shaken inspection and registration. Export deregistration for JDM exports.','JPY','left', 40, true),
  ('kr','South Korea','🇰🇷','East Asia','kr','KOROAD / MOLIT regulate vehicle transfer. Emissions and export certificates required for used exports.','KRW','right', 41, true),
  ('au','Australia','🇦🇺','Oceania','au','State-based rego (VicRoads, TfNSW, Qld TMR, etc.). Strict import rules under RAWS/SEVS.','AUD','left', 50, true),
  ('nz','New Zealand','🇳🇿','Oceania','nz','Waka Kotahi NZTA handles registration and WoF. Compliance inspection required on import.','NZD','left', 51, true);

-- =========================================================
-- Seed: Philippines full content
-- =========================================================

INSERT INTO public.doc_check_sections (country_code, kind, title, body_md, sort_order, is_published) VALUES
  ('ph','quick_guide','Quick Guide — Buying a used vehicle in the Philippines',
$MD$
This is the fast checklist buyers should complete before handing over any payment. Full details live in the sections below.

1. **Verify OR and CR match** — both documents must show the seller's name, and the plate, chassis (VIN), and engine numbers must match the vehicle in person.
2. **Confirm chassis and engine numbers** — check under the hood and on the frame. Numbers must be crisp, not restamped or ground.
3. **Ask for PNP-HPG Motor Vehicle Clearance** — required before transfer at LTO. Confirms the unit is not stolen or encumbered.
4. **Check for encumbrance** — the CR must be marked "No Encumbrance" (or the bank release must be attached if it was financed).
5. **Notarized Deed of Sale** — both parties sign in front of a notary public. Bring 2 valid government IDs each.
6. **Valid CTPL insurance** — Compulsory Third-Party Liability must be active. Buyer typically renews upon transfer.
7. **Recent Emission Test** — required to renew registration.
8. **Transfer at LTO within 30 days** — the buyer files the change of ownership at the LTO district office that has jurisdiction.
9. **Use traceable payment** — bank transfer, GCash, Maya, or manager's check. Avoid large cash.
10. **Meet in a safe, public place** — daylight, well-lit, ideally with a companion or mechanic.
$MD$, 1, true),

  ('ph','buying','Buying & transferring ownership',
$MD$
The Philippines transfers vehicle ownership through the Land Transportation Office (LTO). The buyer is responsible for filing the transfer within 30 days of the Deed of Sale.

**Required documents (buyer files these at LTO):**
- Original OR (Official Receipt) and CR (Certificate of Registration)
- Notarized Deed of Absolute Sale
- PNP-HPG Motor Vehicle Clearance (macro-etching + records check)
- Latest Emission Test Result
- CTPL insurance (Compulsory Third-Party Liability)
- Buyer and seller valid IDs (2 each)
- TIN of both parties
- Duty-paid stamp / release papers if imported

**Typical LTO transfer fees (2026):**
- Transfer fee: ₱150
- Change of ownership: ~₱50
- IT service fee, computer fee, and legal fees: ~₱169
- Total including PNP clearance and notarization: **₱1,500 – ₱3,500** depending on region

**Timeline:** 1–2 hours at LTO if papers are complete. Same-day plate release for renewals.
$MD$, 10, true),

  ('ph','selling','Selling & releasing liability',
$MD$
Once the buyer takes possession, the seller should protect themselves from future liability (traffic tickets, accidents, or unpaid registration) filed under the old owner's name.

**Seller checklist:**
- Prepare a **Notarized Deed of Sale** — keep a signed original for your records.
- Photocopy the buyer's IDs and take a photo of buyer + vehicle + plate together.
- Surrender **only photocopies** of OR/CR at signing; hand over originals only when payment clears.
- File a **"Sold" report** at your LTO district office (Report of Sale) so the vehicle is flagged as transferred if the buyer delays registration.
- Cancel your CTPL insurance or transfer it to the buyer.
- Save the transaction record for at least 3 years.
$MD$, 20, true),

  ('ph','import','Import laws',
$MD$
Philippine used-vehicle imports are heavily restricted. Only specific channels are permitted.

**Restrictions:**
- Executive Order 156 prohibits importation of used motor vehicles into the customs territory (with narrow exceptions).
- **Allowed:** returning residents (balikbayan) who owned the vehicle abroad for at least 12 months, diplomats, and vehicles imported through the Subic Bay Freeport Zone (SBFZ) or Cagayan Special Economic Zone.
- Left-hand-drive only. Right-hand-drive conversion is prohibited on public roads.
- Age caps vary by channel; SBFZ historically allowed vehicles up to ~5 years old.

**Duties & taxes (BOC):**
- Import duty: 30% (used) or 30% (new, ASEAN preferential rates may apply under ATIGA)
- VAT: 12%
- Excise tax: 4% – 50% based on net manufacturer's price
- Ad valorem tax on luxury vehicles

**Homologation:** DTI-BPS / DENR emissions compliance required for road use.
$MD$, 30, true),

  ('ph','export','Export laws',
$MD$
Vehicles registered in the Philippines can be exported after LTO deregistration.

**Steps:**
1. Settle any outstanding registration or Alarm Report at LTO.
2. Obtain a **PNP-HPG Motor Vehicle Clearance** confirming the unit is clear.
3. Apply for LTO **Certificate of Deregistration** for export.
4. File a **BOC Export Declaration** with commercial invoice and packing list.
5. Book with a licensed customs broker for RoRo or container shipment.
6. Buyer's country requirements (age caps, LHD/RHD, homologation) must be met before shipment.

**ATA Carnet** — for temporary export (rallies, shows, motorsport), the Philippine Chamber of Commerce and Industry (PCCI) issues carnets.
$MD$, 40, true),

  ('ph','insurance','Insurance',
$MD$
**Mandatory: CTPL** (Compulsory Third-Party Liability) — covers bodily injury or death to third parties, up to ₱100,000 per victim. Required for every vehicle registration renewal. Typical cost: ₱600–₱1,200 per year for private cars.

**Optional: Comprehensive** — covers own damage, theft, acts of nature, third-party property damage, and personal accident. Typical cost: 1.5%–3% of the vehicle's fair market value per year.

**Common local providers:** Malayan, Standard Insurance, Prudential Guarantee, FPG, Charter Ping An, MAPFRE Insular, Stronghold, PGA Sompo.

**Insurance Commission (IC)** regulates all motor insurance in the Philippines. Complaints can be filed at insurance.gov.ph.
$MD$, 50, true),

  ('ph','documents','Document reference',
$MD$
Below is a quick summary of the documents Filipino buyers and sellers encounter. Full descriptions are in the Document Reference table on this page.
$MD$, 60, true);

-- PH documents
INSERT INTO public.doc_check_documents (country_code, code, name, description_md, who_issues, typical_cost, validity, sort_order) VALUES
  ('ph','or','Official Receipt (OR)','Proof that the current year''s registration fees, CTPL, and emissions were paid. Renewed annually.','LTO','₱2,500 – ₱8,000 per year','1 year',10),
  ('ph','cr','Certificate of Registration (CR)','The vehicle''s title equivalent — shows the registered owner, plate, chassis, and engine numbers, and encumbrance status.','LTO','Included with registration','Lifetime (updated on transfer)',20),
  ('ph','deed_of_sale','Notarized Deed of Absolute Sale','Legal document transferring ownership from seller to buyer. Must be signed in front of a notary public with 2 valid IDs each.','Notary Public','₱200 – ₱500 notarial fee','N/A',30),
  ('ph','pnp_hpg','PNP-HPG Motor Vehicle Clearance','Confirms the unit is not stolen, carnapped, or wanted. Includes macro-etching of chassis and engine numbers.','PNP Highway Patrol Group','₱300 – ₱600','2 months',40),
  ('ph','emission','Emission Test Certificate','Confirms the vehicle meets Philippine Clean Air Act emission standards.','LTO-accredited PETCs','₱450 – ₱600','60 days',50),
  ('ph','ctpl','CTPL Insurance Certificate','Compulsory Third-Party Liability. Mandatory for every registration.','Insurance provider (IC-regulated)','₱600 – ₱1,200','1 year',60),
  ('ph','valid_id','Two valid government IDs','Any two of: PhilID, Passport, Driver''s License, UMID, PRC, Postal ID. Required by both notary and LTO.','Government agencies','Free – ₱500','Varies',70),
  ('ph','tin','TIN (Tax Identification Number)','Required on the Deed of Sale and LTO transfer form.','BIR','Free','Lifetime',80);

-- PH agency links
INSERT INTO public.doc_check_agency_links (country_code, section_kind, label, url, sort_order) VALUES
  ('ph', NULL, 'Land Transportation Office (LTO)', 'https://lto.gov.ph', 10),
  ('ph', NULL, 'Bureau of Customs (BOC)', 'https://customs.gov.ph', 20),
  ('ph', NULL, 'Insurance Commission', 'https://insurance.gov.ph', 30),
  ('ph', NULL, 'DTI Fair Trade Enforcement Bureau', 'https://dti.gov.ph/fair-trade/', 40),
  ('ph', NULL, 'PNP Highway Patrol Group', 'https://hpg.pnp.gov.ph', 50),
  ('ph', 'import', 'BOC Import Assessment', 'https://customs.gov.ph/import-assessment/', 60),
  ('ph', 'export', 'BOC Export Guidelines', 'https://customs.gov.ph/export/', 70);

-- Stub sections for each other country: a Quick Guide placeholder and empty other sections
INSERT INTO public.doc_check_sections (country_code, kind, title, body_md, sort_order, is_published)
SELECT c.code, 'quick_guide', 'Quick Guide — ' || c.name,
       'Content for ' || c.name || ' is being compiled. If you have local expertise in vehicle transfer, insurance, or import/export laws for ' || c.name || ', please contact us and we will credit your contribution.',
       1, true
FROM public.doc_check_countries c
WHERE c.code <> 'ph';


-- ============================================================================
-- SOURCE MIGRATION: 20260713044701_64bcbe3c-76cf-4ed0-ba80-4e9c57766705.sql
-- ============================================================================
-- Shop Manager isolated schema import (chunk 01/10: schema + enums + sequences)
CREATE SCHEMA IF NOT EXISTS shop_manager;
GRANT USAGE ON SCHEMA shop_manager TO authenticated, service_role, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA shop_manager GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA shop_manager GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA shop_manager GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA shop_manager GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

CREATE TYPE shop_manager.app_role AS ENUM ('owner', 'admin', 'manager', 'parts_manager', 'service_advisor', 'technician', 'reception', 'other_staff', 'customer', 'marketing', 'deckhand', 'boson', 'mate', 'captain', 'chief_engineer', 'marine_engineer', 'fishing_master', 'crane_operator', 'rigger', 'diver', 'dispatch', 'truck_driver', 'office_admin', 'operations_manager', 'yard', 'yard_manager', 'welder', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'developer');
CREATE TYPE shop_manager.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE shop_manager.equipment_status AS ENUM ('operational', 'maintenance', 'down', 'retired');
CREATE TYPE shop_manager.equipment_type AS ENUM ('marine', 'forklift', 'semi', 'small_engine', 'other', 'fleet_vehicle', 'courtesy_car', 'rental_vehicle', 'service_vehicle', 'heavy_truck', 'excavator', 'loader', 'dozer', 'crane', 'vessel', 'outboard', 'diagnostic', 'lifting', 'air_tools', 'hand_tools', 'electrical', 'generator', 'fire_extinguisher', 'life_raft', 'life_ring', 'epirb', 'survival_suit', 'flare', 'first_aid_kit', 'safety_harness', 'life_jacket', 'immersion_suit', 'fuel_truck');
CREATE TYPE shop_manager.forklift_item_status AS ENUM ('good', 'attention', 'bad', 'na');
CREATE TYPE shop_manager.form_field_type AS ENUM ('text', 'textarea', 'number', 'select', 'checkbox', 'radio', 'date', 'email', 'phone', 'file', 'signature');
CREATE TYPE shop_manager.gunsmith_role_type AS ENUM ('shop_owner', 'master_gunsmith', 'gunsmith', 'apprentice', 'counter_staff', 'parts_manager', 'manager', 'sales', 'reception', 'shipping');
CREATE TYPE shop_manager.job_line_status AS ENUM ('pending', 'signed-onto-task', 'in-progress', 'waiting-for-parts', 'paused', 'awaiting-approval', 'quality-check', 'completed', 'on-hold', 'ready-for-delivery', 'needs-road-test', 'tech-support', 'warranty', 'sublet', 'customer-auth-required', 'parts-ordered', 'parts-arrived', 'rework-required');
CREATE TYPE shop_manager.maintenance_request_status AS ENUM ('pending', 'approved', 'in_progress', 'completed', 'rejected');
CREATE TYPE shop_manager.permission_type AS ENUM ('create', 'read', 'update', 'delete');
CREATE TYPE shop_manager.product_type AS ENUM ('affiliate', 'suggested');
CREATE TYPE shop_manager.report_type AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE shop_manager.resource_type AS ENUM ('users', 'roles', 'settings', 'billing', 'work_orders', 'inventory', 'appointments', 'reports', 'customers');
CREATE TYPE shop_manager.role_action_type AS ENUM ('added', 'removed', 'modified');
CREATE TYPE shop_manager.tool_condition AS ENUM ('new', 'excellent', 'good', 'fair', 'poor', 'unusable');
CREATE TYPE shop_manager.tool_status AS ENUM ('available', 'in_use', 'maintenance', 'broken', 'lost', 'retired');
CREATE TYPE shop_manager.welding_ap_status AS ENUM ('pending', 'partial', 'paid');
CREATE TYPE shop_manager.welding_customer_interaction_type AS ENUM ('email', 'phone_call', 'site_visit', 'quote_request', 'deposit', 'payment', 'follow_up', 'conversation', 'other');
CREATE TYPE shop_manager.welding_invoice_status AS ENUM ('draft', 'sent', 'unpaid', 'partial', 'paid', 'overdue');
CREATE TYPE shop_manager.welding_po_status AS ENUM ('draft', 'ordered', 'shipped', 'received', 'cancelled');
CREATE TYPE shop_manager.welding_quote_status AS ENUM ('new', 'reviewed', 'quoted', 'accepted', 'declined', 'draft', 'sent', 'approved', 'rejected');
CREATE TYPE shop_manager.welding_schedule_entry_type AS ENUM ('day_off', 'vacation', 'install_day', 'on_site', 'shop_day', 'booking', 'measurement');

CREATE SEQUENCE IF NOT EXISTS shop_manager.feature_request_number_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1 NO CYCLE;


-- ============================================================================
-- SOURCE MIGRATION: 20260713062739_e0144043-a7a4-43b7-8fc6-050ea0304634.sql
-- ============================================================================
CREATE TABLE shop_manager.appointments (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  customer_id uuid,
  vehicle_id uuid,
  advisor_id uuid,
  date timestamp with time zone NOT NULL,
  duration integer NOT NULL,
  status text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT appointments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.ar_invoice_lines (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  invoice_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric(10,2) DEFAULT 1 NOT NULL,
  unit_price numeric(12,2) DEFAULT 0 NOT NULL,
  total_price numeric(12,2) DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ar_invoice_lines_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.ar_invoices (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  customer_id uuid,
  invoice_number text NOT NULL,
  status text NOT NULL,
  issue_date date NOT NULL,
  due_date date,
  subtotal numeric(12,2) DEFAULT 0 NOT NULL,
  tax numeric(12,2) DEFAULT 0 NOT NULL,
  total numeric(12,2) DEFAULT 0 NOT NULL,
  balance_due numeric(12,2) DEFAULT 0 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  tax_rate numeric(5,2) DEFAULT 0 NOT NULL,
  CONSTRAINT ar_invoices_status_check CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'partial'::text, 'paid'::text, 'overdue'::text, 'void'::text])),
  CONSTRAINT ar_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT ar_invoices_shop_id_invoice_number_key UNIQUE (shop_id, invoice_number)
);

CREATE TABLE shop_manager.ar_payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  invoice_id uuid,
  payment_date date NOT NULL,
  amount numeric(12,2) DEFAULT 0 NOT NULL,
  payment_method text,
  reference text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ar_payments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.company_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  settings_key text NOT NULL,
  settings_value jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_settings_pkey PRIMARY KEY (id),
  CONSTRAINT company_settings_shop_id_settings_key_key UNIQUE (shop_id, settings_key)
);

CREATE TABLE shop_manager.customer_activities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  action text NOT NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  timestamp timestamp with time zone DEFAULT now() NOT NULL,
  flagged boolean DEFAULT false,
  flag_reason text,
  CONSTRAINT customer_activities_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_addresses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  address_type text NOT NULL,
  is_default boolean DEFAULT false NOT NULL,
  full_name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text DEFAULT 'US'::text NOT NULL,
  phone text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_addresses_address_type_check CHECK (address_type = ANY (ARRAY['shipping'::text, 'billing'::text, 'both'::text])),
  CONSTRAINT customer_addresses_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_automation_preferences (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  service_reminders boolean DEFAULT true,
  marketing_emails boolean DEFAULT true,
  preferred_contact_time text DEFAULT 'business_hours'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customer_automation_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT customer_automation_preferences_customer_id_key UNIQUE (customer_id)
);

CREATE TABLE shop_manager.customer_communications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  date timestamp with time zone DEFAULT now() NOT NULL,
  type text NOT NULL,
  direction text NOT NULL,
  subject text,
  content text NOT NULL,
  staff_member_id text NOT NULL,
  staff_member_name text NOT NULL,
  status text NOT NULL,
  template_id uuid,
  template_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_communications_direction_check CHECK (direction = ANY (ARRAY['incoming'::text, 'outgoing'::text])),
  CONSTRAINT customer_communications_status_check CHECK (status = ANY (ARRAY['completed'::text, 'pending'::text, 'failed'::text])),
  CONSTRAINT customer_communications_type_check CHECK (type = ANY (ARRAY['email'::text, 'phone'::text, 'text'::text, 'in-person'::text])),
  CONSTRAINT customer_communications_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  original_name text NOT NULL,
  title text NOT NULL,
  description text,
  version integer DEFAULT 1 NOT NULL,
  version_notes text,
  tags text[] DEFAULT '{}'::text[],
  category uuid,
  is_shared boolean DEFAULT false NOT NULL,
  uploaded_by text NOT NULL,
  uploaded_by_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_documents_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_form_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  form_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_form_comments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_interactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  customer_name text NOT NULL,
  date timestamp with time zone DEFAULT now() NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  staff_member_id text NOT NULL,
  staff_member_name text NOT NULL,
  status text NOT NULL,
  notes text,
  related_work_order_id uuid,
  follow_up_date timestamp with time zone,
  follow_up_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_interactions_status_check CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  CONSTRAINT customer_interactions_type_check CHECK (type = ANY (ARRAY['work_order'::text, 'communication'::text, 'parts'::text, 'service'::text, 'follow_up'::text])),
  CONSTRAINT customer_interactions_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_loyalty (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid,
  current_points integer DEFAULT 0,
  lifetime_points integer DEFAULT 0,
  lifetime_value numeric DEFAULT 0.0,
  tier character varying(50) DEFAULT 'Standard'::character varying,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_loyalty_pkey PRIMARY KEY (id),
  CONSTRAINT customer_loyalty_customer_id_key UNIQUE (customer_id)
);

CREATE TABLE shop_manager.customer_notes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general'::text NOT NULL,
  created_by text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_notes_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_payment_methods (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  payment_type text NOT NULL,
  provider text NOT NULL,
  last_four text,
  expiry_month integer,
  expiry_year integer,
  is_default boolean DEFAULT false,
  stripe_payment_method_id text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_payment_methods_payment_type_check CHECK (payment_type = ANY (ARRAY['card'::text, 'paypal'::text, 'bank'::text])),
  CONSTRAINT customer_payment_methods_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  first_name text,
  last_name text,
  phone text,
  date_of_birth date,
  preferences jsonb DEFAULT '{}'::jsonb,
  marketing_consent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_property_areas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  area_type text NOT NULL,
  label text,
  square_footage integer NOT NULL,
  length_ft numeric(10,2),
  width_ft numeric(10,2),
  height_ft numeric(10,2),
  notes text,
  last_serviced_at timestamp with time zone,
  service_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_property_areas_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_provided_forms (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  customer_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  upload_date timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  tags text[] DEFAULT '{}'::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT customer_provided_forms_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_referrals (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_date timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  converted_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_referrals_pkey PRIMARY KEY (id),
  CONSTRAINT customer_referrals_referrer_id_referred_id_key UNIQUE (referrer_id, referred_id)
);

CREATE TABLE shop_manager.customer_segment_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid,
  segment_id uuid,
  is_automatic boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_segment_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT customer_segment_assignments_customer_id_segment_id_key UNIQUE (customer_id, segment_id)
);

CREATE TABLE shop_manager.customer_segments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  color text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_segments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_shop_relationships (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  joined_at timestamp with time zone DEFAULT now() NOT NULL,
  booking_enabled boolean DEFAULT true NOT NULL,
  CONSTRAINT customer_shop_relationships_pkey PRIMARY KEY (id),
  CONSTRAINT customer_shop_relationships_customer_id_shop_id_key UNIQUE (customer_id, shop_id)
);

CREATE TABLE shop_manager.customer_touchpoints (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  touchpoint_type text NOT NULL,
  channel text NOT NULL,
  campaign_id uuid,
  action text NOT NULL,
  metadata jsonb,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_touchpoints_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_uploaded_forms (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid,
  customer_id uuid,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  tags text[] DEFAULT '{}'::text[],
  category_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_uploaded_forms_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'digitized'::text])),
  CONSTRAINT customer_uploaded_forms_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  household_id uuid,
  segments jsonb,
  referral_person_id uuid,
  city text,
  state text,
  postal_code text,
  country text,
  company text,
  notes text,
  tags jsonb,
  preferred_technician_id text,
  communication_preference text,
  referral_source text,
  other_referral_details text,
  is_fleet boolean DEFAULT false,
  fleet_company text,
  auto_billing boolean DEFAULT false,
  credit_terms text,
  terms_agreed boolean DEFAULT false,
  business_type text,
  business_industry text,
  other_business_industry text,
  tax_id text,
  business_email text,
  business_phone text,
  fleet_manager text,
  fleet_contact text,
  preferred_payment_method text,
  preferred_service_type text,
  auth_user_id uuid,
  labor_tax_exempt boolean DEFAULT false,
  parts_tax_exempt boolean DEFAULT false,
  tax_exempt_certificate_number text,
  tax_exempt_notes text,
  user_id uuid,
  latitude double precision,
  longitude double precision,
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.discount_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  discount_id uuid NOT NULL,
  discount_table text NOT NULL,
  action_type text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by text NOT NULL,
  performed_at timestamp with time zone DEFAULT now() NOT NULL,
  reason text,
  CONSTRAINT discount_audit_log_action_type_check CHECK (action_type = ANY (ARRAY['created'::text, 'modified'::text, 'deleted'::text, 'approved'::text, 'rejected'::text])),
  CONSTRAINT discount_audit_log_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.discount_code_usage (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  discount_code_id uuid,
  order_id uuid,
  user_id uuid,
  discount_amount numeric(10,2) NOT NULL,
  used_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT discount_code_usage_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.discount_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL,
  discount_value numeric(10,2) NOT NULL,
  minimum_order_amount numeric(10,2) DEFAULT 0,
  maximum_discount_amount numeric(10,2),
  usage_limit integer,
  usage_count integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now() NOT NULL,
  valid_until timestamp with time zone,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT discount_codes_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text, 'free_shipping'::text])),
  CONSTRAINT discount_codes_pkey PRIMARY KEY (id),
  CONSTRAINT discount_codes_code_key UNIQUE (code)
);

CREATE TABLE shop_manager.discount_types (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL,
  default_value numeric DEFAULT 0 NOT NULL,
  applies_to text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  requires_approval boolean DEFAULT false NOT NULL,
  max_discount_amount numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text NOT NULL,
  CONSTRAINT discount_types_applies_to_check CHECK (applies_to = ANY (ARRAY['labor'::text, 'parts'::text, 'work_order'::text, 'any'::text])),
  CONSTRAINT discount_types_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  CONSTRAINT discount_types_pkey PRIMARY KEY (id),
  CONSTRAINT discount_types_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.employee_accommodations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid,
  employee_id uuid,
  accommodation_type text NOT NULL,
  description text NOT NULL,
  start_date date,
  end_date date,
  is_permanent boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamp with time zone,
  status text DEFAULT 'active'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employee_accommodations_accommodation_type_check CHECK (accommodation_type = ANY (ARRAY['medical'::text, 'religious'::text, 'personal'::text, 'disability'::text, 'other'::text])),
  CONSTRAINT employee_accommodations_status_check CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'expired'::text])),
  CONSTRAINT employee_accommodations_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.employee_availability (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  day_of_week integer NOT NULL,
  available_start time without time zone NOT NULL,
  available_end time without time zone NOT NULL,
  is_available boolean DEFAULT true,
  recurring boolean DEFAULT true,
  effective_from date DEFAULT CURRENT_DATE NOT NULL,
  effective_until date,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT employee_availability_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT valid_time_range CHECK (available_end > available_start),
  CONSTRAINT employee_availability_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.employee_leave_balances (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  leave_type_id uuid NOT NULL,
  balance_hours numeric(10,2) DEFAULT 0,
  used_hours numeric(10,2) DEFAULT 0,
  pending_hours numeric(10,2) DEFAULT 0,
  accrued_ytd numeric(10,2) DEFAULT 0,
  carry_over_hours numeric(10,2) DEFAULT 0,
  year integer DEFAULT EXTRACT(year FROM CURRENT_DATE) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT employee_leave_balances_pkey PRIMARY KEY (id),
  CONSTRAINT employee_leave_balances_employee_id_leave_type_id_year_key UNIQUE (employee_id, leave_type_id, year)
);

CREATE TABLE shop_manager.household_members (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  household_id uuid,
  customer_id uuid,
  relationship_type text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT household_members_pkey PRIMARY KEY (id),
  CONSTRAINT household_members_household_id_customer_id_key UNIQUE (household_id, customer_id)
);

CREATE TABLE shop_manager.households (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  address text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT households_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  sku text NOT NULL,
  description text,
  part_number text,
  barcode text,
  category text,
  subcategory text,
  manufacturer text,
  vehicle_compatibility text,
  location text,
  status text DEFAULT 'active'::text,
  supplier text,
  quantity integer DEFAULT 0,
  measurement_unit text,
  on_hold integer DEFAULT 0,
  on_order integer DEFAULT 0,
  reorder_point integer DEFAULT 0,
  min_stock_level integer DEFAULT 0,
  max_stock_level integer DEFAULT 0,
  unit_price numeric DEFAULT 0,
  sell_price_per_unit numeric DEFAULT 0,
  cost_per_unit numeric DEFAULT 0,
  margin_markup numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_exempt boolean DEFAULT false,
  environmental_fee numeric DEFAULT 0,
  core_charge numeric DEFAULT 0,
  hazmat_fee numeric DEFAULT 0,
  weight numeric DEFAULT 0,
  dimensions text,
  color text,
  material text,
  model_year text,
  oem_part_number text,
  universal_part boolean DEFAULT false,
  warranty_period text,
  date_bought text,
  date_last text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_sku_key UNIQUE (sku)
);

CREATE TABLE shop_manager.inventory_adjustments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid,
  inventory_item_id uuid,
  quantity integer NOT NULL,
  adjustment_type text NOT NULL,
  adjusted_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_adjustments_adjustment_type_check CHECK (adjustment_type = ANY (ARRAY['reserve'::text, 'consume'::text, 'return'::text])),
  CONSTRAINT inventory_adjustments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_alerts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid,
  variant_id uuid,
  alert_type text NOT NULL,
  threshold_value integer NOT NULL,
  current_value integer NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  message text,
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  resolved_at timestamp with time zone,
  notification_sent boolean DEFAULT false,
  CONSTRAINT inventory_alerts_check CHECK (product_id IS NOT NULL AND variant_id IS NULL OR product_id IS NULL AND variant_id IS NOT NULL),
  CONSTRAINT inventory_alerts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_auto_reorder (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  item_id uuid,
  enabled boolean DEFAULT false NOT NULL,
  threshold integer DEFAULT 5 NOT NULL,
  quantity integer DEFAULT 10 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_auto_reorder_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  CONSTRAINT inventory_categories_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_categories_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.inventory_consumption_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  quantity_consumed numeric(10,2) NOT NULL,
  usage_metric text NOT NULL,
  usage_value numeric(10,2) NOT NULL,
  service_package_id uuid,
  work_order_id uuid,
  consumed_at timestamp with time zone DEFAULT now() NOT NULL,
  notes text,
  CONSTRAINT inventory_consumption_history_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_consumption_rates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  usage_metric text NOT NULL,
  consumption_per_unit numeric(10,4) NOT NULL,
  average_consumption numeric(10,4),
  variance_percentage numeric(5,2),
  last_calculated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_consumption_rates_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_forecasts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  forecast_type text NOT NULL,
  predicted_runout_date date,
  predicted_runout_usage numeric(10,2),
  current_stock numeric(10,2) NOT NULL,
  average_consumption_rate numeric(10,4) NOT NULL,
  confidence_level numeric(5,2),
  recommended_reorder_date date,
  recommended_reorder_quantity numeric(10,2),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_forecasts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  sku text NOT NULL,
  category text NOT NULL,
  supplier text NOT NULL,
  quantity integer DEFAULT 0 NOT NULL,
  reorder_point integer DEFAULT 10 NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  location text,
  status text DEFAULT 'In Stock'::text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  shop_id uuid,
  quantity_in_stock integer,
  part_number text,
  barcode text,
  subcategory text,
  manufacturer text,
  vehicle_compatibility text,
  on_hold integer DEFAULT 0,
  on_order integer DEFAULT 0,
  margin_markup numeric(10,2) DEFAULT 0,
  sell_price_per_unit numeric(10,2) DEFAULT 0,
  cost_per_unit numeric(10,2) DEFAULT 0,
  weight numeric(10,2) DEFAULT 0,
  dimensions text,
  warranty_period text,
  date_bought date,
  date_last date,
  notes text,
  web_links jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT inventory_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_locations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  type text,
  parent_id uuid,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_locations_type_check CHECK (type = ANY (ARRAY['warehouse'::text, 'section'::text, 'shelf'::text, 'bin'::text])),
  CONSTRAINT inventory_locations_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  item_id uuid,
  order_date timestamp with time zone DEFAULT now() NOT NULL,
  expected_arrival date NOT NULL,
  quantity_ordered integer NOT NULL,
  quantity_received integer DEFAULT 0 NOT NULL,
  supplier text NOT NULL,
  status text DEFAULT 'ordered'::text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_purchase_order_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  purchase_order_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  quantity integer NOT NULL,
  quantity_received integer DEFAULT 0,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_purchase_order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT inventory_purchase_order_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_purchase_orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  vendor_id uuid,
  status text DEFAULT 'draft'::text NOT NULL,
  order_date timestamp with time zone DEFAULT now() NOT NULL,
  expected_delivery_date timestamp with time zone,
  received_date timestamp with time zone,
  total_amount numeric,
  created_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  received_by uuid,
  po_number text DEFAULT ('PO-'::text || nextval('shop_manager.feature_request_number_seq'::regclass)),
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_purchase_orders_status_check CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'partially_received'::text, 'received'::text, 'cancelled'::text])),
  CONSTRAINT inventory_purchase_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_seasonal_factors (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid,
  category text,
  month integer NOT NULL,
  adjustment_factor numeric(5,2) DEFAULT 1.0 NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_seasonal_factors_month_check CHECK (month >= 1 AND month <= 12),
  CONSTRAINT inventory_seasonal_factors_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  low_stock_threshold integer DEFAULT 5,
  auto_reorder_enabled boolean DEFAULT false,
  default_supplier_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_settings_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_settings_shop_id_key UNIQUE (shop_id)
);

CREATE TABLE shop_manager.inventory_suppliers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  website text,
  payment_terms text,
  lead_time_days integer,
  is_active boolean DEFAULT true NOT NULL,
  notes text,
  type text,
  region text,
  CONSTRAINT inventory_suppliers_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_suppliers_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.inventory_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  transaction_type text NOT NULL,
  quantity integer NOT NULL,
  transaction_date timestamp with time zone DEFAULT now() NOT NULL,
  reference_type text,
  reference_id uuid,
  performed_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_transactions_transaction_type_check CHECK (transaction_type = ANY (ARRAY['purchase'::text, 'sale'::text, 'adjustment'::text, 'transfer'::text, 'return'::text, 'write-off'::text])),
  CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_vendors (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  website text,
  payment_terms text,
  lead_time_days integer,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_vendors_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoice_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  invoice_id text NOT NULL,
  name text NOT NULL,
  description text,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  total numeric NOT NULL,
  hours boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoice_staff (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  invoice_id text NOT NULL,
  staff_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_staff_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoice_template_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  template_id uuid,
  name text NOT NULL,
  description text,
  quantity numeric DEFAULT 1,
  price numeric NOT NULL,
  total numeric,
  hours boolean DEFAULT false,
  sku text,
  category text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_template_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoice_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  default_tax_rate numeric DEFAULT 0.08,
  default_due_date_days integer DEFAULT 30,
  default_notes text,
  created_at timestamp with time zone DEFAULT now(),
  last_used timestamp with time zone,
  usage_count integer DEFAULT 0,
  CONSTRAINT invoice_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoices (
  id text NOT NULL,
  customer text NOT NULL,
  customer_address text,
  customer_email text,
  description text,
  notes text,
  date text NOT NULL,
  due_date text NOT NULL,
  status text NOT NULL,
  work_order_id text,
  created_by text,
  subtotal numeric,
  tax numeric,
  total numeric,
  payment_method text,
  created_at timestamp with time zone DEFAULT now(),
  last_updated_by text,
  last_updated_at timestamp with time zone,
  customer_id uuid,
  CONSTRAINT invoices_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.job_line_discounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  job_line_id uuid NOT NULL,
  discount_type_id uuid,
  discount_name text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  discount_amount numeric NOT NULL,
  reason text,
  approved_by text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text NOT NULL,
  CONSTRAINT job_line_discounts_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  CONSTRAINT job_line_discounts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.labor_rates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  standard_rate numeric DEFAULT 125.00 NOT NULL,
  diagnostic_rate numeric DEFAULT 145.00 NOT NULL,
  emergency_rate numeric DEFAULT 175.00 NOT NULL,
  warranty_rate numeric DEFAULT 95.00 NOT NULL,
  internal_rate numeric DEFAULT 85.00 NOT NULL,
  diy_rate numeric DEFAULT 65.00 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT labor_rates_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.part_discounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  part_id uuid NOT NULL,
  discount_type_id uuid,
  discount_name text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  discount_amount numeric NOT NULL,
  reason text,
  approved_by text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text NOT NULL,
  CONSTRAINT part_discounts_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  CONSTRAINT part_discounts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.part_warranties (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  inventory_item_id uuid,
  work_order_id uuid,
  equipment_id uuid,
  vehicle_id uuid,
  part_name character varying(200) NOT NULL,
  part_number character varying(100),
  serial_number character varying(100),
  manufacturer character varying(200),
  installed_date date NOT NULL,
  warranty_months integer,
  warranty_miles integer,
  warranty_hours integer,
  expiry_date date NOT NULL,
  purchase_price numeric(10,2),
  warranty_value numeric(10,2),
  coverage_description text,
  document_url text,
  notes text,
  status character varying(20) DEFAULT 'active'::character varying,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  CONSTRAINT part_warranties_status_check CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'expired'::character varying::text, 'claimed'::character varying::text, 'voided'::character varying::text])),
  CONSTRAINT part_warranties_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.parts_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT parts_categories_pkey PRIMARY KEY (id),
  CONSTRAINT parts_categories_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.parts_inventory (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  part_number text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  quantity integer DEFAULT 0 NOT NULL,
  min_quantity integer DEFAULT 0,
  cost_price numeric,
  retail_price numeric,
  location text,
  security_invoker boolean DEFAULT true,
  security_barrier boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT parts_inventory_pkey PRIMARY KEY (id)
);
