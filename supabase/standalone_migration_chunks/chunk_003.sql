-- 365 standalone migration package | chunk_003.sql | 67 source migrations
-- Byte-for-byte concatenation of supabase/migrations. No SQL modified.

-- ===== BEGIN SOURCE MIGRATION: 20260605033802_58c5391b-eb0e-40fd-babd-8203a211081e.sql =====
-- 1. Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_junior';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_senior';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_manager';

-- Commit enum changes before they can be referenced
COMMIT;
BEGIN;

-- 2. Sales tier helper: manager > senior > junior. Legacy 'sales' role = senior.
CREATE OR REPLACE FUNCTION public.has_sales_tier(_user_id uuid, _min_tier text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH r AS (
    SELECT role::text AS role FROM public.user_roles WHERE user_id = _user_id
  ),
  level AS (
    SELECT GREATEST(
      CASE WHEN EXISTS (SELECT 1 FROM r WHERE role = 'admin') THEN 3 ELSE 0 END,
      CASE WHEN EXISTS (SELECT 1 FROM r WHERE role = 'sales_manager') THEN 3 ELSE 0 END,
      CASE WHEN EXISTS (SELECT 1 FROM r WHERE role IN ('sales_senior','sales')) THEN 2 ELSE 0 END,
      CASE WHEN EXISTS (SELECT 1 FROM r WHERE role = 'sales_junior') THEN 1 ELSE 0 END
    ) AS lvl
  )
  SELECT (SELECT lvl FROM level) >= CASE _min_tier
    WHEN 'junior' THEN 1
    WHEN 'senior' THEN 2
    WHEN 'manager' THEN 3
    ELSE 99
  END;
$$;

-- 3. customer_discounts table
CREATE TABLE IF NOT EXISTS public.customer_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_business_id uuid,
  kind text NOT NULL CHECK (kind IN ('percent','flat')),
  percent_off numeric,
  flat_amount_php numeric,
  applies_to text NOT NULL DEFAULT 'any',
  reason text,
  expires_at timestamptz,
  issued_by uuid NOT NULL REFERENCES auth.users(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (target_user_id IS NOT NULL OR target_business_id IS NOT NULL),
  CHECK (
    (kind = 'percent' AND percent_off IS NOT NULL AND percent_off > 0 AND percent_off <= 100) OR
    (kind = 'flat' AND flat_amount_php IS NOT NULL AND flat_amount_php > 0)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_discounts TO authenticated;
GRANT ALL ON public.customer_discounts TO service_role;

ALTER TABLE public.customer_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and admins manage customer discounts"
  ON public.customer_discounts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_sales_tier(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_sales_tier(auth.uid(), 'manager'));

CREATE POLICY "Users can view their own discounts"
  ON public.customer_discounts FOR SELECT
  TO authenticated
  USING (target_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_customer_discounts_updated_at ON public.customer_discounts;
CREATE TRIGGER trg_customer_discounts_updated_at
  BEFORE UPDATE ON public.customer_discounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Grant Joan sales_manager role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'sales_manager'::public.app_role
FROM auth.users
WHERE lower(email) = 'jordilwbailey@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260605033802_58c5391b-eb0e-40fd-babd-8203a211081e.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260605033831_236da73f-d912-4947-a953-a016ec283c83.sql =====
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
-- ===== END SOURCE MIGRATION: 20260605033831_236da73f-d912-4947-a953-a016ec283c83.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260605043935_47d06dfd-d146-4628-b75e-d0c94e3b40f0.sql =====
ALTER TYPE public.seller_type ADD VALUE IF NOT EXISTS 'staff';
-- ===== END SOURCE MIGRATION: 20260605043935_47d06dfd-d146-4628-b75e-d0c94e3b40f0.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260605044520_a8fe8551-55be-4c4f-87b2-3c223bbf1dd2.sql =====
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- ===== END SOURCE MIGRATION: 20260605044520_a8fe8551-55be-4c4f-87b2-3c223bbf1dd2.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260605050625_ab3ca880-2df9-4ae9-865f-cd1ca5c84255.sql =====

-- ========== sales_rep_profiles ==========
CREATE TABLE public.sales_rep_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  accepting_new_clients boolean NOT NULL DEFAULT true,
  title text,
  bio text,
  public_email text,
  public_phone text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_rep_profiles TO authenticated;
GRANT ALL ON public.sales_rep_profiles TO service_role;
ALTER TABLE public.sales_rep_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rep can view own profile" ON public.sales_rep_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Rep can upsert own profile" ON public.sales_rep_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Rep can update own profile" ON public.sales_rep_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all rep profiles" ON public.sales_rep_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_sales_rep_profiles_updated BEFORE UPDATE ON public.sales_rep_profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== sales_rep_territories ==========
CREATE TABLE public.sales_rep_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region text NOT NULL,
  province text,
  city text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_rep_territories_rep ON public.sales_rep_territories(rep_user_id);
CREATE INDEX idx_sales_rep_territories_geo ON public.sales_rep_territories(region, province, city);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_rep_territories TO authenticated;
GRANT ALL ON public.sales_rep_territories TO service_role;
ALTER TABLE public.sales_rep_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rep manages own territories" ON public.sales_rep_territories FOR ALL TO authenticated USING (auth.uid() = rep_user_id) WITH CHECK (auth.uid() = rep_user_id);
CREATE POLICY "Admins manage all territories" ON public.sales_rep_territories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- ========== enums ==========
CREATE TYPE public.sales_rep_subject AS ENUM ('user','business');
CREATE TYPE public.sales_rep_source AS ENUM ('referral','manual','territory','customer_choice');

-- ========== sales_rep_assignments ==========
CREATE TABLE public.sales_rep_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_type public.sales_rep_subject NOT NULL,
  subject_id uuid NOT NULL,
  source public.sales_rep_source NOT NULL DEFAULT 'manual',
  active boolean NOT NULL DEFAULT true,
  notes text,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uniq_active_assignment ON public.sales_rep_assignments(subject_type, subject_id) WHERE active;
CREATE INDEX idx_sales_rep_assignments_rep ON public.sales_rep_assignments(rep_user_id) WHERE active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_rep_assignments TO authenticated;
GRANT ALL ON public.sales_rep_assignments TO service_role;
ALTER TABLE public.sales_rep_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rep views own assignments" ON public.sales_rep_assignments FOR SELECT TO authenticated USING (auth.uid() = rep_user_id);
CREATE POLICY "Admins manage all assignments" ON public.sales_rep_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_sales_rep_assignments_updated BEFORE UPDATE ON public.sales_rep_assignments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== sales_rep_followups ==========
CREATE TYPE public.followup_kind AS ENUM ('note','call','email','sms','meeting','request');
CREATE TYPE public.followup_status AS ENUM ('open','done','snoozed');

CREATE TABLE public.sales_rep_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_type public.sales_rep_subject NOT NULL,
  subject_id uuid NOT NULL,
  kind public.followup_kind NOT NULL DEFAULT 'note',
  status public.followup_status NOT NULL DEFAULT 'open',
  title text NOT NULL,
  body text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_followups_rep_status ON public.sales_rep_followups(rep_user_id, status);
CREATE INDEX idx_followups_subject ON public.sales_rep_followups(subject_type, subject_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_rep_followups TO authenticated;
GRANT ALL ON public.sales_rep_followups TO service_role;
ALTER TABLE public.sales_rep_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rep manages own followups" ON public.sales_rep_followups FOR ALL TO authenticated USING (auth.uid() = rep_user_id) WITH CHECK (auth.uid() = rep_user_id);
CREATE POLICY "Admins manage all followups" ON public.sales_rep_followups FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_sales_rep_followups_updated BEFORE UPDATE ON public.sales_rep_followups FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== Helper: safe customer-facing rep lookup ==========
CREATE OR REPLACE FUNCTION public.get_assigned_rep_card(_subject_type text, _subject_id uuid)
RETURNS TABLE (
  rep_user_id uuid, full_name text, title text, bio text, photo_url text,
  public_email text, public_phone text, accepting_new_clients boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    a.rep_user_id,
    COALESCE(NULLIF(p.full_name,''), p.first_name, au.email) AS full_name,
    sp.title, sp.bio,
    COALESCE(sp.photo_url, p.avatar_url) AS photo_url,
    COALESCE(sp.public_email, au.email) AS public_email,
    COALESCE(sp.public_phone, p.phone_e164, p.phone) AS public_phone,
    COALESCE(sp.accepting_new_clients, true) AS accepting_new_clients
  FROM public.sales_rep_assignments a
  LEFT JOIN public.sales_rep_profiles sp ON sp.user_id = a.rep_user_id
  LEFT JOIN public.profiles p ON p.id = a.rep_user_id
  LEFT JOIN auth.users au ON au.id = a.rep_user_id
  WHERE a.active = true
    AND a.subject_type::text = _subject_type
    AND a.subject_id = _subject_id
    AND (
      (_subject_type = 'user' AND a.subject_id = auth.uid())
      OR a.rep_user_id = auth.uid()
      OR public.has_role(auth.uid(),'admin'::app_role)
      OR (_subject_type = 'business' AND EXISTS (
        SELECT 1 FROM public.businesses b WHERE b.id = a.subject_id AND b.owner_id = auth.uid()
      ))
    )
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_assigned_rep_card(text, uuid) TO authenticated;

-- ========== Auto-assign on staff referral signup ==========
CREATE OR REPLACE FUNCTION public.tg_auto_assign_sales_rep()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_staff_user uuid;
BEGIN
  IF NEW.referred_by_staff_id IS NULL THEN RETURN NEW; END IF;
  SELECT staff_user_id INTO v_staff_user FROM public.staff_referrals WHERE id = NEW.referred_by_staff_id;
  IF v_staff_user IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_staff_user AND role::text = 'sales') THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.sales_rep_assignments(rep_user_id, subject_type, subject_id, source, assigned_by)
  VALUES (v_staff_user, 'user', NEW.user_id, 'referral', v_staff_user)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_user_referrals_auto_assign_rep AFTER INSERT ON public.user_referrals FOR EACH ROW EXECUTE FUNCTION public.tg_auto_assign_sales_rep();

-- ========== Auto-create sales_rep_profiles for sales staff ==========
INSERT INTO public.sales_rep_profiles(user_id)
SELECT ur.user_id FROM public.user_roles ur WHERE ur.role::text = 'sales'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.tg_create_sales_rep_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role::text = 'sales' THEN
    INSERT INTO public.sales_rep_profiles(user_id) VALUES (NEW.user_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_user_roles_create_sales_rep AFTER INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.tg_create_sales_rep_profile();

-- ========== Backfill: assign existing referrals to sales reps ==========
INSERT INTO public.sales_rep_assignments(rep_user_id, subject_type, subject_id, source, assigned_at)
SELECT sr.staff_user_id, 'user', ur.user_id, 'referral', COALESCE(ur.signup_date, now())
FROM public.user_referrals ur
JOIN public.staff_referrals sr ON sr.id = ur.referred_by_staff_id
JOIN public.user_roles uro ON uro.user_id = sr.staff_user_id AND uro.role::text = 'sales'
WHERE sr.staff_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260605050625_ab3ca880-2df9-4ae9-865f-cd1ca5c84255.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260605051559_26b81f60-d973-4718-9e61-9d209dd5c39d.sql =====

CREATE TABLE public.sales_rep_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  rep_user_id uuid,
  prev_rep_user_id uuid,
  subject_type text,
  subject_id uuid,
  territory_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_rep_audit_created ON public.sales_rep_audit_log (created_at DESC);
CREATE INDEX idx_sales_rep_audit_rep ON public.sales_rep_audit_log (rep_user_id);
CREATE INDEX idx_sales_rep_audit_subject ON public.sales_rep_audit_log (subject_type, subject_id);

GRANT SELECT, INSERT ON public.sales_rep_audit_log TO authenticated;
GRANT ALL ON public.sales_rep_audit_log TO service_role;

ALTER TABLE public.sales_rep_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sales rep audit log"
  ON public.sales_rep_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert sales rep audit log"
  ON public.sales_rep_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND actor_id = auth.uid());

-- ===== END SOURCE MIGRATION: 20260605051559_26b81f60-d973-4718-9e61-9d209dd5c39d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260605100219_3669f1b4-7fa9-4814-a86d-374afa871185.sql =====
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS category_slug TEXT;
CREATE INDEX IF NOT EXISTS idx_advertisements_category_sponsor ON public.advertisements (category_slug, priority DESC) WHERE status = 'active'::ad_status AND placement = 'category_banner'::ad_placement;
DROP VIEW IF EXISTS public.active_ads_public;
CREATE VIEW public.active_ads_public AS
SELECT id, title, caption, image_url, target_url, placement, category_slug, priority, starts_at, ends_at, created_at
FROM public.advertisements
WHERE status = 'active'::ad_status
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at >= now());
GRANT SELECT ON public.active_ads_public TO anon, authenticated;
-- ===== END SOURCE MIGRATION: 20260605100219_3669f1b4-7fa9-4814-a86d-374afa871185.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260605102058_3f93ff4c-c7ee-417e-90a8-e2acc69ce921.sql =====

-- 1) Unlock ledger first (so the lead_offers SELECT policy can reference it)
CREATE TABLE public.lead_offer_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL,
  buyer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  price_php NUMERIC(14,2) NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (offer_id, buyer_user_id)
);
CREATE INDEX idx_lead_offer_unlocks_buyer ON public.lead_offer_unlocks(buyer_user_id, unlocked_at DESC);
CREATE INDEX idx_lead_offer_unlocks_offer ON public.lead_offer_unlocks(offer_id);

GRANT SELECT, INSERT ON public.lead_offer_unlocks TO authenticated;
GRANT ALL ON public.lead_offer_unlocks TO service_role;

ALTER TABLE public.lead_offer_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage unlocks"
  ON public.lead_offer_unlocks
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Buyers read their own unlocks"
  ON public.lead_offer_unlocks FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_user_id);

CREATE POLICY "Buyers insert their own unlocks"
  ON public.lead_offer_unlocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_user_id);

-- 2) Lead offers table
CREATE TABLE public.lead_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug TEXT NOT NULL,
  region TEXT,
  province TEXT,
  city TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  budget_min_php NUMERIC(14,2),
  budget_max_php NUMERIC(14,2),
  urgency TEXT NOT NULL DEFAULT 'standard' CHECK (urgency IN ('low','standard','urgent')),
  preview TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_notes TEXT,
  source_kind TEXT,
  source_id UUID,
  price_php NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','sold','expired','withdrawn')),
  max_unlocks INTEGER NOT NULL DEFAULT 1,
  unlocks_count INTEGER NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_offers_open ON public.lead_offers(status, posted_at DESC) WHERE status = 'open';
CREATE INDEX idx_lead_offers_category ON public.lead_offers(category_slug) WHERE status = 'open';
CREATE INDEX idx_lead_offers_region ON public.lead_offers(region) WHERE status = 'open';

-- FK from unlocks → offers, added now that both exist
ALTER TABLE public.lead_offer_unlocks
  ADD CONSTRAINT lead_offer_unlocks_offer_id_fkey
  FOREIGN KEY (offer_id) REFERENCES public.lead_offers(id) ON DELETE CASCADE;

GRANT SELECT ON public.lead_offers TO authenticated;
GRANT ALL ON public.lead_offers TO service_role;

ALTER TABLE public.lead_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lead offers"
  ON public.lead_offers
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Buyers read their unlocked offers"
  ON public.lead_offers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lead_offer_unlocks u
      WHERE u.offer_id = lead_offers.id
        AND u.buyer_user_id = auth.uid()
    )
  );

-- 3) Public redacted view (no PII)
CREATE OR REPLACE VIEW public.lead_offers_public AS
SELECT
  id,
  category_slug,
  region,
  province,
  city,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  budget_min_php,
  budget_max_php,
  urgency,
  preview,
  price_php,
  max_unlocks,
  unlocks_count,
  posted_at,
  expires_at,
  status
FROM public.lead_offers
WHERE status = 'open'
  AND (expires_at IS NULL OR expires_at > now());

GRANT SELECT ON public.lead_offers_public TO anon;
GRANT SELECT ON public.lead_offers_public TO authenticated;

CREATE TRIGGER trg_lead_offers_updated_at
  BEFORE UPDATE ON public.lead_offers
  FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

-- ===== END SOURCE MIGRATION: 20260605102058_3f93ff4c-c7ee-417e-90a8-e2acc69ce921.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260605102153_39018714-7821-475b-a287-ea88edc82215.sql =====

DROP VIEW IF EXISTS public.lead_offers_public;

CREATE OR REPLACE FUNCTION public.list_open_lead_offers(
  _category_slug TEXT DEFAULT NULL,
  _region TEXT DEFAULT NULL,
  _limit INTEGER DEFAULT 60
)
RETURNS TABLE (
  id UUID,
  category_slug TEXT,
  region TEXT,
  province TEXT,
  city TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  budget_min_php NUMERIC,
  budget_max_php NUMERIC,
  urgency TEXT,
  preview TEXT,
  price_php NUMERIC,
  max_unlocks INTEGER,
  unlocks_count INTEGER,
  posted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.category_slug,
    o.region,
    o.province,
    o.city,
    o.vehicle_make,
    o.vehicle_model,
    o.vehicle_year,
    o.budget_min_php,
    o.budget_max_php,
    o.urgency,
    o.preview,
    o.price_php,
    o.max_unlocks,
    o.unlocks_count,
    o.posted_at,
    o.expires_at
  FROM public.lead_offers o
  WHERE o.status = 'open'
    AND (o.expires_at IS NULL OR o.expires_at > now())
    AND (_category_slug IS NULL OR o.category_slug = _category_slug)
    AND (_region IS NULL OR o.region = _region)
  ORDER BY
    CASE o.urgency WHEN 'urgent' THEN 0 WHEN 'standard' THEN 1 ELSE 2 END,
    o.posted_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 60), 200));
$$;

REVOKE ALL ON FUNCTION public.list_open_lead_offers(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_open_lead_offers(TEXT, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.list_open_lead_offers(TEXT, TEXT, INTEGER) TO authenticated;

-- ===== END SOURCE MIGRATION: 20260605102153_39018714-7821-475b-a287-ea88edc82215.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260605103051_33840174-a52e-4fa2-b3c2-434d46ecbdfa.sql =====

-- 1) Premium saved-search alerts
ALTER TABLE public.saved_searches
  ADD COLUMN IF NOT EXISTS alert_frequency text NOT NULL DEFAULT 'off'
    CHECK (alert_frequency IN ('off','daily','instant')),
  ADD COLUMN IF NOT EXISTS last_alerted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2) Listing bundles (dealer packages)
CREATE TABLE IF NOT EXISTS public.listing_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  listing_credits integer NOT NULL DEFAULT 0,
  boost_credits integer NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  price_php numeric(14,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listing_bundles TO anon, authenticated;
GRANT ALL ON public.listing_bundles TO service_role;
ALTER TABLE public.listing_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bundles are public-readable when active"
  ON public.listing_bundles FOR SELECT
  USING (is_active = true);
CREATE POLICY "Admins manage bundles"
  ON public.listing_bundles FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.bundle_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  bundle_id uuid NOT NULL REFERENCES public.listing_bundles(id) ON DELETE RESTRICT,
  listing_credits_remaining integer NOT NULL DEFAULT 0,
  boost_credits_remaining integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  price_paid_php numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bundle_purchases TO authenticated;
GRANT ALL ON public.bundle_purchases TO service_role;
ALTER TABLE public.bundle_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own bundle purchases"
  ON public.bundle_purchases FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage bundle purchases"
  ON public.bundle_purchases FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_listing_bundles_updated_at
  BEFORE UPDATE ON public.listing_bundles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_bundle_purchases_updated_at
  BEFORE UPDATE ON public.bundle_purchases
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_saved_searches_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== END SOURCE MIGRATION: 20260605103051_33840174-a52e-4fa2-b3c2-434d46ecbdfa.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260606041358_7821951b-4327-458a-ac97-d13073d706e7.sql =====
-- 1) Fix the broken self-referential subqueries in the owner UPDATE policy on listings.
DROP POLICY IF EXISTS "Owners update listings" ON public.listings;
CREATE POLICY "Owners update listings"
ON public.listings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND NOT (status IS DISTINCT FROM (
    SELECT l.status FROM public.listings l WHERE l.id = listings.id
  ))
  AND NOT (plan IS DISTINCT FROM (
    SELECT l.plan FROM public.listings l WHERE l.id = listings.id
  ))
  AND NOT (boost_until IS DISTINCT FROM (
    SELECT l.boost_until FROM public.listings l WHERE l.id = listings.id
  ))
  AND NOT (expires_at IS DISTINCT FROM (
    SELECT l.expires_at FROM public.listings l WHERE l.id = listings.id
  ))
);

-- 2) Tighten the business-gallery upload policy to require ownership of the target business.
DROP POLICY IF EXISTS "Authenticated upload to business gallery" ON storage.objects;
CREATE POLICY "Authenticated upload to business gallery"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-gallery'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND (
        b.owner_id = auth.uid()
        OR (b.organization_id IS NOT NULL AND public.can_manage_org(auth.uid(), b.organization_id))
      )
  )
);
-- ===== END SOURCE MIGRATION: 20260606041358_7821951b-4327-458a-ac97-d13073d706e7.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260606123543_fb94412b-0d85-4071-bee5-42acbaf4cf90.sql =====

-- 1) Extend businesses with seeding + claim metadata
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS claim_state text NOT NULL DEFAULT 'owned'
    CHECK (claim_state IN ('owned','unclaimed','claim_pending')),
  ADD COLUMN IF NOT EXISTS import_metadata jsonb,
  ADD COLUMN IF NOT EXISTS attribution text,
  ADD COLUMN IF NOT EXISTS removal_requested_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_businesses_claim_state
  ON public.businesses(claim_state) WHERE claim_state <> 'owned';

-- 2) Claim requests table
CREATE TABLE IF NOT EXISTS public.business_claim_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  claimant_user_id uuid NOT NULL,
  contact_method text NOT NULL CHECK (contact_method IN ('email','phone','document','social')),
  contact_value text,
  evidence_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','auto_approved')),
  reviewer_user_id uuid,
  reviewer_notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.business_claim_requests TO authenticated;
GRANT ALL ON public.business_claim_requests TO service_role;

ALTER TABLE public.business_claim_requests ENABLE ROW LEVEL SECURITY;

-- Claimant: insert only for self, only for unclaimed businesses
CREATE POLICY "Users submit own claim"
  ON public.business_claim_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    claimant_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.claim_state IN ('unclaimed','claim_pending')
        AND b.owner_id IS NULL
    )
  );

-- Claimant + staff can read
CREATE POLICY "Users read own claims"
  ON public.business_claim_requests
  FOR SELECT TO authenticated
  USING (claimant_user_id = auth.uid() OR public.can_moderate(auth.uid()));

-- Staff updates (decision)
CREATE POLICY "Staff update claims"
  ON public.business_claim_requests
  FOR UPDATE TO authenticated
  USING (public.can_moderate(auth.uid()))
  WITH CHECK (public.can_moderate(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_bcr_business ON public.business_claim_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_bcr_claimant ON public.business_claim_requests(claimant_user_id);
CREATE INDEX IF NOT EXISTS idx_bcr_status ON public.business_claim_requests(status);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_bcr_touch ON public.business_claim_requests;
CREATE TRIGGER trg_bcr_touch
  BEFORE UPDATE ON public.business_claim_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Tighten owner update policy: protect claim_state / owner_id / source fields
-- The existing field-freeze policy on listings (status/plan/boost_until/expires_at)
-- has its own protection. For businesses, owners can update most fields but NOT
-- ownership / sourcing / claim machinery. Add a check trigger to enforce this.

CREATE OR REPLACE FUNCTION public.guard_business_owner_update()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Service role / staff bypass
  IF (auth.uid() IS NULL) OR public.can_moderate(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.claim_state IS DISTINCT FROM OLD.claim_state
     OR NEW.source IS DISTINCT FROM OLD.source
     OR NEW.source_external_id IS DISTINCT FROM OLD.source_external_id
     OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.featured IS DISTINCT FROM OLD.featured
     OR NEW.featured_until IS DISTINCT FROM OLD.featured_until
     OR NEW.status IS DISTINCT FROM OLD.status
  THEN
    RAISE EXCEPTION 'Cannot modify protected business fields';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_business_owner_update ON public.businesses;
CREATE TRIGGER trg_guard_business_owner_update
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.guard_business_owner_update();

-- 4) Helper: approve a claim (server-side, SECURITY DEFINER, used by server fns)
CREATE OR REPLACE FUNCTION public.approve_business_claim(_claim_id uuid, _auto boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_bid uuid; v_uid uuid;
BEGIN
  SELECT business_id, claimant_user_id INTO v_bid, v_uid
    FROM public.business_claim_requests WHERE id = _claim_id;
  IF v_bid IS NULL THEN RAISE EXCEPTION 'Claim not found'; END IF;

  UPDATE public.businesses
     SET owner_id = v_uid,
         claim_state = 'owned',
         updated_at = now()
   WHERE id = v_bid AND owner_id IS NULL;

  UPDATE public.business_claim_requests
     SET status = CASE WHEN _auto THEN 'auto_approved' ELSE 'approved' END,
         decided_at = now()
   WHERE id = _claim_id;

  -- Reject sibling pending claims for the same business
  UPDATE public.business_claim_requests
     SET status = 'rejected',
         reviewer_notes = COALESCE(reviewer_notes,'') || E'\nAuto-rejected: another claim approved.',
         decided_at = now()
   WHERE business_id = v_bid AND id <> _claim_id AND status = 'pending';
END $$;

REVOKE ALL ON FUNCTION public.approve_business_claim(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_business_claim(uuid, boolean) TO service_role;

-- ===== END SOURCE MIGRATION: 20260606123543_fb94412b-0d85-4071-bee5-42acbaf4cf90.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260606130250_6d6b8df8-037d-43a6-88d4-a9541634eb7e.sql =====

CREATE TABLE public.business_claim_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.business_claim_requests(id) ON DELETE CASCADE,
  uploader_user_id UUID NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('facebook_ownership','google_business','business_license','utility_bill','id_document','website_proof','other')),
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_bce_claim ON public.business_claim_evidence(claim_id);
CREATE INDEX idx_bce_uploader ON public.business_claim_evidence(uploader_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_claim_evidence TO authenticated;
GRANT ALL ON public.business_claim_evidence TO service_role;

ALTER TABLE public.business_claim_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own claim evidence"
  ON public.business_claim_evidence FOR SELECT TO authenticated
  USING (uploader_user_id = auth.uid() OR public.can_moderate(auth.uid()));

CREATE POLICY "Users insert own claim evidence"
  ON public.business_claim_evidence FOR INSERT TO authenticated
  WITH CHECK (
    uploader_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.business_claim_requests c
      WHERE c.id = claim_id AND c.claimant_user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete own claim evidence"
  ON public.business_claim_evidence FOR DELETE TO authenticated
  USING (uploader_user_id = auth.uid() OR public.can_moderate(auth.uid()));

-- Storage RLS for the claim-evidence bucket. Path convention: {user_id}/{claim_id}/{filename}
CREATE POLICY "Claim evidence upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'claim-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Claim evidence read own or mod"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'claim-evidence'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.can_moderate(auth.uid()))
  );

CREATE POLICY "Claim evidence delete own or mod"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'claim-evidence'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.can_moderate(auth.uid()))
  );

-- ===== END SOURCE MIGRATION: 20260606130250_6d6b8df8-037d-43a6-88d4-a9541634eb7e.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260606130908_794768e3-771f-42ed-b904-e5f51aa1f509.sql =====

CREATE TABLE public.business_claim_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.business_claim_requests(id) ON DELETE CASCADE,
  actor_user_id UUID,
  action TEXT NOT NULL CHECK (action IN (
    'submitted','resubmitted','approved','auto_approved','rejected',
    'evidence_added','evidence_removed','reviewer_note'
  )),
  notes TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_bca_claim ON public.business_claim_audit(claim_id, created_at DESC);

GRANT SELECT, INSERT ON public.business_claim_audit TO authenticated;
GRANT ALL ON public.business_claim_audit TO service_role;

ALTER TABLE public.business_claim_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own claim audit or mod"
  ON public.business_claim_audit FOR SELECT TO authenticated
  USING (
    public.can_moderate(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.business_claim_requests c
      WHERE c.id = claim_id AND c.claimant_user_id = auth.uid()
    )
  );

-- Inserts happen via SECURITY DEFINER triggers; deny direct user inserts
CREATE POLICY "Block direct inserts"
  ON public.business_claim_audit FOR INSERT TO authenticated
  WITH CHECK (false);

-- ---------- Triggers ----------

CREATE OR REPLACE FUNCTION public.tg_claim_audit_status()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.business_claim_audit(claim_id, actor_user_id, action, details)
    VALUES (NEW.id, NEW.claimant_user_id, 'submitted',
      jsonb_build_object('contact_method', NEW.contact_method));
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN v_action := 'approved';
    ELSIF NEW.status = 'auto_approved' THEN v_action := 'auto_approved';
    ELSIF NEW.status = 'rejected' THEN v_action := 'rejected';
    ELSIF NEW.status = 'pending' AND OLD.status = 'rejected' THEN v_action := 'resubmitted';
    ELSE v_action := NULL;
    END IF;

    IF v_action IS NOT NULL THEN
      INSERT INTO public.business_claim_audit(claim_id, actor_user_id, action, notes, details)
      VALUES (NEW.id, COALESCE(NEW.reviewer_user_id, auth.uid()), v_action,
        NEW.reviewer_notes,
        jsonb_build_object('from', OLD.status, 'to', NEW.status));
    END IF;
  ELSIF COALESCE(NEW.reviewer_notes,'') IS DISTINCT FROM COALESCE(OLD.reviewer_notes,'')
        AND NEW.reviewer_notes IS NOT NULL THEN
    INSERT INTO public.business_claim_audit(claim_id, actor_user_id, action, notes)
    VALUES (NEW.id, COALESCE(NEW.reviewer_user_id, auth.uid()), 'reviewer_note', NEW.reviewer_notes);
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_claim_audit_status
AFTER INSERT OR UPDATE ON public.business_claim_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_claim_audit_status();

CREATE OR REPLACE FUNCTION public.tg_claim_audit_evidence()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.business_claim_audit(claim_id, actor_user_id, action, details)
    VALUES (NEW.claim_id, NEW.uploader_user_id, 'evidence_added',
      jsonb_build_object(
        'evidence_id', NEW.id,
        'evidence_type', NEW.evidence_type,
        'file_name', NEW.file_name,
        'file_size', NEW.file_size,
        'mime_type', NEW.mime_type
      ));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.business_claim_audit(claim_id, actor_user_id, action, details)
    VALUES (OLD.claim_id, COALESCE(auth.uid(), OLD.uploader_user_id), 'evidence_removed',
      jsonb_build_object(
        'evidence_id', OLD.id,
        'evidence_type', OLD.evidence_type,
        'file_name', OLD.file_name,
        'file_size', OLD.file_size,
        'mime_type', OLD.mime_type
      ));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_claim_audit_evidence_ins
AFTER INSERT ON public.business_claim_evidence
FOR EACH ROW EXECUTE FUNCTION public.tg_claim_audit_evidence();

CREATE TRIGGER trg_claim_audit_evidence_del
AFTER DELETE ON public.business_claim_evidence
FOR EACH ROW EXECUTE FUNCTION public.tg_claim_audit_evidence();

-- ===== END SOURCE MIGRATION: 20260606130908_794768e3-771f-42ed-b904-e5f51aa1f509.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260606134147_a7df571a-fced-4d56-a407-5721eb5580ed.sql =====

CREATE TABLE public.business_discovery_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  city text,
  region text,
  place_type text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  last_found_count integer NOT NULL DEFAULT 0,
  last_new_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_discovery_searches TO authenticated;
GRANT ALL ON public.business_discovery_searches TO service_role;

ALTER TABLE public.business_discovery_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view discovery searches"
  ON public.business_discovery_searches FOR SELECT
  TO authenticated
  USING (public.can_moderate(auth.uid()));

CREATE POLICY "Staff can manage discovery searches"
  ON public.business_discovery_searches FOR ALL
  TO authenticated
  USING (public.can_moderate(auth.uid()))
  WITH CHECK (public.can_moderate(auth.uid()));

CREATE TRIGGER trg_business_discovery_searches_updated_at
  BEFORE UPDATE ON public.business_discovery_searches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.business_discovery_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'google_places',
  external_id text NOT NULL,
  name text NOT NULL,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  website text,
  rating numeric,
  rating_count integer,
  types text[] NOT NULL DEFAULT '{}',
  our_type text,
  photo_name text,
  region text,
  city text,
  search_id uuid REFERENCES public.business_discovery_searches(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','imported','dismissed')),
  existing_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  diff jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);

CREATE INDEX idx_business_discovery_queue_status ON public.business_discovery_queue (status, last_seen_at DESC);
CREATE INDEX idx_business_discovery_queue_search ON public.business_discovery_queue (search_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_discovery_queue TO authenticated;
GRANT ALL ON public.business_discovery_queue TO service_role;

ALTER TABLE public.business_discovery_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view discovery queue"
  ON public.business_discovery_queue FOR SELECT
  TO authenticated
  USING (public.can_moderate(auth.uid()));

CREATE POLICY "Staff can manage discovery queue"
  ON public.business_discovery_queue FOR ALL
  TO authenticated
  USING (public.can_moderate(auth.uid()))
  WITH CHECK (public.can_moderate(auth.uid()));

CREATE TRIGGER trg_business_discovery_queue_updated_at
  BEFORE UPDATE ON public.business_discovery_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== END SOURCE MIGRATION: 20260606134147_a7df571a-fced-4d56-a407-5721eb5580ed.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260606143803_4431c898-03ff-47a4-a84b-ffa2efba7721.sql =====
-- Clean up any existing duplicates before adding the constraint
DELETE FROM public.businesses a
USING public.businesses b
WHERE a.ctid < b.ctid
  AND a.source IS NOT NULL
  AND a.source_external_id IS NOT NULL
  AND a.source = b.source
  AND a.source_external_id = b.source_external_id;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_source_external_id_key
  ON public.businesses (source, source_external_id)
  WHERE source IS NOT NULL AND source_external_id IS NOT NULL;
-- ===== END SOURCE MIGRATION: 20260606143803_4431c898-03ff-47a4-a84b-ffa2efba7721.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260606143827_5cbab52d-1b9d-4e45-b109-418dc8815f1c.sql =====
DROP INDEX IF EXISTS public.businesses_source_external_id_key;

CREATE UNIQUE INDEX businesses_source_external_id_key
  ON public.businesses (source, source_external_id)
  NULLS NOT DISTINCT;
-- ===== END SOURCE MIGRATION: 20260606143827_5cbab52d-1b9d-4e45-b109-418dc8815f1c.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260606151712_d29167db-53b3-42d2-8cb5-edf9e0cfe07d.sql =====

-- 1) Migrate existing business_plans rows off enum values we're collapsing
UPDATE public.business_plans SET business_kind = 'transport' WHERE business_kind = 'trucking';

-- 2) Rename enum values (1:1) to canonical slugs
ALTER TYPE public.business_kind RENAME VALUE 'dealer' TO 'dealership';
ALTER TYPE public.business_kind RENAME VALUE 'parts_shop' TO 'parts_accessories';
ALTER TYPE public.business_kind RENAME VALUE 'body_shop' TO 'body_paint';

-- 3) Add missing canonical values
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'motorcycle_shop';

-- 4) Expand business_types to cover every 365 field; relabel parts_accessories
UPDATE public.business_types SET label = 'Parts supplier / shop' WHERE slug = 'parts_accessories';

INSERT INTO public.business_types (slug, label, icon, sort_order) VALUES
  ('rental',         'Vehicle rental',              'Car',         11),
  ('battery_shop',   'Battery shop',                NULL,          33),
  ('accessories',    'Accessories / customization', NULL,          55),
  ('audio_tint',     'Audio & window tint',         NULL,          56),
  ('inspection',     'Inspection / emissions',      NULL,          60),
  ('driving_school', 'Driving school',              NULL,          65),
  ('lto_services',   'LTO / registration services', NULL,          70),
  ('financing',      'Financing / loans',           NULL,          75),
  ('transport',      'Transport / logistics',       'Truck',       80),
  ('corporate',      'Corporate / fleet',           NULL,          85),
  ('other',          'Other',                       NULL,          99)
ON CONFLICT (slug) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260606151712_d29167db-53b3-42d2-8cb5-edf9e0cfe07d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260606153104_ec1a9e78-3646-41da-a10b-8e55504ae07d.sql =====
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'used_dealership';
-- ===== END SOURCE MIGRATION: 20260606153104_ec1a9e78-3646-41da-a10b-8e55504ae07d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260606155429_15fa1afb-0a0c-4938-8921-a8e2a28e7510.sql =====

INSERT INTO public.business_tags (type_slug, category, slug, label) VALUES
  ('tire_shop', 'tires', 'tire-vulcanizing', 'Vulcanizing'),
  ('tire_shop', 'tires', 'tire-repair-patch', 'Tire repair / patch'),
  ('tire_shop', 'tires', 'tire-mount-balance-ts', 'Mount & balance'),
  ('tire_shop', 'tires', 'tire-rotation', 'Tire rotation'),
  ('tire_shop', 'tires', 'tire-pressure-check', 'Pressure check / inflation'),
  ('tire_shop', 'tires', 'tire-nitrogen', 'Nitrogen fill'),
  ('tire_shop', 'tires', 'tire-tubeless-conversion', 'Tubeless conversion'),
  ('tire_shop', 'tires', 'tire-flat-roadside', 'Flat tire roadside'),
  ('tire_shop', 'tires', 'tire-recap-retread', 'Recap / retread'),
  ('tire_shop', 'wheels', 'ts-alignment', 'Wheel alignment'),
  ('tire_shop', 'wheels', 'ts-wheel-balancing', 'Wheel balancing'),
  ('tire_shop', 'wheels', 'ts-tpms', 'TPMS service'),
  ('tire_shop', 'wheels', 'mag-wheel-repair', 'Mag / rim repair'),
  ('tire_shop', 'wheels', 'hubcap-replacement', 'Hubcap replacement'),
  ('tire_shop', 'inventory_type', 'inv-tire-new', 'New tires'),
  ('tire_shop', 'inventory_type', 'inv-tire-used', 'Used tires'),
  ('tire_shop', 'inventory_type', 'inv-tire-mags', 'Mag wheels / rims'),
  ('tire_shop', 'inventory_type', 'inv-tire-tubes', 'Inner tubes'),
  ('tire_shop', 'inventory_type', 'inv-tire-batteries', 'Batteries'),
  ('tire_shop', 'brand', 'tirebrand-bridgestone', 'Bridgestone'),
  ('tire_shop', 'brand', 'tirebrand-michelin', 'Michelin'),
  ('tire_shop', 'brand', 'tirebrand-yokohama', 'Yokohama'),
  ('tire_shop', 'brand', 'tirebrand-dunlop', 'Dunlop'),
  ('tire_shop', 'brand', 'tirebrand-bf-goodrich', 'BFGoodrich'),
  ('tire_shop', 'brand', 'tirebrand-goodyear', 'Goodyear'),
  ('tire_shop', 'brand', 'tirebrand-toyo', 'Toyo'),
  ('tire_shop', 'brand', 'tirebrand-maxxis', 'Maxxis'),
  ('tire_shop', 'brand', 'tirebrand-gt-radial', 'GT Radial'),
  ('tire_shop', 'brand', 'tirebrand-westlake', 'Westlake'),
  ('tire_shop', 'vehicle_scope', 'tire-scope-cars', 'Cars'),
  ('tire_shop', 'vehicle_scope', 'tire-scope-suvs', 'SUVs'),
  ('tire_shop', 'vehicle_scope', 'tire-scope-trucks', 'Trucks'),
  ('tire_shop', 'vehicle_scope', 'tire-scope-vans', 'Vans'),
  ('tire_shop', 'vehicle_scope', 'tire-scope-motorcycles', 'Motorcycles'),
  ('tire_shop', 'vehicle_scope', 'tire-scope-heavy-duty', 'Heavy duty / commercial'),
  ('tire_shop', 'mobile', 'tire-mobile-service', 'Mobile tire service'),
  ('tire_shop', 'mobile', 'tire-24-7', '24/7 vulcanizing'),
  ('repair_shop', 'tires', 'rs-tire-vulcanizing', 'Vulcanizing'),
  ('repair_shop', 'tires', 'rs-tire-repair-patch', 'Tire repair / patch'),
  ('repair_shop', 'tires', 'rs-tire-rotation', 'Tire rotation')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.business_tags (type_slug, category, slug, label)
SELECT 'used_dealership', category, 'used-' || slug, label
FROM public.business_tags
WHERE type_slug = 'dealership' AND category IS NOT NULL
ON CONFLICT (slug) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260606155429_15fa1afb-0a0c-4938-8921-a8e2a28e7510.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260606160435_8e863801-e6fe-4c68-a13d-6b55b72594f8.sql =====
ALTER TABLE public.business_tags ADD COLUMN IF NOT EXISTS description text;

UPDATE public.business_tags SET description = 'Patching a punctured tire by heat-bonding a rubber patch from the inside.' WHERE slug = 'tire-vulcanizing';
UPDATE public.business_tags SET description = 'Patching a punctured tire by heat-bonding a rubber patch from the inside.' WHERE slug = 'rs-tire-vulcanizing';
UPDATE public.business_tags SET description = 'Sealing punctures and minor tire damage with patches or plugs.' WHERE slug = 'tire-repair-patch';
UPDATE public.business_tags SET description = 'Sealing punctures and minor tire damage with patches or plugs.' WHERE slug = 'rs-tire-repair-patch';
UPDATE public.business_tags SET description = 'Installing tires on rims and balancing them for a smooth, vibration-free ride.' WHERE slug = 'tire-mount-balance-ts';
UPDATE public.business_tags SET description = 'Adjusting wheel angles so tires wear evenly and the vehicle tracks straight.' WHERE slug = 'ts-alignment';
UPDATE public.business_tags SET description = 'Balancing wheel-tire assemblies to eliminate vibrations at speed.' WHERE slug = 'ts-wheel-balancing';
UPDATE public.business_tags SET description = 'Tire Pressure Monitoring System — servicing sensors that warn of low tire pressure.' WHERE slug = 'ts-tpms';
UPDATE public.business_tags SET description = 'Repairing bent, cracked, or scraped alloy / mag wheels.' WHERE slug = 'mag-wheel-repair';
UPDATE public.business_tags SET description = 'Periodic swapping of tire positions to promote even tread wear.' WHERE slug = 'tire-rotation';
UPDATE public.business_tags SET description = 'Inflating tires with nitrogen for more stable pressure and slower leakage.' WHERE slug = 'tire-nitrogen';
UPDATE public.business_tags SET description = 'Converting spoked or tubed wheels to tubeless for easier maintenance.' WHERE slug = 'tire-tubeless-conversion';
UPDATE public.business_tags SET description = 'On-site tire assistance when you get a flat away from the shop.' WHERE slug = 'tire-flat-roadside';
UPDATE public.business_tags SET description = 'Applying new tread to a worn tire casing to extend service life.' WHERE slug = 'tire-recap-retread';
UPDATE public.business_tags SET description = 'New passenger, SUV, truck, and motorcycle tires in stock.' WHERE slug = 'inv-tire-new';
UPDATE public.business_tags SET description = 'Pre-owned tires inspected for safety and remaining tread depth.' WHERE slug = 'inv-tire-used';
UPDATE public.business_tags SET description = 'Alloy and steel rims, including custom-fit options for various vehicles.' WHERE slug = 'inv-tire-mags';
UPDATE public.business_tags SET description = 'Available around the clock for emergency tire repairs and blowouts.' WHERE slug = 'tire-24-7';
UPDATE public.business_tags SET description = 'Tire technician comes to your home, office, or roadside location.' WHERE slug = 'tire-mobile-service';
UPDATE public.business_tags SET description = 'Air-conditioning repair, recharge, and leak detection for vehicles.' WHERE slug = 'aircon';
UPDATE public.business_tags SET description = 'Scheduled engine oil and filter change to keep the motor running clean.' WHERE slug = 'oil-change';
UPDATE public.business_tags SET description = 'Collision repair, dent removal, and respray to restore vehicle appearance.' WHERE slug = 'body-paint';
UPDATE public.business_tags SET description = 'Deep interior and exterior cleaning, polishing, and paint protection.' WHERE slug = 'detailing';
UPDATE public.business_tags SET description = 'Battery, alternator, wiring, and electronic diagnostics and repair.' WHERE slug = 'electrical';
UPDATE public.business_tags SET description = 'Restoring worn brake pads, discs, and hydraulic components for safe stopping.' WHERE slug = 'brakes';
UPDATE public.business_tags SET description = 'Computerized scanning to identify engine, transmission, and system faults.' WHERE slug = 'diagnostics';
UPDATE public.business_tags SET description = 'Transmission, differential, and drive axle service and repair.' WHERE slug = 'drivetrain';
UPDATE public.business_tags SET description = 'Engine overhaul, timing, and cooling system maintenance.' WHERE slug = 'engine';
UPDATE public.business_tags SET description = 'Radiator, coolant, and thermostat repairs to prevent overheating.' WHERE slug = 'cooling';
UPDATE public.business_tags SET description = 'Shocks, struts, and steering linkage inspection and replacement.' WHERE slug = 'suspension';
UPDATE public.business_tags SET description = 'Heater, A/C compressor, and climate control repairs.' WHERE slug = 'climate';
UPDATE public.business_tags SET description = 'Muffler, catalytic converter, and exhaust pipe repair or replacement.' WHERE slug = 'exhaust';
UPDATE public.business_tags SET description = 'Automated or hand car wash services.' WHERE slug = 'wash';
UPDATE public.business_tags SET description = 'Paint correction, ceramic coating, and protective film application.' WHERE slug = 'paint';
UPDATE public.business_tags SET description = 'Dent removal, panel beating, and structural body repair.' WHERE slug = 'body';
UPDATE public.business_tags SET description = 'Windshield and window repair or replacement.' WHERE slug = 'glass';
UPDATE public.business_tags SET description = 'Services delivered at your location rather than at the shop.' WHERE slug = 'mobile';
UPDATE public.business_tags SET description = 'Towing, jump-starts, and emergency assistance when stranded.' WHERE slug = 'roadside';
UPDATE public.business_tags SET description = 'Pre-purchase or annual roadworthiness and safety inspection.' WHERE slug = 'inspection';
UPDATE public.business_tags SET description = 'ECU tuning, turbo, intake, and performance upgrades.' WHERE slug = 'performance';
UPDATE public.business_tags SET description = 'Niche or specialized repairs for classic, luxury, or modified vehicles.' WHERE slug = 'specialty';
UPDATE public.business_tags SET description = 'Original Equipment Manufacturer parts — genuine factory components.' WHERE slug = 'oem-parts';
UPDATE public.business_tags SET description = 'Third-party replacement and upgrade parts at various price points.' WHERE slug = 'aftermarket';
UPDATE public.business_tags SET description = 'Vehicle batteries for cars, SUVs, trucks, and motorcycles.' WHERE slug = 'batteries';
UPDATE public.business_tags SET description = 'Interior and exterior accessories, add-ons, and styling parts.' WHERE slug = 'accessories';
UPDATE public.business_tags SET description = 'Flatbed truck transport for damaged or non-running vehicles.' WHERE slug = 'flatbed';
UPDATE public.business_tags SET description = 'Towing for buses, trucks, and heavy commercial equipment.' WHERE slug = 'heavy-duty';
UPDATE public.business_tags SET description = 'Towing and roadside assistance specifically for motorcycles.' WHERE slug = 'motorcycle-towing';
UPDATE public.business_tags SET description = 'Compulsory Third Party Liability insurance — legally required coverage.' WHERE slug = 'ctpl';
UPDATE public.business_tags SET description = 'Full vehicle insurance covering theft, collision, and Acts of God.' WHERE slug = 'comprehensive';
UPDATE public.business_tags SET description = 'Insurance packages tailored for motorcycles and scooters.' WHERE slug = 'motorcycle-insurance';
UPDATE public.business_tags SET description = 'Open 24 hours a day, 7 days a week.' WHERE slug = '24-7';
UPDATE public.business_tags SET description = 'Technician or service team comes to your location.' WHERE slug = 'home-service';
UPDATE public.business_tags SET description = 'Service or parts backed by a manufacturer or shop warranty.' WHERE slug = 'warranty';
UPDATE public.business_tags SET description = 'Accepts credit cards, debit cards, or digital wallets.' WHERE slug = 'cashless';
UPDATE public.business_tags SET description = 'Pre-owned cars, trucks, SUVs, and vans inspected for resale.' WHERE slug = 'used';
UPDATE public.business_tags SET description = 'Brand-new vehicles straight from the manufacturer or distributor.' WHERE slug = 'new';
UPDATE public.business_tags SET description = 'Standard unleaded gasoline with 91 octane rating.' WHERE slug = 'fuel-gas-91';
UPDATE public.business_tags SET description = 'Premium unleaded gasoline with 95 octane rating.' WHERE slug = 'fuel-gas-95';
UPDATE public.business_tags SET description = 'High-octane unleaded gasoline with 97 rating for performance engines.' WHERE slug = 'fuel-gas-97';
UPDATE public.business_tags SET description = 'Top-tier unleaded gasoline with 100 octane for high-compression engines.' WHERE slug = 'fuel-gas-100';
UPDATE public.business_tags SET description = 'Standard diesel fuel for cars, SUVs, and commercial vehicles.' WHERE slug = 'fuel-diesel';
UPDATE public.business_tags SET description = 'Cleaner-burning premium diesel meeting Euro 5 emission standards.' WHERE slug = 'fuel-diesel-euro5';
UPDATE public.business_tags SET description = 'Diesel blended with 5% biodiesel for reduced emissions.' WHERE slug = 'fuel-biodiesel-b5';
UPDATE public.business_tags SET description = 'Gasoline blended with 10% ethanol — common eco-fuel option.' WHERE slug = 'fuel-e10';
UPDATE public.business_tags SET description = 'Kerosene for heaters, lamps, and certain commercial engines.' WHERE slug = 'fuel-kerosene';
UPDATE public.business_tags SET description = 'Aviation gasoline for light aircraft and aeroclub use.' WHERE slug = 'fuel-avgas';
UPDATE public.business_tags SET description = 'Liquefied Petroleum Gas — alternative fuel for LPG-converted vehicles.' WHERE slug = 'fuel-autogas-lpg';
UPDATE public.business_tags SET description = 'Compressed Natural Gas — cleaner-burning alternative fuel.' WHERE slug = 'fuel-cng';
UPDATE public.business_tags SET description = 'Standard AC charging socket for electric vehicles.' WHERE slug = 'ev-type2-ac';
UPDATE public.business_tags SET description = 'Combined Charging System 2 — fast DC charging for EVs.' WHERE slug = 'ev-ccs2-dc';
UPDATE public.business_tags SET description = 'Japanese-standard fast DC charging socket for EVs.' WHERE slug = 'ev-chademo';
UPDATE public.business_tags SET description = 'Tesla / North American Charging Standard fast DC connector.' WHERE slug = 'ev-tesla-nacs';
UPDATE public.business_tags SET description = '7 kilowatt AC charger — typical home or office wallbox speed.' WHERE slug = 'ev-7kw';
UPDATE public.business_tags SET description = '22 kilowatt AC charger — fast three-phase workplace charging.' WHERE slug = 'ev-22kw';
UPDATE public.business_tags SET description = '50 kilowatt DC fast charger — highway and commercial stop speeds.' WHERE slug = 'ev-50kw';
UPDATE public.business_tags SET description = '150+ kilowatt ultra-fast DC charger — quickest public EV charging.' WHERE slug = 'ev-150kw-plus';
UPDATE public.business_tags SET description = 'EV chargers accessible any time of day or night.' WHERE slug = 'ev-24-7-charging';
-- ===== END SOURCE MIGRATION: 20260606160435_8e863801-e6fe-4c68-a13d-6b55b72594f8.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260607011511_9237f748-0bd6-4f28-a805-5d1cbd92e9a4.sql =====
ALTER TABLE public.shop_product_fitment
  ADD COLUMN IF NOT EXISTS transmission text;

CREATE INDEX IF NOT EXISTS idx_fitment_transmission
  ON public.shop_product_fitment (transmission)
  WHERE transmission IS NOT NULL;

WITH parent AS (SELECT id FROM public.shop_categories WHERE slug = 'hand-tools')
INSERT INTO public.shop_categories (slug, name, description, parent_id, sort_order, active, department_slug)
SELECT v.slug, v.name, v.description, parent.id, v.sort_order, true, 'tools-garage'
FROM parent, (VALUES
  ('hand-tools-general',       'General Hand Tools',           'Wrenches, sockets, screwdrivers, pliers, hammers and everyday mechanic basics.', 10),
  ('hand-tools-engine',        'Engine Tools',                 'Timing tools, valve spring compressors, piston ring tools, cylinder hones, compression testers.', 20),
  ('hand-tools-transmission',  'Transmission Tools',           'Clutch alignment kits, snap-ring pliers, bearing pullers, transmission jacks and gearbox specialty tools.', 30),
  ('hand-tools-drivetrain',    'Drivetrain & Axle Tools',      'CV joint tools, axle-nut sockets, differential tools, U-joint presses.', 40),
  ('hand-tools-hvac',          'Heat & A/C Tools',             'Refrigerant manifold gauges, vacuum pumps, leak detectors, flaring & swaging tools.', 50),
  ('hand-tools-brakes',        'Brake & Suspension Tools',     'Brake bleeders, caliper wind-back tools, ball-joint separators, spring compressors.', 60),
  ('hand-tools-electrical',    'Electrical & Diagnostic Hand Tools', 'Multimeters, test lights, wire strippers, crimpers, soldering.', 70),
  ('hand-tools-body',          'Body & Trim Tools',            'Trim removers, panel pullers, dent pullers, plastic pry tools.', 80),
  ('hand-tools-specialty',     'Specialty / OEM Tools',        'Manufacturer-specific service tools — Toyota SST, Honda, BMW, Ford, etc.', 90)
) AS v(slug, name, description, sort_order)
ON CONFLICT (slug) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260607011511_9237f748-0bd6-4f28-a805-5d1cbd92e9a4.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260607014744_58bd8014-ca74-40d7-b9d9-c61666f826c3.sql =====
ALTER TABLE public.ops_alerts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_alerts;
-- ===== END SOURCE MIGRATION: 20260607014744_58bd8014-ca74-40d7-b9d9-c61666f826c3.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260607020200_fae52826-6c9c-4e04-8c63-078b3a5bdda2.sql =====

CREATE TABLE public.business_location_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  proposed_lat numeric NOT NULL,
  proposed_lng numeric NOT NULL,
  previous_lat numeric,
  previous_lng numeric,
  note text,
  submitter_user_id uuid,
  submitter_ip text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','reverted')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loc_lat_range CHECK (proposed_lat BETWEEN -90 AND 90),
  CONSTRAINT loc_lng_range CHECK (proposed_lng BETWEEN -180 AND 180),
  CONSTRAINT loc_note_len CHECK (note IS NULL OR char_length(note) <= 300)
);

CREATE INDEX idx_blc_status_created ON public.business_location_corrections (status, created_at DESC);
CREATE INDEX idx_blc_business ON public.business_location_corrections (business_id);
CREATE INDEX idx_blc_submitter ON public.business_location_corrections (submitter_user_id);

GRANT SELECT, INSERT ON public.business_location_corrections TO anon;
GRANT SELECT, INSERT ON public.business_location_corrections TO authenticated;
GRANT ALL ON public.business_location_corrections TO service_role;

ALTER TABLE public.business_location_corrections ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) may submit a suggestion
CREATE POLICY "Anyone can submit location corrections"
  ON public.business_location_corrections
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Submitters can see their own suggestions
CREATE POLICY "Submitters read own corrections"
  ON public.business_location_corrections
  FOR SELECT
  TO authenticated
  USING (submitter_user_id = auth.uid());

-- Admins / moderators can see and update everything
CREATE POLICY "Moderators read all corrections"
  ON public.business_location_corrections
  FOR SELECT
  TO authenticated
  USING (public.can_moderate(auth.uid()));

CREATE POLICY "Moderators update corrections"
  ON public.business_location_corrections
  FOR UPDATE
  TO authenticated
  USING (public.can_moderate(auth.uid()))
  WITH CHECK (public.can_moderate(auth.uid()));

CREATE TRIGGER trg_blc_updated_at
  BEFORE UPDATE ON public.business_location_corrections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.business_location_corrections REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_location_corrections;

-- ===== END SOURCE MIGRATION: 20260607020200_fae52826-6c9c-4e04-8c63-078b3a5bdda2.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260607053342_aace8b5d-2b64-45f3-be02-9fc21d6794d5.sql =====

-- 1) Allow direct approve/reject from a brand-new inquiry
CREATE OR REPLACE FUNCTION public.enforce_ad_inquiry_status_transitions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := has_role(uid, 'admin'::app_role);
  old_s text;
  new_s text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF is_admin THEN RETURN NEW; END IF;

  old_s := OLD.status::text;
  new_s := NEW.status::text;

  IF NOT (
    (old_s = 'new'       AND new_s IN ('in_review','spam','won','lost')) OR
    (old_s = 'in_review' AND new_s IN ('quoted','lost','won','spam')) OR
    (old_s = 'quoted'    AND new_s IN ('won','lost'))
  ) THEN
    RAISE EXCEPTION 'Invalid ad inquiry status transition: % -> %', old_s, new_s;
  END IF;
  RETURN NEW;
END $function$;

-- 2) Email the sponsor when a decision is made
CREATE OR REPLACE FUNCTION public.tg_notify_ad_inquiry_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tpl text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status::text = 'won' THEN
    tpl := 'ad-inquiry-approved';
  ELSIF NEW.status::text = 'lost' THEN
    tpl := 'ad-inquiry-rejected';
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.email IS NULL OR length(btrim(NEW.email)) = 0 THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', tpl,
    'to', NEW.email,
    'data', jsonb_build_object(
      'contact_name', NEW.contact_name,
      'company', COALESCE(NEW.company, ''),
      'placement', NEW.placement::text,
      'inquiry_id', NEW.id
    )
  ));
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_notify_ad_inquiry_decision ON public.ad_inquiries;
CREATE TRIGGER trg_notify_ad_inquiry_decision
AFTER UPDATE OF status ON public.ad_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.tg_notify_ad_inquiry_decision();

-- ===== END SOURCE MIGRATION: 20260607053342_aace8b5d-2b64-45f3-be02-9fc21d6794d5.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260607053704_3150cd92-bbb6-44c9-8cbe-be001d44d257.sql =====

-- Allow lost -> new transition for resubmissions
CREATE OR REPLACE FUNCTION public.enforce_ad_inquiry_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := has_role(uid, 'admin'::app_role);
  old_s text;
  new_s text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF is_admin THEN RETURN NEW; END IF;

  old_s := OLD.status::text;
  new_s := NEW.status::text;

  IF NOT (
    (old_s = 'new'       AND new_s IN ('in_review','spam','won','lost')) OR
    (old_s = 'in_review' AND new_s IN ('quoted','lost','won','spam')) OR
    (old_s = 'quoted'    AND new_s IN ('won','lost')) OR
    (old_s = 'lost'      AND new_s = 'new')
  ) THEN
    RAISE EXCEPTION 'Invalid ad inquiry status transition: % -> %', old_s, new_s;
  END IF;
  RETURN NEW;
END
$$;

-- Protect admin-only fields when a non-admin submitter edits their inquiry
CREATE OR REPLACE FUNCTION public.protect_ad_inquiry_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN NEW; END IF;
  IF can_manage_ads(uid) OR has_role(uid, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Non-admin submitter: lock down admin/system columns
  NEW.assigned_to := OLD.assigned_to;
  NEW.internal_notes := OLD.internal_notes;
  NEW.submitter_user_id := OLD.submitter_user_id;
  NEW.email := OLD.email;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_protect_ad_inquiry_admin_fields ON public.ad_inquiries;
CREATE TRIGGER trg_protect_ad_inquiry_admin_fields
BEFORE UPDATE ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.protect_ad_inquiry_admin_fields();

-- RLS: allow sponsor to update their own rejected inquiry, resetting status to new
CREATE POLICY "Submitter resubmits own rejected inquiry"
ON public.ad_inquiries
FOR UPDATE
TO authenticated
USING (
  submitter_user_id IS NOT NULL
  AND submitter_user_id = auth.uid()
  AND status = 'lost'::ad_inquiry_status
)
WITH CHECK (
  submitter_user_id = auth.uid()
  AND status = 'new'::ad_inquiry_status
);

-- ===== END SOURCE MIGRATION: 20260607053704_3150cd92-bbb6-44c9-8cbe-be001d44d257.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260607054023_e316b1f5-445d-4577-b115-5d5ed320508b.sql =====

-- 1. Schema additions
ALTER TABLE public.ad_inquiries
  ADD COLUMN IF NOT EXISTS last_rejection_reason text;

ALTER TABLE public.ad_inquiry_audit
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Allow sponsors to read their own audit trail
GRANT SELECT ON public.ad_inquiry_audit TO authenticated;

DROP POLICY IF EXISTS "Submitter reads own audit" ON public.ad_inquiry_audit;
CREATE POLICY "Submitter reads own audit"
ON public.ad_inquiry_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ad_inquiries i
    WHERE i.id = ad_inquiry_audit.inquiry_id
      AND (
        i.submitter_user_id = auth.uid()
        OR lower(i.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
  )
);

-- 3. Expanded audit trigger with semantic actions + edited field tracking
CREATE OR REPLACE FUNCTION public.tg_audit_ad_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_name text;
  changed_fields text[] := ARRAY[]::text[];
  meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, to_value)
      VALUES (NEW.id, NEW.submitter_user_id, 'created', NEW.status::text);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      action_name := CASE
        WHEN NEW.status::text = 'won' THEN 'approved'
        WHEN NEW.status::text = 'lost' THEN 'rejected'
        WHEN OLD.status::text = 'lost' AND NEW.status::text = 'new' THEN 'resubmitted'
        ELSE 'status_changed'
      END;
      meta := '{}'::jsonb;
      IF action_name = 'rejected' AND NEW.last_rejection_reason IS NOT NULL THEN
        meta := jsonb_build_object('reason', NEW.last_rejection_reason);
      END IF;
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value, metadata)
        VALUES (NEW.id, auth.uid(), action_name, OLD.status::text, NEW.status::text, meta);
    END IF;

    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value)
        VALUES (NEW.id, auth.uid(), 'assigned',
                COALESCE(OLD.assigned_to::text,''), COALESCE(NEW.assigned_to::text,''));
    END IF;

    IF COALESCE(NEW.internal_notes,'') IS DISTINCT FROM COALESCE(OLD.internal_notes,'') THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action)
        VALUES (NEW.id, auth.uid(), 'notes_updated');
    END IF;

    -- Track sponsor edits to user-visible fields
    IF NEW.contact_name IS DISTINCT FROM OLD.contact_name THEN changed_fields := changed_fields || 'contact_name'; END IF;
    IF COALESCE(NEW.company,'') IS DISTINCT FROM COALESCE(OLD.company,'') THEN changed_fields := changed_fields || 'company'; END IF;
    IF COALESCE(NEW.phone,'') IS DISTINCT FROM COALESCE(OLD.phone,'') THEN changed_fields := changed_fields || 'phone'; END IF;
    IF NEW.placement IS DISTINCT FROM OLD.placement THEN changed_fields := changed_fields || 'placement'; END IF;
    IF COALESCE(NEW.budget_range,'') IS DISTINCT FROM COALESCE(OLD.budget_range,'') THEN changed_fields := changed_fields || 'budget_range'; END IF;
    IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN changed_fields := changed_fields || 'start_date'; END IF;
    IF NEW.message IS DISTINCT FROM OLD.message THEN changed_fields := changed_fields || 'message'; END IF;

    IF array_length(changed_fields, 1) > 0 THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, metadata)
        VALUES (NEW.id, auth.uid(), 'edited',
                jsonb_build_object('fields', to_jsonb(changed_fields)));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Lock down last_rejection_reason from non-admin updates
CREATE OR REPLACE FUNCTION public.protect_ad_inquiry_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN NEW; END IF;
  IF can_manage_ads(uid) OR has_role(uid, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Non-admin submitter: lock down admin/system columns
  NEW.assigned_to := OLD.assigned_to;
  NEW.internal_notes := OLD.internal_notes;
  NEW.submitter_user_id := OLD.submitter_user_id;
  NEW.email := OLD.email;
  NEW.created_at := OLD.created_at;
  NEW.last_rejection_reason := OLD.last_rejection_reason;
  RETURN NEW;
END
$$;

-- 5. Include reason in rejection email payload
CREATE OR REPLACE FUNCTION public.tg_notify_ad_inquiry_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tpl text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status::text = 'won' THEN
    tpl := 'ad-inquiry-approved';
  ELSIF NEW.status::text = 'lost' THEN
    tpl := 'ad-inquiry-rejected';
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.email IS NULL OR length(btrim(NEW.email)) = 0 THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', tpl,
    'to', NEW.email,
    'data', jsonb_build_object(
      'contact_name', NEW.contact_name,
      'company', COALESCE(NEW.company, ''),
      'placement', NEW.placement::text,
      'inquiry_id', NEW.id,
      'reason', COALESCE(NEW.last_rejection_reason, '')
    )
  ));
  RETURN NEW;
END
$$;

-- ===== END SOURCE MIGRATION: 20260607054023_e316b1f5-445d-4577-b115-5d5ed320508b.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260607054410_89bd86ee-7fca-4ea2-8d6c-0e6a906d4030.sql =====

CREATE OR REPLACE FUNCTION public.tg_audit_ad_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_name text;
  changes jsonb := '{}'::jsonb;
  meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, to_value)
      VALUES (NEW.id, NEW.submitter_user_id, 'created', NEW.status::text);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      action_name := CASE
        WHEN NEW.status::text = 'won' THEN 'approved'
        WHEN NEW.status::text = 'lost' THEN 'rejected'
        WHEN OLD.status::text = 'lost' AND NEW.status::text = 'new' THEN 'resubmitted'
        ELSE 'status_changed'
      END;
      meta := '{}'::jsonb;
      IF action_name = 'rejected' AND NEW.last_rejection_reason IS NOT NULL THEN
        meta := jsonb_build_object('reason', NEW.last_rejection_reason);
      END IF;
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value, metadata)
        VALUES (NEW.id, auth.uid(), action_name, OLD.status::text, NEW.status::text, meta);
    END IF;

    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value)
        VALUES (NEW.id, auth.uid(), 'assigned',
                COALESCE(OLD.assigned_to::text,''), COALESCE(NEW.assigned_to::text,''));
    END IF;

    IF COALESCE(NEW.internal_notes,'') IS DISTINCT FROM COALESCE(OLD.internal_notes,'') THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action)
        VALUES (NEW.id, auth.uid(), 'notes_updated');
    END IF;

    -- Per-field before/after diff for sponsor-visible fields
    IF NEW.contact_name IS DISTINCT FROM OLD.contact_name THEN
      changes := changes || jsonb_build_object('contact_name', jsonb_build_object('from', OLD.contact_name, 'to', NEW.contact_name));
    END IF;
    IF COALESCE(NEW.company,'') IS DISTINCT FROM COALESCE(OLD.company,'') THEN
      changes := changes || jsonb_build_object('company', jsonb_build_object('from', OLD.company, 'to', NEW.company));
    END IF;
    IF COALESCE(NEW.phone,'') IS DISTINCT FROM COALESCE(OLD.phone,'') THEN
      changes := changes || jsonb_build_object('phone', jsonb_build_object('from', OLD.phone, 'to', NEW.phone));
    END IF;
    IF NEW.placement IS DISTINCT FROM OLD.placement THEN
      changes := changes || jsonb_build_object('placement', jsonb_build_object('from', OLD.placement::text, 'to', NEW.placement::text));
    END IF;
    IF COALESCE(NEW.budget_range,'') IS DISTINCT FROM COALESCE(OLD.budget_range,'') THEN
      changes := changes || jsonb_build_object('budget_range', jsonb_build_object('from', OLD.budget_range, 'to', NEW.budget_range));
    END IF;
    IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
      changes := changes || jsonb_build_object('start_date', jsonb_build_object('from', OLD.start_date::text, 'to', NEW.start_date::text));
    END IF;
    IF NEW.message IS DISTINCT FROM OLD.message THEN
      changes := changes || jsonb_build_object('message', jsonb_build_object('from', OLD.message, 'to', NEW.message));
    END IF;

    IF changes <> '{}'::jsonb THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, metadata)
        VALUES (NEW.id, auth.uid(), 'edited', jsonb_build_object('changes', changes));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ===== END SOURCE MIGRATION: 20260607054410_89bd86ee-7fca-4ea2-8d6c-0e6a906d4030.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260607055051_b92fd447-fac7-450f-ba0a-d924f986fab3.sql =====
-- Add learn_rail enum value
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'learn_rail';

-- Add structured columns to ad_inquiries
ALTER TABLE public.ad_inquiries
  ADD COLUMN IF NOT EXISTS sections text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS formats text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS duration_days int,
  ADD COLUMN IF NOT EXISTS creative_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audience_notes text;

-- Backfill: copy placement into sections for old rows
UPDATE public.ad_inquiries
SET sections = ARRAY[placement::text]
WHERE (sections IS NULL OR cardinality(sections) = 0) AND placement IS NOT NULL;

-- Extend the audit trigger to include new fields in the per-field diff
CREATE OR REPLACE FUNCTION public.tg_audit_ad_inquiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_actor uuid := auth.uid();
  v_changes jsonb := '{}'::jsonb;
  v_meta jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ad_inquiry_audit (inquiry_id, actor_id, action, metadata)
    VALUES (NEW.id, v_actor, 'created', jsonb_build_object('status', NEW.status));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Status transitions get semantic actions
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'won' THEN
        v_action := 'approved';
      ELSIF NEW.status = 'lost' THEN
        v_action := 'rejected';
        v_meta := jsonb_build_object('reason', NEW.last_rejection_reason);
      ELSIF OLD.status = 'lost' AND NEW.status = 'new' THEN
        v_action := 'resubmitted';
      ELSE
        v_action := 'status_changed';
        v_meta := jsonb_build_object('from', OLD.status, 'to', NEW.status);
      END IF;

      INSERT INTO public.ad_inquiry_audit (inquiry_id, actor_id, action, metadata)
      VALUES (NEW.id, v_actor, v_action, v_meta);
    END IF;

    -- Per-field edits
    IF NEW.contact_name IS DISTINCT FROM OLD.contact_name THEN
      v_changes := v_changes || jsonb_build_object('contact_name', jsonb_build_object('from', OLD.contact_name, 'to', NEW.contact_name));
    END IF;
    IF NEW.company IS DISTINCT FROM OLD.company THEN
      v_changes := v_changes || jsonb_build_object('company', jsonb_build_object('from', OLD.company, 'to', NEW.company));
    END IF;
    IF NEW.phone IS DISTINCT FROM OLD.phone THEN
      v_changes := v_changes || jsonb_build_object('phone', jsonb_build_object('from', OLD.phone, 'to', NEW.phone));
    END IF;
    IF NEW.placement IS DISTINCT FROM OLD.placement THEN
      v_changes := v_changes || jsonb_build_object('placement', jsonb_build_object('from', OLD.placement, 'to', NEW.placement));
    END IF;
    IF NEW.budget_range IS DISTINCT FROM OLD.budget_range THEN
      v_changes := v_changes || jsonb_build_object('budget_range', jsonb_build_object('from', OLD.budget_range, 'to', NEW.budget_range));
    END IF;
    IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
      v_changes := v_changes || jsonb_build_object('start_date', jsonb_build_object('from', OLD.start_date, 'to', NEW.start_date));
    END IF;
    IF NEW.end_date IS DISTINCT FROM OLD.end_date THEN
      v_changes := v_changes || jsonb_build_object('end_date', jsonb_build_object('from', OLD.end_date, 'to', NEW.end_date));
    END IF;
    IF NEW.duration_days IS DISTINCT FROM OLD.duration_days THEN
      v_changes := v_changes || jsonb_build_object('duration_days', jsonb_build_object('from', OLD.duration_days, 'to', NEW.duration_days));
    END IF;
    IF NEW.target_url IS DISTINCT FROM OLD.target_url THEN
      v_changes := v_changes || jsonb_build_object('target_url', jsonb_build_object('from', OLD.target_url, 'to', NEW.target_url));
    END IF;
    IF NEW.creative_ready IS DISTINCT FROM OLD.creative_ready THEN
      v_changes := v_changes || jsonb_build_object('creative_ready', jsonb_build_object('from', OLD.creative_ready, 'to', NEW.creative_ready));
    END IF;
    IF NEW.audience_notes IS DISTINCT FROM OLD.audience_notes THEN
      v_changes := v_changes || jsonb_build_object('audience_notes', jsonb_build_object('from', OLD.audience_notes, 'to', NEW.audience_notes));
    END IF;
    IF NEW.sections IS DISTINCT FROM OLD.sections THEN
      v_changes := v_changes || jsonb_build_object('sections', jsonb_build_object('from', to_jsonb(OLD.sections), 'to', to_jsonb(NEW.sections)));
    END IF;
    IF NEW.formats IS DISTINCT FROM OLD.formats THEN
      v_changes := v_changes || jsonb_build_object('formats', jsonb_build_object('from', to_jsonb(OLD.formats), 'to', to_jsonb(NEW.formats)));
    END IF;
    IF NEW.message IS DISTINCT FROM OLD.message THEN
      v_changes := v_changes || jsonb_build_object('message', jsonb_build_object('from', OLD.message, 'to', NEW.message));
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      v_changes := v_changes || jsonb_build_object('assigned_to', jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to));
    END IF;
    IF NEW.internal_notes IS DISTINCT FROM OLD.internal_notes THEN
      v_changes := v_changes || jsonb_build_object('internal_notes', jsonb_build_object('from', OLD.internal_notes, 'to', NEW.internal_notes));
    END IF;

    IF v_changes <> '{}'::jsonb THEN
      INSERT INTO public.ad_inquiry_audit (inquiry_id, actor_id, action, metadata)
      VALUES (NEW.id, v_actor, 'edited', jsonb_build_object('changes', v_changes));
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
-- ===== END SOURCE MIGRATION: 20260607055051_b92fd447-fac7-450f-ba0a-d924f986fab3.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260608001625_03d95da2-89a5-4b5a-a475-8712ab4c8e83.sql =====

-- Security fixes from scanner findings

-- 1) advertisements: drop public-read RLS policy. Public reads happen via
--    the active_ads_public view (which excludes advertiser_email/advertiser_name);
--    ad managers continue to read via their own policy.
DROP POLICY IF EXISTS "Public reads active-ad safe columns" ON public.advertisements;

-- 2) storage.objects: fix broken business-gallery upload policy that referenced
--    b.name (businesses.name column) instead of the storage object's name.
DROP POLICY IF EXISTS "Authenticated upload to business gallery" ON storage.objects;
CREATE POLICY "Authenticated upload to business gallery"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-gallery'
    AND EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
        AND (
          b.owner_id = auth.uid()
          OR (b.organization_id IS NOT NULL
              AND public.can_manage_org(auth.uid(), b.organization_id))
        )
    )
  );

-- 3) lead_offer_unlocks: remove user-facing INSERT. Unlock rows are only
--    legitimately created by the server function (which uses the service-role
--    admin client and validates payment + capacity). Removing this policy
--    closes the bypass where a buyer could insert a row directly and then
--    read contact details from lead_offers.
DROP POLICY IF EXISTS "Buyers insert their own unlocks" ON public.lead_offer_unlocks;

-- ===== END SOURCE MIGRATION: 20260608001625_03d95da2-89a5-4b5a-a475-8712ab4c8e83.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260608030747_4c204071-50ca-49c9-8f66-218b1d165e34.sql =====
-- Add body-repair tag and promote the 7 core repair service categories to "popular"
-- so they surface as quick-filter chips on submit and browse for repair shops.
INSERT INTO public.business_tags (slug, label, type_slug, is_popular, sort_order)
VALUES ('body-repair', 'Body repair', 'repair_shop', true, 55)
ON CONFLICT (slug) DO UPDATE SET is_popular = EXCLUDED.is_popular, sort_order = EXCLUDED.sort_order;

UPDATE public.business_tags
SET is_popular = true
WHERE slug IN (
  'tire-mount-balance',     -- Tires
  'brake-service',          -- Brakes
  'suspension-service',     -- Suspension
  'engine-overhaul',        -- Engine
  'at-mt-repair',           -- Transmission
  'obd-diagnostics',        -- Diagnostics
  'body-repair'             -- Body repair
);
-- ===== END SOURCE MIGRATION: 20260608030747_4c204071-50ca-49c9-8f66-218b1d165e34.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260608052614_e12f8038-b3ea-4b0e-8077-31dd60729327.sql =====

INSERT INTO public.businesses (owner_id, slug, name, type_slug, description, phone, region, province, city, status, source, source_external_id, attribution, photos)
VALUES
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-quezon-auto-repair','[Sample] Quezon Auto Repair','repair_shop','Full-service auto repair shop specializing in Toyota, Honda, and Mitsubishi. Engine diagnostics, transmission, brakes, A/C.','+63 917 555 0101','NCR','Metro Manila','Quezon City','active','seed','seed-biz-01','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-makati-fast-towing','[Sample] Makati Fast Towing','towing','24/7 flatbed and wheel-lift towing across Metro Manila. Roadside assistance, jumpstart, tire change.','+63 917 555 0102','NCR','Metro Manila','Makati','active','seed','seed-biz-02','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-banawe-parts-supply','[Sample] Banawe Parts Supply','parts_accessories','OEM and aftermarket parts for Japanese and Korean cars. Walk-in and nationwide shipping.','+63 917 555 0103','NCR','Metro Manila','Quezon City','active','seed','seed-biz-03','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-pasig-tire-center','[Sample] Pasig Tire Center','tire_shop','New and slightly used tires, alignment, balancing, nitrogen fill. Bridgestone, Yokohama, GT Radial.','+63 917 555 0104','NCR','Metro Manila','Pasig','active','seed','seed-biz-04','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-cebu-shine-detailing','[Sample] Cebu Shine Auto Detailing','carwash','Hand car wash, interior detailing, ceramic coating, paint protection film. Pickup available.','+63 917 555 0105','Region VII','Cebu','Cebu City','active','seed','seed-biz-05','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-mandaluyong-moto-works','[Sample] Mandaluyong Moto Works','motorcycle_shop','Motorcycle parts, accessories, and service. Honda Click, Yamaha NMAX, Kawasaki Rouser.','+63 917 555 0106','NCR','Metro Manila','Mandaluyong','active','seed','seed-biz-06','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-davao-used-cars','[Sample] Davao Used Cars','used_dealership','Quality pre-owned vehicles. Financing assistance, trade-ins accepted, OR/CR clean.','+63 917 555 0107','Region XI','Davao del Sur','Davao City','active','seed','seed-biz-07','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-laoag-body-paint','[Sample] Laoag Body & Paint','body_paint','Collision repair, dent removal, full repaint, plastic bumper restoration. Insurance accredited.','+63 917 555 0108','Region I','Ilocos Norte','Laoag','active','seed','seed-biz-08','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-bgc-battery-hub','[Sample] BGC Battery Hub','battery_shop','Motolite, Amaron, Century batteries. Free installation and old-battery trade-in.','+63 917 555 0109','NCR','Metro Manila','Taguig','active','seed','seed-biz-09','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-alabang-audio-tint','[Sample] Alabang Audio & Tint','audio_tint','Car audio upgrades, dash cams, window tint, alarm systems. Pioneer, Kenwood, 3M.','+63 917 555 0110','NCR','Metro Manila','Muntinlupa','active','seed','seed-biz-10','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-iloilo-salvage-yard','[Sample] Iloilo Salvage Yard','salvage','Used engine, transmission, body parts. Toyota, Mitsubishi, Isuzu specialists.','+63 917 555 0111','Region VI','Iloilo','Iloilo City','active','seed','seed-biz-11','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-manila-driving-academy','[Sample] Manila Driving Academy','driving_school','LTO-accredited driver education. Manual, automatic, motorcycle. Student permit assistance.','+63 917 555 0112','NCR','Metro Manila','Manila','active','seed','seed-biz-12','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-ph-auto-insurance','[Sample] PH Auto Insurance Brokers','insurance','CTPL, comprehensive, and fleet insurance. Multiple providers, instant quotes.','+63 917 555 0113','NCR','Metro Manila','Pasay','active','seed','seed-biz-13','Sample listing','[]'),
('a3999f39-3641-4e16-a11b-f2b6563b8a8f','sample-easy-auto-loans','[Sample] Easy Auto Loans PH','financing','Car and motorcycle financing. New, used, and refinancing. Bank and in-house options.','+63 917 555 0114','NCR','Metro Manila','Quezon City','active','seed','seed-biz-14','Sample listing','[]');

-- ===== END SOURCE MIGRATION: 20260608052614_e12f8038-b3ea-4b0e-8077-31dd60729327.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260608061836_2d3a4896-bee4-424d-ae82-6c19557df804.sql =====

ALTER TABLE public.reports
  ALTER COLUMN listing_id DROP NOT NULL,
  ALTER COLUMN reporter_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'listing'
    CHECK (target_type IN ('listing','business','seller','other')),
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS evidence_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reporter_name text,
  ADD COLUMN IF NOT EXISTS reporter_email text,
  ADD COLUMN IF NOT EXISTS reporter_phone text;

CREATE INDEX IF NOT EXISTS reports_business_id_idx ON public.reports(business_id);
CREATE INDEX IF NOT EXISTS reports_target_type_idx ON public.reports(target_type);

DROP POLICY IF EXISTS "Users create reports" ON public.reports;
CREATE POLICY "Anyone can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    (reporter_id IS NULL AND auth.uid() IS NULL)
    OR reporter_id = auth.uid()
  );

GRANT INSERT ON public.reports TO anon;

-- Storage policies for report-evidence bucket
CREATE POLICY "Anyone can upload report evidence"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'report-evidence');

CREATE POLICY "Moderators read report evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-evidence' AND public.can_support(auth.uid()));

-- ===== END SOURCE MIGRATION: 20260608061836_2d3a4896-bee4-424d-ae82-6c19557df804.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260608065742_3fe92331-464d-4bf6-bbd2-63b243db14a0.sql =====

-- Seed affiliate Shop products for audit item #10
-- Cleanup: DELETE FROM shop_products WHERE '365-seed' = ANY(tags);

INSERT INTO public.shop_products (slug, title, description, brand, category_id, price_php, tags, image_url, active, featured)
SELECT d.slug, d.title, d.description, d.brand, c.id, d.price_php, d.tags, d.image_url, true, false
FROM (VALUES
  ('seed-obd2-scanner-elm327','OBD2 Scanner (ELM327 Bluetooth)','Plug-and-play OBD2 diagnostic scanner. Works with Torque Pro and most modern cars. Reads and clears check-engine codes.','Generic','diagnostics',499::numeric,ARRAY['365-seed','obd2','diagnostics'],'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800'),
  ('seed-ancel-ad310-scanner','Ancel AD310 OBD2 Code Reader','Classic wired OBD2 scanner. No phone needed — reads engine codes on the built-in screen. Reliable starter tool.','Ancel','diagnostics',1490,ARRAY['365-seed','obd2','diagnostics'],'https://images.unsplash.com/photo-1632823471565-1ec56a3a4af1?w=800'),
  ('seed-dashcam-1080p-front','1080p Dash Cam (Front)','Loop-recording dash cam with night mode and G-sensor. Easy windshield mount. Great evidence for accidents and insurance.','Generic','dashcams',1290,ARRAY['365-seed','dashcam'],'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800'),
  ('seed-dashcam-dual-4k','Dual Channel 4K Dash Cam','Front + rear dash cam with parking mode and WiFi app. Captures both directions in case of rear-end collisions.','Generic','dashcams',3490,ARRAY['365-seed','dashcam'],'https://images.unsplash.com/photo-1597007030739-6d2e7172ee6c?w=800'),
  ('seed-motorcycle-helmet-fullface','Full Face Motorcycle Helmet (DOT)','Full-face helmet with anti-fog visor. DOT-certified. Comfortable padding for long rides.','Generic','jacks-stands',1990,ARRAY['365-seed','motorcycle','safety'],'https://images.unsplash.com/photo-1591637333472-cdbf9b9bda1d?w=800'),
  ('seed-motorcycle-rain-gear','Motorcycle Rain Suit (Jacket + Pants)','2-piece waterproof rain suit for riders. Reflective strips and reinforced seams. Packs into a small pouch.','Generic','jacks-stands',790,ARRAY['365-seed','motorcycle','rain'],'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800'),
  ('seed-led-headlight-h4','LED Headlight Bulbs H4 (Pair)','Plug-and-play LED headlight upgrade. 6000K white. Brighter than halogen, lower power draw.','Generic','lighting',890,ARRAY['365-seed','lighting'],'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800'),
  ('seed-led-light-bar-22in','22" LED Light Bar (Off-road)','Combo beam off-road light bar. Includes wiring harness and switch. For trucks, SUVs, and 4x4 builds.','Generic','lighting',1490,ARRAY['365-seed','lighting','truck'],'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800'),
  ('seed-car-cover-sedan','Universal Car Cover (Sedan)','Waterproof, UV-resistant car cover. Elastic hem for snug fit. Fits most sedans.','Generic','organizers',990,ARRAY['365-seed','exterior'],'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800'),
  ('seed-battery-charger-smart','Smart Car Battery Charger 12V','Automatic 12V battery charger / maintainer. Prevents overcharging. Great for cars left parked.','Generic','workshop-equipment',1290,ARRAY['365-seed','battery'],'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=800'),
  ('seed-jump-starter-portable','Portable Jump Starter (12V Lithium)','Pocket-size lithium jump starter. Doubles as power bank with USB. Starts cars and motorcycles up to 6L gas.','Generic','workshop-equipment',2490,ARRAY['365-seed','battery','emergency'],'https://images.unsplash.com/photo-1626668893632-6f3a4466d22f?w=800'),
  ('seed-tire-inflator-cordless','Cordless Tire Inflator','Rechargeable digital tire inflator with auto-stop. Inflates car, motorcycle, and bicycle tires. LED light included.','Generic','workshop-equipment',1690,ARRAY['365-seed','tire','emergency'],'https://images.unsplash.com/photo-1612831661309-ad6a40b91e34?w=800'),
  ('seed-detailing-kit-starter','Car Detailing Kit (Starter)','Wash mitt, microfiber towels, applicators, and brushes. Everything to start hand-washing and detailing at home.','Generic','microfiber',890,ARRAY['365-seed','detailing'],'https://images.unsplash.com/photo-1605618826115-fb9e1cf09110?w=800'),
  ('seed-ceramic-coating-9h','9H Ceramic Coating Kit','DIY 9H ceramic coating with applicator pad and microfiber. Long-lasting hydrophobic gloss.','Generic','waxes-coatings',1290,ARRAY['365-seed','detailing','coating'],'https://images.unsplash.com/photo-1635770342142-cbe92775eb9b?w=800'),
  ('seed-tool-set-mechanic-120pc','120-Piece Mechanic Tool Set','Sockets, ratchets, screwdrivers, and pliers in a hard case. Solid starter toolkit for home garages.','Generic','hand-tools',2990,ARRAY['365-seed','tools'],'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800'),
  ('seed-phone-mount-magnetic','Magnetic Phone Mount (Vent)','Strong magnetic phone holder that clips to AC vent. One-hand mounting. Works with most phones.','Generic','phone-mounts',290,ARRAY['365-seed','phone'],'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800'),
  ('seed-phone-mount-wireless-charge','Wireless Charging Phone Mount','Auto-clamp phone holder with 15W Qi wireless charging. Mounts on dashboard or windshield.','Generic','phone-mounts',990,ARRAY['365-seed','phone','charging'],'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800'),
  ('seed-truck-bed-liner-spray','Truck Bed Liner Spray','Roll-on / spray-on truck bed protective coating. Resists scratches, rust, and UV. Black finish.','Generic','organizers',1990,ARRAY['365-seed','truck'],'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800'),
  ('seed-sunshade-front-windshield','Foldable Front Windshield Sun Shade','Reflective sun shade that pops open in seconds. Keeps interior cool and protects the dashboard.','Generic','organizers',390,ARRAY['365-seed','exterior','sun'],'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800'),
  ('seed-seat-cover-universal-pair','Universal Front Seat Covers (Pair)','Breathable seat covers that fit most cars. Easy install. Protects against spills, pet hair, and wear.','Generic','seat-covers',790,ARRAY['365-seed','interior'],'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'),
  ('seed-floor-mat-3d-universal','3D All-Weather Floor Mats','Universal 3D floor mats with raised edges. Traps water and mud. Easy to hose clean.','Generic','floor-mats',990,ARRAY['365-seed','interior'],'https://images.unsplash.com/photo-1604357209793-fca5dca89f97?w=800')
) AS d(slug, title, description, brand, category_slug, price_php, tags, image_url)
JOIN public.shop_categories c ON c.slug = d.category_slug
ON CONFLICT (slug) DO NOTHING;

-- Shopee PH search links for each seeded product
INSERT INTO public.shop_product_links (product_id, network_id, url, in_stock)
SELECT p.id,
       (SELECT id FROM public.affiliate_networks WHERE slug = 'shopee' LIMIT 1),
       'https://shopee.ph/search?keyword=' || replace(d.search_q, ' ', '%20'),
       true
FROM public.shop_products p
JOIN (VALUES
  ('seed-obd2-scanner-elm327','obd2 scanner elm327 bluetooth'),
  ('seed-ancel-ad310-scanner','ancel ad310 obd2'),
  ('seed-dashcam-1080p-front','dash cam 1080p'),
  ('seed-dashcam-dual-4k','dual dash cam 4k front rear'),
  ('seed-motorcycle-helmet-fullface','full face motorcycle helmet'),
  ('seed-motorcycle-rain-gear','motorcycle rain suit'),
  ('seed-led-headlight-h4','led headlight h4 pair'),
  ('seed-led-light-bar-22in','22 inch led light bar offroad'),
  ('seed-car-cover-sedan','car cover sedan waterproof'),
  ('seed-battery-charger-smart','smart battery charger 12v'),
  ('seed-jump-starter-portable','portable jump starter lithium'),
  ('seed-tire-inflator-cordless','cordless tire inflator digital'),
  ('seed-detailing-kit-starter','car detailing kit'),
  ('seed-ceramic-coating-9h','ceramic coating 9h diy'),
  ('seed-tool-set-mechanic-120pc','mechanic tool set 120 piece'),
  ('seed-phone-mount-magnetic','magnetic phone mount car vent'),
  ('seed-phone-mount-wireless-charge','wireless charging car phone mount'),
  ('seed-truck-bed-liner-spray','truck bed liner spray'),
  ('seed-sunshade-front-windshield','foldable sun shade front windshield'),
  ('seed-seat-cover-universal-pair','universal car seat cover pair'),
  ('seed-floor-mat-3d-universal','3d floor mats universal car')
) AS d(slug, search_q) ON d.slug = p.slug
ON CONFLICT (product_id, network_id) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260608065742_3fe92331-464d-4bf6-bbd2-63b243db14a0.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260608092901_ee4416c6-d63a-49e5-a6f8-5bbcc595767e.sql =====

CREATE TYPE public.wanted_post_status AS ENUM ('open','closed','expired');
CREATE TYPE public.wanted_post_category AS ENUM ('car','motorcycle','truck','equipment','part','service','tow','other');
CREATE TYPE public.wanted_contact_method AS ENUM ('platform','phone','messenger','any');

CREATE TABLE public.wanted_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 4 AND 140),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 4000),
  category public.wanted_post_category NOT NULL DEFAULT 'other',
  budget_min_php numeric(12,2),
  budget_max_php numeric(12,2),
  region text,
  city text,
  contact_method public.wanted_contact_method NOT NULL DEFAULT 'platform',
  contact_value text,
  status public.wanted_post_status NOT NULL DEFAULT 'open',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  response_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wanted_posts_status_idx ON public.wanted_posts(status, created_at DESC);
CREATE INDEX wanted_posts_category_idx ON public.wanted_posts(category, status);
CREATE INDEX wanted_posts_user_idx ON public.wanted_posts(user_id, created_at DESC);

GRANT SELECT ON public.wanted_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wanted_posts TO authenticated;
GRANT ALL ON public.wanted_posts TO service_role;

ALTER TABLE public.wanted_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open wanted posts"
  ON public.wanted_posts FOR SELECT
  USING (status = 'open' OR auth.uid() = user_id);

CREATE POLICY "Users can create their own wanted posts"
  ON public.wanted_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wanted posts"
  ON public.wanted_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wanted posts"
  ON public.wanted_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE public.wanted_post_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wanted_post_id uuid NOT NULL REFERENCES public.wanted_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) BETWEEN 5 AND 2000),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  contact_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wanted_post_responses_post_idx ON public.wanted_post_responses(wanted_post_id, created_at DESC);
CREATE INDEX wanted_post_responses_user_idx ON public.wanted_post_responses(user_id, created_at DESC);

GRANT SELECT ON public.wanted_post_responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wanted_post_responses TO authenticated;
GRANT ALL ON public.wanted_post_responses TO service_role;

ALTER TABLE public.wanted_post_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view responses to open posts"
  ON public.wanted_post_responses FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.wanted_posts wp
      WHERE wp.id = wanted_post_id
        AND (wp.status = 'open' OR wp.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can respond to open wanted posts"
  ON public.wanted_post_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.wanted_posts wp
      WHERE wp.id = wanted_post_id AND wp.status = 'open'
    )
  );

CREATE POLICY "Users can update their own responses"
  ON public.wanted_post_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own responses"
  ON public.wanted_post_responses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- updated_at triggers (reuse existing function if available)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_wanted_posts_updated_at
  BEFORE UPDATE ON public.wanted_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_wanted_post_responses_updated_at
  BEFORE UPDATE ON public.wanted_post_responses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- maintain response_count
CREATE OR REPLACE FUNCTION public.wanted_post_responses_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.wanted_posts SET response_count = response_count + 1 WHERE id = NEW.wanted_post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.wanted_posts SET response_count = GREATEST(response_count - 1, 0) WHERE id = OLD.wanted_post_id;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_wanted_post_responses_count
  AFTER INSERT OR DELETE ON public.wanted_post_responses
  FOR EACH ROW EXECUTE FUNCTION public.wanted_post_responses_count();

-- auto-expire trigger (validation via trigger, not CHECK, since now() is non-immutable)
CREATE OR REPLACE FUNCTION public.wanted_posts_validate()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.expires_at <= now() AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'expires_at must be in the future';
  END IF;
  IF NEW.budget_min_php IS NOT NULL AND NEW.budget_max_php IS NOT NULL
     AND NEW.budget_min_php > NEW.budget_max_php THEN
    RAISE EXCEPTION 'budget_min_php cannot exceed budget_max_php';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_wanted_posts_validate
  BEFORE INSERT OR UPDATE ON public.wanted_posts
  FOR EACH ROW EXECUTE FUNCTION public.wanted_posts_validate();

-- ===== END SOURCE MIGRATION: 20260608092901_ee4416c6-d63a-49e5-a6f8-5bbcc595767e.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260608095644_fb9d08f4-071d-4fd8-b79c-6af03bd600f1.sql =====

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seller_rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_rating_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_updated_at timestamptz;

CREATE TABLE public.seller_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text CHECK (body IS NULL OR length(body) <= 2000),
  transaction_completed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_reviews_no_self CHECK (seller_id <> reviewer_id)
);

CREATE UNIQUE INDEX seller_reviews_unique_per_listing
  ON public.seller_reviews (seller_id, reviewer_id, COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX seller_reviews_seller_idx ON public.seller_reviews (seller_id, status, created_at DESC);
CREATE INDEX seller_reviews_reviewer_idx ON public.seller_reviews (reviewer_id);

GRANT SELECT ON public.seller_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_reviews TO authenticated;
GRANT ALL ON public.seller_reviews TO service_role;

ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active reviews public read" ON public.seller_reviews
  FOR SELECT USING (
    status = 'active' OR auth.uid() = reviewer_id OR auth.uid() = seller_id OR public.can_moderate(auth.uid())
  );

CREATE POLICY "Users insert own review" ON public.seller_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id AND auth.uid() <> seller_id);

CREATE POLICY "Users update own review" ON public.seller_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id) WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users delete own review" ON public.seller_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

CREATE POLICY "Moderators manage seller reviews" ON public.seller_reviews
  FOR ALL USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

CREATE TRIGGER trg_seller_reviews_updated_at
  BEFORE UPDATE ON public.seller_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.recompute_seller_rating(_seller uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric(3,2);
  v_count integer;
BEGIN
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)::numeric(3,2),
         COUNT(*)::int
    INTO v_avg, v_count
    FROM public.seller_reviews
   WHERE seller_id = _seller AND status = 'active';

  UPDATE public.profiles
     SET seller_rating_avg = v_avg,
         seller_rating_count = v_count,
         reviews_updated_at = now()
   WHERE id = _seller;
END;
$$;

CREATE OR REPLACE FUNCTION public.seller_reviews_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_seller_rating(OLD.seller_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.seller_id <> NEW.seller_id THEN
    PERFORM public.recompute_seller_rating(OLD.seller_id);
    PERFORM public.recompute_seller_rating(NEW.seller_id);
    RETURN NEW;
  ELSE
    PERFORM public.recompute_seller_rating(NEW.seller_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_seller_reviews_aggregate
  AFTER INSERT OR UPDATE OR DELETE ON public.seller_reviews
  FOR EACH ROW EXECUTE FUNCTION public.seller_reviews_after_change();

DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, full_name, avatar_url, seller_type, business_name, business_logo_url,
       business_address, business_region, business_province, business_city, business_barangay,
       business_lat, business_lng, business_hours, business_kind,
       verification_status, verified_at,
       fb_profile_url, fb_profile_id, fb_verified_at,
       is_founding_member, founding_member_number,
       created_at,
       seller_rating_avg, seller_rating_count, reviews_updated_at
  FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ===== END SOURCE MIGRATION: 20260608095644_fb9d08f4-071d-4fd8-b79c-6af03bd600f1.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609094648_2cdf7fd2-dac7-42b1-ab63-49c73c67924a.sql =====

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS ownership_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS disclosures jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS modifications text,
  ADD COLUMN IF NOT EXISTS transferred_to_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS passport_premium boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.vehicle_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vehicle_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_photos TO authenticated;
GRANT ALL ON public.vehicle_photos TO service_role;

ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public vehicle photos readable"
  ON public.vehicle_photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = vehicle_photos.vehicle_id AND v.is_public = true
  ));

CREATE POLICY "Owners manage own vehicle photos"
  ON public.vehicle_photos FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Admins manage vehicle photos"
  ON public.vehicle_photos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle ON public.vehicle_photos(vehicle_id, sort_order);

-- ===== END SOURCE MIGRATION: 20260609094648_2cdf7fd2-dac7-42b1-ab63-49c73c67924a.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609103310_426c088d-266f-41b9-8be0-b6e103c4d1af.sql =====

-- 1. business_bookings: validate INSERT
DROP POLICY IF EXISTS "Anyone can create a booking" ON public.business_bookings;
CREATE POLICY "Anyone can create a valid booking"
  ON public.business_bookings
  FOR INSERT
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.business_bookable_items i
      WHERE i.id = business_bookings.bookable_item_id
        AND i.business_id = business_bookings.business_id
        AND i.active = true
    )
  );

-- 2. email_routes: role-based admin gating
DROP POLICY IF EXISTS "Super-admin can read email routes" ON public.email_routes;
DROP POLICY IF EXISTS "Super-admin can insert email routes" ON public.email_routes;
DROP POLICY IF EXISTS "Super-admin can update email routes" ON public.email_routes;
DROP POLICY IF EXISTS "Super-admin can delete email routes" ON public.email_routes;

CREATE POLICY "Admins read email routes"
  ON public.email_routes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert email routes"
  ON public.email_routes FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update email routes"
  ON public.email_routes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete email routes"
  ON public.email_routes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Storage: restrict report-evidence uploads
DROP POLICY IF EXISTS "Anyone can upload report evidence" ON storage.objects;
CREATE POLICY "Authenticated users upload report evidence to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'report-evidence'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- 4. Wanted posts/responses: hide contact_value from anonymous visitors
REVOKE SELECT (contact_value) ON public.wanted_posts FROM anon;
REVOKE SELECT (contact_value) ON public.wanted_post_responses FROM anon;

-- ===== END SOURCE MIGRATION: 20260609103310_426c088d-266f-41b9-8be0-b6e103c4d1af.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609110225_077cc862-a837-4d02-bdf2-729169c31be7.sql =====

CREATE TABLE public.inspection_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price_php_min INTEGER NOT NULL DEFAULT 0,
  price_php_max INTEGER,
  pricing_unit TEXT NOT NULL DEFAULT 'flat',
  currency TEXT NOT NULL DEFAULT 'PHP',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.inspection_services TO anon, authenticated;
GRANT ALL ON public.inspection_services TO service_role;

ALTER TABLE public.inspection_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active inspection services"
ON public.inspection_services FOR SELECT
USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage inspection services"
ON public.inspection_services FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER inspection_services_set_updated_at
  BEFORE UPDATE ON public.inspection_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.inspection_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.inspection_services(id) ON DELETE RESTRICT,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  vehicle_summary TEXT,
  region TEXT,
  preferred_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  provider_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX inspection_orders_buyer_idx ON public.inspection_orders(buyer_id);
CREATE INDEX inspection_orders_service_idx ON public.inspection_orders(service_id);
CREATE INDEX inspection_orders_status_idx ON public.inspection_orders(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_orders TO authenticated;
GRANT ALL ON public.inspection_orders TO service_role;

ALTER TABLE public.inspection_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers create own inspection orders"
ON public.inspection_orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers view own inspection orders"
ON public.inspection_orders FOR SELECT TO authenticated
USING (auth.uid() = buyer_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE POLICY "Buyers update own pending orders"
ON public.inspection_orders FOR UPDATE TO authenticated
USING (auth.uid() = buyer_id AND status IN ('requested','assigned'))
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins manage inspection orders"
ON public.inspection_orders FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE TRIGGER inspection_orders_set_updated_at
  BEFORE UPDATE ON public.inspection_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.inspection_services (slug, name, description, category, price_php_min, price_php_max, pricing_unit, sort_order) VALUES
  ('or-cr-review',       'OR/CR document review',          'A 365-vetted reviewer checks the seller''s Official Receipt and Certificate of Registration for tampering, expiry, encumbrance flags, and that the registered owner matches.', 'or_cr_review',     199, 499, 'flat',       10),
  ('seller-id-verify',   'Seller ID verification',         'We verify the seller''s government-issued ID against the name on the OR/CR and confirm a live selfie match.',                                                                  'id_verify',         99, 299, 'flat',       20),
  ('pre-purchase-lead',  'Pre-purchase inspection (lead)', 'We route your request to a vetted PH inspection mechanic in your region. You pay the inspector directly; pricing varies by location and vehicle.',                              'prepurchase',      500, 2500, 'flat',       30),
  ('mechanic-booking',   'Mechanic inspection booking',    'Concierge booking for a partner mechanic to perform a hands-on inspection. 365 takes a small commission from the mechanic; the buyer''s booking is free.',                     'prepurchase',        0, NULL, 'commission', 40),
  ('history-report',     'Vehicle history / Passport report', 'PDF report compiled from the vehicle''s 365 Passport timeline plus public LTO/HPG checks where available.',                                                                  'history_report',   199, 999, 'flat',       50),
  ('transaction-assist', 'Transaction assistance',         'Guided document hand-off and payment-release coordination. 365 is not an escrow agent — funds are released through a regulated payment release partner.',                       'transaction_assist', 0, NULL, 'percent',  60);

-- ===== END SOURCE MIGRATION: 20260609110225_077cc862-a837-4d02-bdf2-729169c31be7.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609111324_6c48b235-a3a4-4485-b6d5-9b1503108849.sql =====

-- Enum for verification status
DO $$ BEGIN
  CREATE TYPE public.passport_verification_status AS ENUM ('pending','more_info','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.vehicle_passport_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL,
  status public.passport_verification_status NOT NULL DEFAULT 'pending',
  or_number text,
  cr_number text,
  chassis_number text,
  engine_number text,
  plate_number text,
  inspection_date date,
  inspection_provider text,
  inspection_notes text,
  accident_disclosure boolean NOT NULL DEFAULT false,
  flood_disclosure boolean NOT NULL DEFAULT false,
  document_urls text[] NOT NULL DEFAULT '{}',
  reviewer_id uuid,
  review_notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_verification_per_vehicle UNIQUE (vehicle_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_passport_verifications TO authenticated;
GRANT ALL ON public.vehicle_passport_verifications TO service_role;

ALTER TABLE public.vehicle_passport_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own verification"
  ON public.vehicle_passport_verifications FOR SELECT TO authenticated
  USING (
    submitted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE POLICY "Owners create own verification"
  ON public.vehicle_passport_verifications FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.owner_user_id = auth.uid())
  );

CREATE POLICY "Owners update pending verification"
  ON public.vehicle_passport_verifications FOR UPDATE TO authenticated
  USING (
    (submitted_by = auth.uid() AND status IN ('pending','more_info'))
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
  WITH CHECK (
    submitted_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE POLICY "Owners delete pending verification"
  ON public.vehicle_passport_verifications FOR DELETE TO authenticated
  USING (
    (submitted_by = auth.uid() AND status IN ('pending','more_info'))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_vpv_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS vpv_set_updated_at ON public.vehicle_passport_verifications;
CREATE TRIGGER vpv_set_updated_at BEFORE UPDATE ON public.vehicle_passport_verifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_vpv_set_updated_at();

-- On approve/reject/more_info, set decided_at; mirror disclosures into vehicles on approve
CREATE OR REPLACE FUNCTION public.tg_vpv_on_decision() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected','more_info') THEN
    NEW.decided_at := now();
  END IF;
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    UPDATE public.vehicles
      SET disclosures = COALESCE(disclosures,'{}'::jsonb)
        || jsonb_build_object(
          'accident', NEW.accident_disclosure,
          'flood', NEW.flood_disclosure,
          'verified_at', to_jsonb(now())
        )
      WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS vpv_on_decision ON public.vehicle_passport_verifications;
CREATE TRIGGER vpv_on_decision BEFORE UPDATE ON public.vehicle_passport_verifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_vpv_on_decision();

-- Public-safe view function (masks PII)
CREATE OR REPLACE FUNCTION public.get_public_passport_verification(_slug text)
RETURNS TABLE (
  status public.passport_verification_status,
  inspection_date date,
  inspection_provider text,
  accident_disclosure boolean,
  flood_disclosure boolean,
  chassis_last4 text,
  plate_masked text,
  decided_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    vpv.status,
    vpv.inspection_date,
    vpv.inspection_provider,
    vpv.accident_disclosure,
    vpv.flood_disclosure,
    CASE WHEN vpv.chassis_number IS NOT NULL AND length(vpv.chassis_number) >= 4
         THEN right(vpv.chassis_number, 4) END,
    CASE WHEN vpv.plate_number IS NOT NULL AND length(vpv.plate_number) >= 3
         THEN repeat('*', greatest(length(vpv.plate_number) - 3, 1)) || right(vpv.plate_number, 3) END,
    vpv.decided_at
  FROM public.vehicle_passport_verifications vpv
  JOIN public.vehicles v ON v.id = vpv.vehicle_id
  WHERE v.passport_slug = _slug AND v.is_public = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_passport_verification(text) TO anon, authenticated;

-- Storage bucket policies (bucket created via storage tool separately)
CREATE POLICY "Passport docs: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-passport-docs'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Passport docs: owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'vehicle-passport-docs'
    AND ((storage.foldername(name))[1] = (auth.uid())::text
         OR public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'moderator'::app_role))
  );

CREATE POLICY "Passport docs: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'vehicle-passport-docs'
    AND ((storage.foldername(name))[1] = (auth.uid())::text
         OR public.has_role(auth.uid(), 'admin'::app_role))
  );

-- ===== END SOURCE MIGRATION: 20260609111324_6c48b235-a3a4-4485-b6d5-9b1503108849.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609113058_24366c82-0d4b-4d5d-a8a1-e51f56472c95.sql =====

-- 1. Vehicle premium expiry
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS passport_premium_until timestamptz;

-- 2. Premium product catalog
CREATE TABLE IF NOT EXISTS public.passport_premium_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  price_php numeric(14,2) NOT NULL,
  duration_days integer NOT NULL,
  stripe_lookup_key text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.passport_premium_products TO anon, authenticated;
GRANT ALL ON public.passport_premium_products TO service_role;

ALTER TABLE public.passport_premium_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active premium products public read"
  ON public.passport_premium_products FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage premium products"
  ON public.passport_premium_products FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Purchases ledger
CREATE TABLE IF NOT EXISTS public.passport_premium_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL REFERENCES public.passport_premium_products(slug),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppp_vehicle ON public.passport_premium_purchases(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ppp_user ON public.passport_premium_purchases(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ppp_session ON public.passport_premium_purchases(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

GRANT SELECT ON public.passport_premium_purchases TO authenticated;
GRANT ALL ON public.passport_premium_purchases TO service_role;

ALTER TABLE public.passport_premium_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own purchases"
  ON public.passport_premium_purchases FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage purchases"
  ON public.passport_premium_purchases FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Seed yearly product
INSERT INTO public.passport_premium_products (slug, label, description, price_php, duration_days, stripe_lookup_key, sort_order)
VALUES (
  'passport_premium_yearly',
  'Passport Premium — 1 year',
  'Featured Verified badge, downloadable PDF history report, branded share card, and extended service-record storage. Valid for 12 months.',
  299.00,
  365,
  'passport_premium_yearly',
  10
)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  price_php = EXCLUDED.price_php,
  duration_days = EXCLUDED.duration_days,
  stripe_lookup_key = EXCLUDED.stripe_lookup_key,
  updated_at = now();

-- ===== END SOURCE MIGRATION: 20260609113058_24366c82-0d4b-4d5d-a8a1-e51f56472c95.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609134449_b3e5e3ae-973d-42b6-935f-6503830e5b15.sql =====
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS sponsor_partner_id uuid REFERENCES public.training_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sponsored_until timestamptz;
CREATE INDEX IF NOT EXISTS idx_courses_sponsor_partner ON public.courses(sponsor_partner_id);
-- ===== END SOURCE MIGRATION: 20260609134449_b3e5e3ae-973d-42b6-935f-6503830e5b15.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609135634_7449cd6c-adce-4836-a039-4571160c11e4.sql =====
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS invoice_number text UNIQUE;

CREATE INDEX IF NOT EXISTS payments_status_method_idx ON public.payments(status, method);

CREATE TABLE IF NOT EXISTS public.payment_method_config (
  method text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  label text NOT NULL,
  instructions_md text,
  account_name text,
  account_number text,
  qr_image_url text,
  sort_order int NOT NULL DEFAULT 100,
  is_manual boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_method_config TO anon, authenticated;
GRANT ALL ON public.payment_method_config TO service_role;

ALTER TABLE public.payment_method_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled methods"
  ON public.payment_method_config FOR SELECT
  USING (enabled = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage payment methods"
  ON public.payment_method_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER pmc_set_updated_at
  BEFORE UPDATE ON public.payment_method_config
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.payment_method_config (method, enabled, label, instructions_md, sort_order, is_manual) VALUES
  ('stripe', true, 'Card / Wallet (Stripe)', 'Pay securely with credit/debit card or supported wallets.', 10, false),
  ('gcash_manual', true, 'GCash (Manual)', 'Send payment to our GCash account, then upload your receipt below. We''ll confirm within 1 business day.', 20, true),
  ('maya_manual', false, 'Maya (Manual)', 'Send payment to our Maya account, then upload your receipt below.', 30, true),
  ('qrph', false, 'QR Ph', 'Scan the QR Ph code with any participating PH bank or wallet, then upload your receipt below.', 40, true),
  ('bank_transfer', false, 'Bank Transfer', 'Transfer to the bank account shown below. Use your invoice number as the reference.', 50, true),
  ('paypal_manual', false, 'PayPal (Manual)', 'Send payment to our PayPal account, then upload your transaction ID and screenshot below.', 60, true)
ON CONFLICT (method) DO NOTHING;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text := 'INV-' || to_char(now(), 'YYYYMM') || '-';
  n int;
BEGIN
  SELECT COUNT(*) + 1 INTO n
    FROM public.payments
    WHERE invoice_number LIKE prefix || '%';
  RETURN prefix || lpad(n::text, 5, '0');
END $$;
-- ===== END SOURCE MIGRATION: 20260609135634_7449cd6c-adce-4836-a039-4571160c11e4.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609135725_293408c6-2ad8-4b94-9c58-54da4f131c87.sql =====
DROP POLICY IF EXISTS "Users upload own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users read own payment proofs" ON storage.objects;

CREATE POLICY "Users upload own payment proofs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own payment proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR has_role(auth.uid(), 'admin'::app_role)));
-- ===== END SOURCE MIGRATION: 20260609135725_293408c6-2ad8-4b94-9c58-54da4f131c87.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609140507_e60a3304-5bfa-4d23-83ad-d98fdc22eaa6.sql =====

-- 1. Columns on payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS review_state text NOT NULL DEFAULT 'awaiting_review',
  ADD COLUMN IF NOT EXISTS review_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_started_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_review_state_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_review_state_check
  CHECK (review_state IN ('awaiting_review','in_review','approved','rejected','not_applicable'));

-- Backfill existing rows: terminal statuses get review_state set; non-manual payments are n/a.
UPDATE public.payments
   SET review_state = CASE
     WHEN status = 'paid' AND method IS NOT NULL THEN 'approved'
     WHEN status = 'failed' AND method IS NOT NULL THEN 'rejected'
     WHEN method IS NULL THEN 'not_applicable'
     ELSE 'awaiting_review'
   END
 WHERE review_state = 'awaiting_review';

CREATE INDEX IF NOT EXISTS idx_payments_review_state ON public.payments(review_state, created_at DESC);

-- 2. Audit table
CREATE TABLE IF NOT EXISTS public.payment_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id),
  from_state text,
  to_state text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_review_events TO authenticated;
GRANT ALL ON public.payment_review_events TO service_role;

ALTER TABLE public.payment_review_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage payment review events" ON public.payment_review_events;
CREATE POLICY "Admins manage payment review events"
  ON public.payment_review_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Owners view own payment review events" ON public.payment_review_events;
CREATE POLICY "Owners view own payment review events"
  ON public.payment_review_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.id = payment_review_events.payment_id AND p.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_payment_review_events_payment ON public.payment_review_events(payment_id, created_at DESC);

-- 3. Trigger to auto-audit review_state transitions
CREATE OR REPLACE FUNCTION public.tg_payment_review_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.review_state IS DISTINCT FROM OLD.review_state THEN
    INSERT INTO public.payment_review_events(payment_id, actor_id, from_state, to_state, note)
    VALUES (
      NEW.id,
      auth.uid(),
      OLD.review_state,
      NEW.review_state,
      COALESCE(NEW.review_notes, NEW.rejection_reason)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS payments_review_audit ON public.payments;
CREATE TRIGGER payments_review_audit
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_payment_review_audit();

-- ===== END SOURCE MIGRATION: 20260609140507_e60a3304-5bfa-4d23-83ad-d98fdc22eaa6.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609150605_d17e78ae-088c-4f78-b2a9-2c93ddb97b83.sql =====

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_username text UNIQUE,
  ADD COLUMN IF NOT EXISTS parent_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_staff_account boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_parent_org ON public.profiles(parent_org_id) WHERE parent_org_id IS NOT NULL;

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_seats integer;

UPDATE public.subscription_plans SET max_seats = 1 WHERE name = 'Private Seller';
UPDATE public.subscription_plans SET max_seats = 3 WHERE name = 'Verified Seller';
UPDATE public.subscription_plans SET max_seats = 5 WHERE name = 'Dealer Starter';
UPDATE public.subscription_plans SET max_seats = NULL WHERE name IN ('Dealer Pro','Platinum','Enterprise','Business Trial');

CREATE OR REPLACE FUNCTION public.org_seat_count(_org_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.organization_members WHERE organization_id = _org_id
$$;

CREATE OR REPLACE FUNCTION public.org_max_seats(_org_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_max int;
  v_found boolean := false;
BEGIN
  SELECT user_id INTO v_owner FROM public.organization_members
    WHERE organization_id = _org_id AND role = 'owner' LIMIT 1;
  IF v_owner IS NULL THEN RETURN 1; END IF;

  SELECT p.max_seats, true INTO v_max, v_found
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
   WHERE s.user_id = v_owner
     AND s.status = 'active'
     AND (s.current_period_end IS NULL OR s.current_period_end > now())
   ORDER BY COALESCE(p.max_seats, 999999) DESC
   LIMIT 1;

  IF NOT v_found THEN RETURN 1; END IF;
  RETURN v_max;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_login_to_email(_input text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.login_username = lower(btrim(_input))
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.resolve_login_to_email(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_seat_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_max_seats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_auto_create_seller_org()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_name text;
  v_org_id uuid;
BEGIN
  IF NEW.is_staff_account THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(NULLIF(NEW.business_name,''), NULLIF(NEW.full_name,''), 'My Account');
  v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  IF v_slug = '' THEN v_slug := 'seller'; END IF;
  v_slug := substr(v_slug, 1, 50) || '-' || substr(replace(NEW.id::text,'-',''), 1, 6);

  INSERT INTO public.organizations (name, slug, kind, created_by)
  VALUES (v_name, v_slug, 'dealership', NEW.id)
  RETURNING id INTO v_org_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS auto_create_seller_org ON public.profiles;
CREATE TRIGGER auto_create_seller_org
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_auto_create_seller_org();

CREATE OR REPLACE FUNCTION public.tg_set_listing_org_from_staff()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT parent_org_id INTO v_org FROM public.profiles WHERE id = NEW.user_id;
  IF v_org IS NOT NULL THEN
    NEW.organization_id := v_org;
    RETURN NEW;
  END IF;
  SELECT organization_id INTO v_org FROM public.organization_members
    WHERE user_id = NEW.user_id AND role = 'owner' LIMIT 1;
  IF v_org IS NOT NULL THEN
    NEW.organization_id := v_org;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS set_listing_org_from_staff ON public.listings;
CREATE TRIGGER set_listing_org_from_staff
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_listing_org_from_staff();

DROP POLICY IF EXISTS "Org members read listing messages" ON public.messages;
CREATE POLICY "Org members read listing messages"
ON public.messages FOR SELECT
USING (
  listing_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = messages.listing_id
      AND l.organization_id IS NOT NULL
      AND public.is_org_member(auth.uid(), l.organization_id)
  )
);

-- Backfill orgs for existing sellers
DO $$
DECLARE
  r record;
  v_slug text;
  v_name text;
  v_org_id uuid;
BEGIN
  FOR r IN
    SELECT p.id, p.full_name, p.business_name
    FROM public.profiles p
    WHERE NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.user_id = p.id)
      AND COALESCE(p.is_staff_account, false) = false
  LOOP
    v_name := COALESCE(NULLIF(r.business_name,''), NULLIF(r.full_name,''), 'My Account');
    v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
    IF v_slug = '' THEN v_slug := 'seller'; END IF;
    v_slug := substr(v_slug, 1, 50) || '-' || substr(replace(r.id::text,'-',''), 1, 6);

    INSERT INTO public.organizations (name, slug, kind, created_by)
    VALUES (v_name, v_slug, 'dealership', r.id)
    RETURNING id INTO v_org_id;
  END LOOP;
END $$;

UPDATE public.listings l
   SET organization_id = m.organization_id
  FROM public.organization_members m
 WHERE m.user_id = l.user_id
   AND m.role = 'owner'
   AND l.organization_id IS NULL;

-- ===== END SOURCE MIGRATION: 20260609150605_d17e78ae-088c-4f78-b2a9-2c93ddb97b83.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609150719_b8b702f6-20b1-4370-be4d-32ae44284712.sql =====

CREATE OR REPLACE FUNCTION public.tg_auto_create_seller_org()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_name text;
  v_org_id uuid;
  v_meta jsonb;
BEGIN
  IF NEW.is_staff_account THEN RETURN NEW; END IF;

  -- Inspect auth metadata: skip when staff-creation flow is in progress
  SELECT raw_user_meta_data INTO v_meta FROM auth.users WHERE id = NEW.id;
  IF COALESCE((v_meta->>'is_staff_account')::boolean, false) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(NULLIF(NEW.business_name,''), NULLIF(NEW.full_name,''), 'My Account');
  v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  IF v_slug = '' THEN v_slug := 'seller'; END IF;
  v_slug := substr(v_slug, 1, 50) || '-' || substr(replace(NEW.id::text,'-',''), 1, 6);

  INSERT INTO public.organizations (name, slug, kind, created_by)
  VALUES (v_name, v_slug, 'dealership', NEW.id)
  RETURNING id INTO v_org_id;
  RETURN NEW;
END $$;

-- ===== END SOURCE MIGRATION: 20260609150719_b8b702f6-20b1-4370-be4d-32ae44284712.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609153726_dbc4c2ec-5457-414b-9fe5-2cc79073a28f.sql =====
ALTER TABLE public.provider_tow_rates
  ADD COLUMN IF NOT EXISTS dispatch_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispatch_regions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avg_response_sec integer,
  ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2);

ALTER TABLE public.tow_requests
  ADD COLUMN IF NOT EXISTS dispatch_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS dispatch_window_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS requested_provider_id uuid,
  ADD COLUMN IF NOT EXISTS matched_provider_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dispatch_expansions integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tow_requests_dispatch_status ON public.tow_requests(dispatch_status) WHERE dispatch_status IN ('matched','open');
CREATE INDEX IF NOT EXISTS idx_tow_requests_window ON public.tow_requests(dispatch_window_ends_at) WHERE dispatch_status='matched';
CREATE INDEX IF NOT EXISTS idx_tow_requests_matched_gin ON public.tow_requests USING GIN (matched_provider_ids);

CREATE TABLE IF NOT EXISTS public.dispatch_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_slug text NOT NULL,
  status text NOT NULL DEFAULT 'incomplete',
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_end timestamptz,
  environment text NOT NULL DEFAULT 'sandbox',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dispatch_sub_stripe ON public.dispatch_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dispatch_sub_user ON public.dispatch_subscriptions(user_id, environment);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_subscriptions TO authenticated;
GRANT ALL ON public.dispatch_subscriptions TO service_role;
ALTER TABLE public.dispatch_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own dispatch sub"
  ON public.dispatch_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners update own dispatch sub"
  ON public.dispatch_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_dispatch_sub_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_dispatch_sub_updated_at ON public.dispatch_subscriptions;
CREATE TRIGGER trg_dispatch_sub_updated_at
  BEFORE UPDATE ON public.dispatch_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_sub_updated_at();

CREATE OR REPLACE FUNCTION public.dispatch_plan_capacity(_plan text)
RETURNS TABLE(max_jobs integer, max_regions integer, priority integer)
LANGUAGE sql IMMUTABLE AS $$
  SELECT t.max_jobs, t.max_regions, t.priority FROM (VALUES
    ('dispatch_starter', 3, 1, 1),
    ('dispatch_pro', 10, 4, 2),
    ('dispatch_fleet', 999999, 99, 3)
  ) AS t(plan, max_jobs, max_regions, priority)
  WHERE t.plan = _plan
$$;

CREATE OR REPLACE FUNCTION public.get_active_dispatch_plan(_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT plan_slug FROM public.dispatch_subscriptions
  WHERE user_id = _user AND status IN ('active','trialing')
    AND (current_period_end IS NULL OR current_period_end > now())
  ORDER BY created_at DESC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.dispatch_match_providers(_request_id uuid, _take integer DEFAULT 5)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req RECORD; matches uuid[];
BEGIN
  SELECT pickup_region, pickup_province, pickup_city, matched_provider_ids
    INTO req FROM public.tow_requests WHERE id = _request_id;
  IF req IS NULL THEN RETURN '{}'::uuid[]; END IF;

  WITH eligible AS (
    SELECT
      ptr.user_id,
      ap.plan AS plan_slug,
      cap.priority AS tier_priority,
      cap.max_jobs,
      COALESCE(ptr.avg_rating, 0) AS rating,
      COALESCE(ptr.avg_response_sec, 999999) AS resp,
      b.city, b.province, b.region,
      (SELECT count(*) FROM public.tow_requests tr
         WHERE tr.provider_id = ptr.user_id
           AND tr.status IN ('assigned','in_progress','picked_up')) AS active_jobs
    FROM public.provider_tow_rates ptr
    JOIN LATERAL (SELECT public.get_active_dispatch_plan(ptr.user_id) AS plan) ap ON ap.plan IS NOT NULL
    LEFT JOIN LATERAL public.dispatch_plan_capacity(ap.plan) cap ON true
    LEFT JOIN public.businesses b ON b.owner_id = ptr.user_id AND b.type_slug='towing' AND b.status='active'
    WHERE ptr.dispatch_enabled = true
      AND (ap.plan = 'dispatch_fleet'
        OR req.pickup_region = ANY(ptr.dispatch_regions)
        OR (b.region IS NOT NULL AND b.region = req.pickup_region))
  )
  SELECT COALESCE(array_agg(user_id ORDER BY
    tier_priority DESC NULLS LAST,
    CASE WHEN city = req.pickup_city THEN 0
         WHEN province = req.pickup_province THEN 1
         WHEN region = req.pickup_region THEN 2 ELSE 3 END,
    rating DESC, resp ASC
  ), '{}'::uuid[]) INTO matches
  FROM eligible
  WHERE active_jobs < COALESCE(max_jobs, 999999)
    AND NOT (user_id = ANY(req.matched_provider_ids));

  RETURN matches[1:_take];
END $$;

CREATE OR REPLACE FUNCTION public.tg_dispatch_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.requested_provider_id IS NOT NULL THEN
    NEW.dispatch_status := 'direct';
    NEW.matched_provider_ids := ARRAY[NEW.requested_provider_id];
    NEW.dispatch_window_ends_at := now() + INTERVAL '15 minutes';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.tg_dispatch_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE picks uuid[];
BEGIN
  IF NEW.dispatch_status = 'direct' THEN RETURN NEW; END IF;
  picks := public.dispatch_match_providers(NEW.id, 5);
  UPDATE public.tow_requests
    SET matched_provider_ids = picks,
        dispatch_status = CASE WHEN array_length(picks,1) > 0 THEN 'matched' ELSE 'open' END,
        dispatch_window_ends_at = CASE WHEN array_length(picks,1) > 0 THEN now() + INTERVAL '5 minutes' ELSE NULL END
  WHERE id = NEW.id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_before_insert ON public.tow_requests;
CREATE TRIGGER trg_dispatch_before_insert BEFORE INSERT ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_before_insert();
DROP TRIGGER IF EXISTS trg_dispatch_after_insert ON public.tow_requests;
CREATE TRIGGER trg_dispatch_after_insert AFTER INSERT ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_after_insert();

CREATE OR REPLACE FUNCTION public.dispatch_expand_stale()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; picks uuid[]; n integer := 0;
BEGIN
  FOR r IN
    SELECT id, dispatch_expansions FROM public.tow_requests
    WHERE dispatch_status = 'matched' AND dispatch_window_ends_at < now() AND status = 'open'
  LOOP
    IF r.dispatch_expansions >= 3 THEN
      UPDATE public.tow_requests SET dispatch_status = 'expired', dispatch_window_ends_at = NULL WHERE id = r.id;
    ELSE
      picks := public.dispatch_match_providers(r.id, 5);
      UPDATE public.tow_requests
        SET matched_provider_ids = matched_provider_ids || picks,
            dispatch_status = CASE WHEN array_length(picks,1) > 0 THEN 'matched' ELSE 'open' END,
            dispatch_window_ends_at = CASE WHEN array_length(picks,1) > 0 THEN now() + INTERVAL '5 minutes' ELSE NULL END,
            dispatch_expansions = r.dispatch_expansions + 1
        WHERE id = r.id;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

DROP POLICY IF EXISTS "Requesters view own tow requests" ON public.tow_requests;
CREATE POLICY "Tow request visible to participants and matched providers"
  ON public.tow_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = requester_id OR auth.uid() = provider_id
    OR auth.uid() = ANY(matched_provider_ids)
    OR ((provider_id IS NULL) AND (status = 'open') AND is_towing_provider(auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Tow request participants update" ON public.tow_requests;
CREATE POLICY "Tow request participants update"
  ON public.tow_requests FOR UPDATE TO authenticated
  USING (
    auth.uid() = requester_id OR auth.uid() = provider_id
    OR auth.uid() = ANY(matched_provider_ids)
    OR ((provider_id IS NULL) AND (status = 'open') AND is_towing_provider(auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

ALTER TABLE public.tow_requests REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tow_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.subscription_plans (name, price_php, sort_order, active, stripe_lookup_key, features, max_photos_per_listing)
SELECT v.name, v.price_php, v.sort_order, v.active, v.stripe_lookup_key, v.features::jsonb, v.max_photos_per_listing
FROM (VALUES
  ('Dispatch Starter', 499.00::numeric, 10, true, 'dispatch_starter_monthly', '["Home region only","Up to 3 active jobs","Standard placement in dispatch queue"]', 0),
  ('Dispatch Pro', 1499.00::numeric, 11, true, 'dispatch_pro_monthly', '["Up to 4 regions","Up to 10 active jobs","High priority in dispatch queue"]', 0),
  ('Dispatch Fleet', 2999.00::numeric, 12, true, 'dispatch_fleet_monthly', '["Nationwide coverage","Unlimited active jobs","Top priority in dispatch queue","Featured badge"]', 0)
) AS v(name, price_php, sort_order, active, stripe_lookup_key, features, max_photos_per_listing)
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans p WHERE p.stripe_lookup_key = v.stripe_lookup_key);
-- ===== END SOURCE MIGRATION: 20260609153726_dbc4c2ec-5457-414b-9fe5-2cc79073a28f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609155038_7a3dc09f-8065-415a-9d37-1e30ab858087.sql =====

CREATE TABLE IF NOT EXISTS public.dispatch_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.tow_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  event text NOT NULL CHECK (event IN ('matched','accepted','declined','lost','timed_out','completed','cancelled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.dispatch_job_events TO authenticated;
GRANT ALL ON public.dispatch_job_events TO service_role;

ALTER TABLE public.dispatch_job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own dispatch events"
  ON public.dispatch_job_events FOR SELECT TO authenticated
  USING (auth.uid() = provider_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Providers insert own dispatch events"
  ON public.dispatch_job_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = provider_id);

CREATE INDEX IF NOT EXISTS idx_dispatch_events_provider ON public.dispatch_job_events(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_request ON public.dispatch_job_events(request_id);

-- Trigger: log 'matched' events when matched_provider_ids is populated on insert
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_matched()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  IF NEW.matched_provider_ids IS NOT NULL AND array_length(NEW.matched_provider_ids, 1) > 0 THEN
    FOREACH pid IN ARRAY NEW.matched_provider_ids LOOP
      INSERT INTO public.dispatch_job_events(request_id, provider_id, event, metadata)
      VALUES (NEW.id, pid, 'matched', jsonb_build_object('dispatch_status', NEW.dispatch_status));
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_matched ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_matched
  AFTER INSERT ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_matched();

-- Trigger: log 'matched' on UPDATE when new providers are added during expansion
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_expanded()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid; added uuid[];
BEGIN
  IF NEW.matched_provider_ids IS DISTINCT FROM OLD.matched_provider_ids THEN
    SELECT COALESCE(array_agg(p), '{}'::uuid[]) INTO added
      FROM unnest(NEW.matched_provider_ids) p
      WHERE NOT (p = ANY(OLD.matched_provider_ids));
    IF added IS NOT NULL AND array_length(added, 1) > 0 THEN
      FOREACH pid IN ARRAY added LOOP
        INSERT INTO public.dispatch_job_events(request_id, provider_id, event, metadata)
        VALUES (NEW.id, pid, 'matched', jsonb_build_object('dispatch_status', NEW.dispatch_status, 'expansion', true));
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_expanded ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_expanded
  AFTER UPDATE OF matched_provider_ids ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_expanded();

-- Trigger: log 'accepted' for winner, 'lost' for others when provider_id transitions to non-null
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  IF (OLD.provider_id IS NULL) AND (NEW.provider_id IS NOT NULL) THEN
    INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
    VALUES (NEW.id, NEW.provider_id, 'accepted');
    IF NEW.matched_provider_ids IS NOT NULL THEN
      FOREACH pid IN ARRAY NEW.matched_provider_ids LOOP
        IF pid <> NEW.provider_id THEN
          INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
          VALUES (NEW.id, pid, 'lost');
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_accepted ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_accepted
  AFTER UPDATE OF provider_id ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_accepted();

-- Trigger: log 'timed_out' for matched providers when dispatch_status becomes 'expired'
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_expired()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  IF NEW.dispatch_status = 'expired' AND OLD.dispatch_status <> 'expired'
     AND NEW.provider_id IS NULL THEN
    IF NEW.matched_provider_ids IS NOT NULL THEN
      FOREACH pid IN ARRAY NEW.matched_provider_ids LOOP
        INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
        VALUES (NEW.id, pid, 'timed_out');
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_expired ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_expired
  AFTER UPDATE OF dispatch_status ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_expired();

-- Trigger: log 'completed' / 'cancelled' for provider on status change
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.provider_id IS NOT NULL THEN
    IF NEW.status = 'completed' THEN
      INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
      VALUES (NEW.id, NEW.provider_id, 'completed');
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
      VALUES (NEW.id, NEW.provider_id, 'cancelled');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_status ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_status
  AFTER UPDATE OF status ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_status();

-- ===== END SOURCE MIGRATION: 20260609155038_7a3dc09f-8065-415a-9d37-1e30ab858087.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260609155458_38740412-00c0-47df-9075-a23e9ecde385.sql =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_job_events;
-- ===== END SOURCE MIGRATION: 20260609155458_38740412-00c0-47df-9075-a23e9ecde385.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260610025635_61ed156c-2485-4a25-9f5d-26b6e0a63929.sql =====
GRANT SELECT ON public.wanted_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wanted_posts TO authenticated;
GRANT ALL ON public.wanted_posts TO service_role;

GRANT SELECT ON public.wanted_post_responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wanted_post_responses TO authenticated;
GRANT ALL ON public.wanted_post_responses TO service_role;
-- ===== END SOURCE MIGRATION: 20260610025635_61ed156c-2485-4a25-9f5d-26b6e0a63929.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260610033604_355e741d-6864-485f-aa03-ffb99aa086cf.sql =====
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_user_id),
  CHECK (blocker_id <> blocked_user_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own blocks" ON public.user_blocks
  FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users create their own blocks" ON public.user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users delete their own blocks" ON public.user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);
CREATE INDEX user_blocks_blocker_idx ON public.user_blocks (blocker_id);
CREATE INDEX user_blocks_blocked_idx ON public.user_blocks (blocked_user_id);
-- ===== END SOURCE MIGRATION: 20260610033604_355e741d-6864-485f-aa03-ffb99aa086cf.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260610042109_248f8495-a4de-4610-82c5-f991a2250e13.sql =====

-- Add Truck & Equipment department + top-level category (only missing item)
INSERT INTO public.shop_departments (slug, name, sort_order, active)
VALUES ('truck-equipment', 'Truck & Equipment', 90, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.shop_categories (slug, name, description, sort_order, active, department_slug)
VALUES (
  'truck-equipment',
  'Truck & Equipment',
  'Work lights, tow straps, ratchet straps, grease guns and heavy-duty gear for trucks and equipment.',
  90,
  true,
  'truck-equipment'
)
ON CONFLICT (slug) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260610042109_248f8495-a4de-4610-82c5-f991a2250e13.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260610043918_06033592-e2d2-4d8d-91e1-3b4c53f30bef.sql =====

CREATE TABLE public.shop_category_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.shop_categories(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT shop_category_keywords_unique UNIQUE (category_id, keyword),
  CONSTRAINT shop_category_keywords_lowercase CHECK (keyword = lower(keyword)),
  CONSTRAINT shop_category_keywords_nonempty CHECK (length(btrim(keyword)) > 0)
);

CREATE INDEX idx_shop_category_keywords_category ON public.shop_category_keywords(category_id);

GRANT SELECT ON public.shop_category_keywords TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_category_keywords TO authenticated;
GRANT ALL ON public.shop_category_keywords TO service_role;

ALTER TABLE public.shop_category_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kw public read"
  ON public.shop_category_keywords FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.shop_categories c
    WHERE c.id = shop_category_keywords.category_id AND c.active = true
  ));

CREATE POLICY "kw managers write"
  ON public.shop_category_keywords FOR ALL
  TO authenticated
  USING (public.can_manage_shop(auth.uid()))
  WITH CHECK (public.can_manage_shop(auth.uid()));

-- Seed from the prior hardcoded CATEGORY_KEYWORDS map.
WITH seed(slug, kw) AS (
  VALUES
    ('diagnostics','obd2'),('diagnostics','obd-ii'),('diagnostics','obdii'),('diagnostics','obd ii'),
    ('diagnostics','scan tool'),('diagnostics','scanner'),('diagnostics','ancel'),('diagnostics','autel'),
    ('diagnostics','launch x431'),('diagnostics','elm327'),('diagnostics','code reader'),('diagnostics','diagnostic tool'),
    ('car-washing','foam cannon'),('car-washing','snow foam'),('car-washing','pressure washer'),
    ('car-washing','car shampoo'),('car-washing','car wash'),('car-washing','wash mitt'),
    ('waxes-coatings','car wax'),('waxes-coatings','ceramic coat'),('waxes-coatings','ceramic coating'),
    ('waxes-coatings','paint sealant'),('waxes-coatings','sealant'),('waxes-coatings','graphene coat'),
    ('polishing-compounds','polishing compound'),('polishing-compounds','cutting compound'),
    ('polishing-compounds','buffing pad'),('polishing-compounds','polisher'),
    ('microfiber','microfiber'),('microfiber','micro fibre'),('microfiber','drying towel'),('microfiber','applicator pad'),
    ('wheel-tire-care','tire shine'),('wheel-tire-care','tire dressing'),('wheel-tire-care','wheel cleaner'),('wheel-tire-care','rim cleaner'),
    ('interior-care','interior cleaner'),('interior-care','leather conditioner'),('interior-care','dashboard polish'),
    ('interior-care','fabric cleaner'),('interior-care','carpet cleaner'),
    ('jump-starters','jump starter'),('jump-starters','jumpstarter'),('jump-starters','jump pack'),('jump-starters','booster pack'),
    ('tow-straps','tow strap'),('tow-straps','recovery strap'),('tow-straps','tow rope'),('tow-straps','kinetic rope'),('tow-straps','snatch strap'),
    ('first-aid','first aid'),('first-aid','first-aid'),
    ('fire-extinguishers','fire extinguisher'),
    ('safety','warning triangle'),('safety','reflective triangle'),('safety','tire inflator'),
    ('safety','portable air compressor'),('safety','emergency kit'),('safety','road kit'),('safety','safety vest'),
    ('helmets','helmet'),('helmets','full face'),('helmets','half face'),('helmets','modular helmet'),
    ('riding-gear','riding jacket'),('riding-gear','riding pants'),('riding-gear','rain gear'),
    ('riding-gear','rain suit'),('riding-gear','motorcycle gloves'),('riding-gear','riding gloves'),('riding-gear','moto boots'),
    ('moto-luggage','tank bag'),('moto-luggage','saddle bag'),('moto-luggage','tail bag'),('moto-luggage','panniers'),
    ('chain-care','chain lube'),('chain-care','chain cleaner'),('chain-care','chain wax'),
    ('seat-covers','seat cover'),('seat-covers','seat cushion'),
    ('floor-mats','floor mat'),('floor-mats','car mat'),('floor-mats','all-weather mat'),
    ('phone-mounts','phone mount'),('phone-mounts','phone holder'),('phone-mounts','car phone holder'),('phone-mounts','magsafe car'),
    ('organizers','car organizer'),('organizers','trunk organizer'),('organizers','console organizer'),
    ('accessories','sun shade'),('accessories','sunshade'),('accessories','windshield shade'),
    ('accessories','steering wheel cover'),('accessories','armrest'),
    ('dashcams','dash cam'),('dashcams','dashcam'),('dashcams','dvr car camera'),
    ('cameras-sensors','reverse camera'),('cameras-sensors','backup camera'),('cameras-sensors','parking sensor'),('cameras-sensors','blind spot'),
    ('head-units','head unit'),('head-units','car stereo'),('head-units','android auto'),
    ('head-units','carplay head'),('head-units','double din'),('head-units','1din'),
    ('speakers','car speaker'),('speakers','subwoofer'),('speakers','tweeter'),('speakers','amplifier car audio'),
    ('lighting','led headlight'),('lighting','hid kit'),('lighting','fog light'),
    ('lighting','h4 led'),('lighting','h7 led'),('lighting','h11 led'),
    ('hand-tools','socket set'),('hand-tools','wrench set'),('hand-tools','spanner'),('hand-tools','ratchet set'),
    ('hand-tools','screwdriver set'),('hand-tools','plier'),('hand-tools','torque wrench'),('hand-tools','multimeter'),
    ('power-tools','impact wrench'),('power-tools','cordless drill'),('power-tools','angle grinder'),
    ('power-tools','rotary tool'),('power-tools','power drill'),
    ('jacks-stands','floor jack'),('jacks-stands','jack stand'),('jacks-stands','trolley jack'),
    ('jacks-stands','scissor jack'),('jacks-stands','hydraulic jack'),
    ('workshop-equipment','engine hoist'),('workshop-equipment','creeper'),
    ('workshop-equipment','tire changer'),('workshop-equipment','wheel balancer'),
    ('battery-care','battery charger'),('battery-care','trickle charger'),('battery-care','smart charger'),
    ('battery-care','battery maintainer'),('battery-care','battery tender'),
    ('garage-organizers','garage organizer'),('garage-organizers','tool chest'),
    ('garage-organizers','tool cabinet'),('garage-organizers','tool cart'),
    ('shelving','shelving'),('shelving','garage shelf'),('shelving','storage rack'),
    ('car-covers','car cover'),('car-covers','all weather cover'),
    ('truck-equipment','work light'),('truck-equipment','led work light'),('truck-equipment','ratchet strap'),
    ('truck-equipment','tie down'),('truck-equipment','cargo strap'),('truck-equipment','grease gun'),
    ('truck-equipment','truck bed'),('truck-equipment','winch'),
    ('off-road-lights','light bar'),('off-road-lights','off road light'),('off-road-lights','off-road light'),('off-road-lights','4x4 light'),
    ('recovery-boards','recovery board'),('recovery-boards','traction board'),('recovery-boards','sand board'),
    ('roof-racks','roof rack'),('roof-racks','roof basket'),('roof-racks','cross bar'),
    ('snorkels','snorkel kit'),('snorkels','raised intake'),
    ('engine-oil','engine oil'),('engine-oil','motor oil'),('engine-oil','5w-30'),('engine-oil','5w-40'),
    ('engine-oil','0w-20'),('engine-oil','10w-40'),('engine-oil','synthetic oil'),
    ('atf','atf'),('atf','transmission fluid'),('atf','gear oil'),
    ('brake-fluid','brake fluid'),('brake-fluid','dot 3'),('brake-fluid','dot 4'),('brake-fluid','dot 5'),
    ('coolant','coolant'),('coolant','antifreeze'),('coolant','radiator fluid'),
    ('grease','grease cartridge'),('grease','lithium grease'),('grease','wd-40'),('grease','wd40'),('grease','penetrating oil'),
    ('brakes','brake pad'),('brakes','brake disc'),('brakes','brake rotor'),('brakes','brake shoe'),
    ('filters','oil filter'),('filters','air filter'),('filters','cabin filter'),('filters','fuel filter'),
    ('ignition','spark plug'),('ignition','ignition coil'),('ignition','iridium plug'),
    ('belts-hoses','timing belt'),('belts-hoses','serpentine belt'),('belts-hoses','radiator hose'),
    ('cooling','radiator'),('cooling','water pump'),('cooling','thermostat'),
    ('exhaust','exhaust pipe'),('exhaust','muffler'),('exhaust','catalytic converter'),
    ('suspension','shock absorber'),('suspension','strut'),('suspension','control arm'),('suspension','tie rod'),
    ('tires','tyre'),('tires','all terrain tire'),('tires','215/'),('tires','225/'),('tires','235/'),('tires','265/'),
    ('wheels','alloy wheel'),('wheels','mag wheels'),
    ('tpms','tpms'),('tpms','valve stem'),('tpms','tire pressure sensor'),
    ('ev-chargers','ev charger'),('ev-chargers','ev charging'),('ev-chargers','type 2 charger'),('ev-chargers','wallbox'),
    ('ev-adapters','ev adapter'),('ev-adapters','type 2 adapter'),('ev-adapters','chademo')
)
INSERT INTO public.shop_category_keywords (category_id, keyword)
SELECT c.id, s.kw
FROM seed s
JOIN public.shop_categories c ON c.slug = s.slug
ON CONFLICT (category_id, keyword) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260610043918_06033592-e2d2-4d8d-91e1-3b4c53f30bef.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260610051655_16f22016-67d6-4de8-9883-f1b157c2c4ed.sql =====

-- Enums
DO $$ BEGIN
  CREATE TYPE public.listing_price_kind AS ENUM ('asking','monthly','down_payment','starting_bid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.listing_registration_status AS ENUM ('registered','unregistered','for_transfer','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Columns
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS price_kind public.listing_price_kind NOT NULL DEFAULT 'asking',
  ADD COLUMN IF NOT EXISTS negotiable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_status public.listing_registration_status NOT NULL DEFAULT 'unknown';

-- Validation trigger: reject obvious placeholder prices on vehicle categories.
CREATE OR REPLACE FUNCTION public.listings_price_floor_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_floor numeric;
BEGIN
  -- Skip drafts; sellers may save partial work.
  IF NEW.status = 'draft' THEN RETURN NEW; END IF;

  IF NEW.price_kind IN ('monthly','down_payment') THEN
    v_floor := 1000;
  ELSIF NEW.category_slug = 'car' THEN
    v_floor := 20000;
  ELSIF NEW.category_slug = 'motorcycle' THEN
    v_floor := 5000;
  ELSIF NEW.category_slug IN ('truck','equipment','boat','airplane') THEN
    v_floor := 20000;
  ELSE
    v_floor := 0;
  END IF;

  IF v_floor > 0 AND NEW.price_php < v_floor THEN
    RAISE EXCEPTION 'Listing price ₱% is below the minimum ₱% for this category. Enter the real asking price (mark Negotiable or Monthly instead of using a placeholder).',
      NEW.price_php, v_floor
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_price_floor ON public.listings;
CREATE TRIGGER trg_listings_price_floor
  BEFORE INSERT OR UPDATE OF price_php, price_kind, category_slug, status
  ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_price_floor_check();

-- ===== END SOURCE MIGRATION: 20260610051655_16f22016-67d6-4de8-9883-f1b157c2c4ed.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260610052546_143605f8-b90f-4f6c-b6e7-90bc025c8abe.sql =====

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS monthly_php numeric(14,2),
  ADD COLUMN IF NOT EXISTS down_payment_php numeric(14,2);

CREATE OR REPLACE FUNCTION public.listings_price_floor_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_floor numeric;
BEGIN
  IF NEW.status = 'draft' THEN RETURN NEW; END IF;

  -- Per-category floor on the cash asking price (when > 0).
  IF NEW.price_php IS NOT NULL AND NEW.price_php > 0 THEN
    IF NEW.category_slug = 'motorcycle' THEN
      v_floor := 5000;
    ELSIF NEW.category_slug IN ('car','truck','equipment','boat','airplane') THEN
      v_floor := 20000;
    ELSE
      v_floor := 0;
    END IF;
    IF v_floor > 0 AND NEW.price_php < v_floor THEN
      RAISE EXCEPTION 'Asking price ₱% is below the minimum ₱% for this category.', NEW.price_php, v_floor
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.monthly_php IS NOT NULL AND NEW.monthly_php > 0 AND NEW.monthly_php < 1000 THEN
    RAISE EXCEPTION 'Monthly payment ₱% is below the minimum ₱1,000.', NEW.monthly_php
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.down_payment_php IS NOT NULL AND NEW.down_payment_php > 0 AND NEW.down_payment_php < 5000 THEN
    RAISE EXCEPTION 'Down payment ₱% is below the minimum ₱5,000.', NEW.down_payment_php
      USING ERRCODE = 'check_violation';
  END IF;

  -- Require at least one real price on published listings unless price is hidden.
  IF COALESCE(NEW.price_hidden, false) IS NOT TRUE THEN
    IF COALESCE(NEW.price_php, 0) <= 0
       AND COALESCE(NEW.monthly_php, 0) <= 0
       AND COALESCE(NEW.down_payment_php, 0) <= 0 THEN
      RAISE EXCEPTION 'Set an asking price, monthly payment, or down payment — or check "Hide price".'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_price_floor ON public.listings;
CREATE TRIGGER trg_listings_price_floor
  BEFORE INSERT OR UPDATE OF price_php, monthly_php, down_payment_php, price_hidden, category_slug, status
  ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_price_floor_check();

-- ===== END SOURCE MIGRATION: 20260610052546_143605f8-b90f-4f6c-b6e7-90bc025c8abe.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260610074241_d2134766-c2a8-42c2-86fc-1db369f9212f.sql =====

ALTER TABLE public.tow_requests
  ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'emergency',
  ADD COLUMN IF NOT EXISTS situation text,
  ADD COLUMN IF NOT EXISTS vehicle_year integer,
  ADD COLUMN IF NOT EXISTS vehicle_make text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_trim text,
  ADD COLUMN IF NOT EXISTS vehicle_drivetrain text,
  ADD COLUMN IF NOT EXISTS vehicle_transmission text,
  ADD COLUMN IF NOT EXISTS vehicle_photo_url text,
  ADD COLUMN IF NOT EXISTS ride_id uuid REFERENCES public.rides(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS damage_photo_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS can_roll boolean,
  ADD COLUMN IF NOT EXISTS can_steer boolean,
  ADD COLUMN IF NOT EXISTS can_brake boolean,
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng double precision,
  ADD COLUMN IF NOT EXISTS dropoff_lat double precision,
  ADD COLUMN IF NOT EXISTS dropoff_lng double precision;

ALTER TABLE public.tow_requests
  DROP CONSTRAINT IF EXISTS tow_requests_urgency_check;
ALTER TABLE public.tow_requests
  ADD CONSTRAINT tow_requests_urgency_check
  CHECK (urgency IN ('emergency','time_sensitive','scheduled'));

ALTER TABLE public.tow_requests
  DROP CONSTRAINT IF EXISTS tow_requests_situation_check;
ALTER TABLE public.tow_requests
  ADD CONSTRAINT tow_requests_situation_check
  CHECK (situation IS NULL OR situation IN ('breakdown','accident','flat_tire','no_start','no_fuel','winch','other'));

ALTER TABLE public.tow_requests
  DROP CONSTRAINT IF EXISTS tow_requests_drivetrain_check;
ALTER TABLE public.tow_requests
  ADD CONSTRAINT tow_requests_drivetrain_check
  CHECK (vehicle_drivetrain IS NULL OR vehicle_drivetrain IN ('FWD','RWD','AWD','4x4','unknown'));

-- ===== END SOURCE MIGRATION: 20260610074241_d2134766-c2a8-42c2-86fc-1db369f9212f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260610074339_363b9ce5-f62d-4293-a3ac-6892c69318d2.sql =====

-- Owners manage their own folder under tow-request-photos
CREATE POLICY "Tow photos: owners can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tow-request-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Tow photos: owners can update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'tow-request-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Tow photos: owners can delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tow-request-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Read access: owner, matched providers, assigned provider, admins.
-- Photo URL is stored on tow_requests row; participants of that row can read.
CREATE POLICY "Tow photos: participants can read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tow-request-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.tow_requests tr
      WHERE (
        tr.vehicle_photo_url LIKE '%/' || name
        OR name = ANY (
          SELECT regexp_replace(u, '^.*/tow-request-photos/', '')
          FROM unnest(tr.damage_photo_urls) u
        )
      )
      AND (
        auth.uid() = tr.requester_id
        OR auth.uid() = tr.provider_id
        OR auth.uid() = ANY (tr.matched_provider_ids)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  )
);

-- ===== END SOURCE MIGRATION: 20260610074339_363b9ce5-f62d-4293-a3ac-6892c69318d2.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260610081456_94cf4157-4dc9-46ec-afc0-04830a22541c.sql =====
ALTER TABLE public.tow_requests DROP CONSTRAINT IF EXISTS tow_requests_situation_check;
ALTER TABLE public.tow_requests ADD CONSTRAINT tow_requests_situation_check CHECK (situation IS NULL OR (situation = ANY (ARRAY['breakdown'::text, 'accident'::text, 'flat_tire'::text, 'no_start'::text, 'no_fuel'::text, 'winch'::text, 'jump_start'::text, 'dead_battery'::text, 'lockout'::text, 'other'::text])));
ALTER TABLE public.tow_requests ADD COLUMN IF NOT EXISTS passenger_count integer;
ALTER TABLE public.tow_requests DROP CONSTRAINT IF EXISTS tow_requests_passenger_count_check;
ALTER TABLE public.tow_requests ADD CONSTRAINT tow_requests_passenger_count_check CHECK (passenger_count IS NULL OR (passenger_count >= 0 AND passenger_count <= 50));
-- ===== END SOURCE MIGRATION: 20260610081456_94cf4157-4dc9-46ec-afc0-04830a22541c.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260611044319_aa6847c4-a282-4892-a40f-6cdf10b8546e.sql =====

-- Add explicit admin-only SELECT policies to make intent clear and auditable
-- These tables already have RLS enabled with no SELECT policies; service_role bypasses RLS.
-- Adding explicit admin policies prevents accidental exposure if broader policies are added later.

CREATE POLICY "Admins read cron tokens"
ON public.internal_cron_tokens
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read webhook keys"
ON public.internal_webhook_keys
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== END SOURCE MIGRATION: 20260611044319_aa6847c4-a282-4892-a40f-6cdf10b8546e.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260611045505_da9fc4b4-aed0-4c3d-8f75-8b7287b67446.sql =====
CREATE INDEX IF NOT EXISTS idx_listings_browse
  ON public.listings (category_slug, status, boost_until DESC NULLS LAST, published_at DESC NULLS LAST);
-- ===== END SOURCE MIGRATION: 20260611045505_da9fc4b4-aed0-4c3d-8f75-8b7287b67446.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260611160209_a5575f50-1cb9-450f-baa9-f18e961b7c98.sql =====

-- parts_catalog: in-house SKUs we can sell
CREATE TABLE public.parts_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  base_price_php numeric(12,2),
  photo_url text,
  compatible_makes text[] NOT NULL DEFAULT '{}',
  compatible_models text[] NOT NULL DEFAULT '{}',
  year_min integer,
  year_max integer,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.parts_catalog TO anon, authenticated;
GRANT ALL ON public.parts_catalog TO service_role;
ALTER TABLE public.parts_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parts_catalog public read active" ON public.parts_catalog
  FOR SELECT USING (active = true);
CREATE POLICY "parts_catalog admin all" ON public.parts_catalog
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- vehicle_tire_specs: factory tire-size lookup
CREATE TABLE public.vehicle_tire_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  year_min integer,
  year_max integer,
  front_size text,
  rear_size text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_tire_specs_make_model_idx ON public.vehicle_tire_specs (lower(make), lower(model));
GRANT SELECT ON public.vehicle_tire_specs TO anon, authenticated;
GRANT ALL ON public.vehicle_tire_specs TO service_role;
ALTER TABLE public.vehicle_tire_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_tire_specs public read" ON public.vehicle_tire_specs
  FOR SELECT USING (true);
CREATE POLICY "vehicle_tire_specs admin all" ON public.vehicle_tire_specs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- part_quote_requests: buyer quote requests
CREATE TABLE public.part_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  ride_id uuid REFERENCES public.rides(id) ON DELETE SET NULL,
  requester_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  contact_phone text,
  contact_email text,
  delivery_method text NOT NULL DEFAULT 'pickup',
  notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new',
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX part_quote_requests_status_idx ON public.part_quote_requests (status, created_at DESC);
CREATE INDEX part_quote_requests_requester_idx ON public.part_quote_requests (requester_user_id);
GRANT SELECT, INSERT, UPDATE ON public.part_quote_requests TO authenticated;
GRANT INSERT ON public.part_quote_requests TO anon;
GRANT ALL ON public.part_quote_requests TO service_role;
ALTER TABLE public.part_quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "part_quote_requests anyone insert" ON public.part_quote_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "part_quote_requests requester read own" ON public.part_quote_requests
  FOR SELECT TO authenticated
  USING (requester_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "part_quote_requests admin update" ON public.part_quote_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers (reuse existing helper if present)
CREATE OR REPLACE FUNCTION public.parts_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER parts_catalog_updated_at BEFORE UPDATE ON public.parts_catalog
  FOR EACH ROW EXECUTE FUNCTION public.parts_set_updated_at();
CREATE TRIGGER vehicle_tire_specs_updated_at BEFORE UPDATE ON public.vehicle_tire_specs
  FOR EACH ROW EXECUTE FUNCTION public.parts_set_updated_at();
CREATE TRIGGER part_quote_requests_updated_at BEFORE UPDATE ON public.part_quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.parts_set_updated_at();

-- Seed a small starter catalog and a few tire specs
INSERT INTO public.parts_catalog (slug, title, description, category, base_price_php, compatible_makes, sort_order) VALUES
  ('brake-pads-front-generic', 'Front brake pads (OEM-equiv)', 'Premium ceramic pads. Specify exact fitment when requesting quote.', 'brakes', 2400, '{}', 10),
  ('brake-pads-rear-generic',  'Rear brake pads (OEM-equiv)',  'Premium ceramic pads.', 'brakes', 2200, '{}', 11),
  ('brake-rotor-front-pair',   'Front brake rotor pair',       'Vented rotors. Fitment by model.', 'brakes', 5800, '{}', 12),
  ('brake-rotor-rear-pair',    'Rear brake rotor pair',        'Solid/vented depending on model.', 'brakes', 5200, '{}', 13),
  ('brake-caliper-set',        'Brake caliper rebuild kit',    'Seals, pistons, hardware.', 'brakes', 3500, '{}', 14),
  ('tire-fitment-quote',       'Tires — request fitment quote','We''ll quote a matching set in your factory size or upgrade.', 'tires', NULL, '{}', 20),
  ('battery-maintenance-free', 'Maintenance-free battery',     'Sealed lead-acid. Sized to vehicle.', 'electrical', 4800, '{}', 30),
  ('engine-oil-change-pack',   'Engine oil + filter pack',     '4-5L synthetic + OEM-equiv filter.', 'fluids', 2500, '{}', 40),
  ('timing-belt-kit',          'Timing belt kit',              'Belt, tensioner, idler. Major service.', 'engine', 6900, '{}', 50),
  ('shock-absorber-pair',      'Shock absorber pair',          'OEM-equiv gas shocks. Front or rear.', 'suspension', 6500, '{}', 60);

INSERT INTO public.vehicle_tire_specs (make, model, year_min, year_max, front_size, rear_size, notes) VALUES
  ('Toyota',    'Vios',    2013, 2022, '185/60R15', '185/60R15', 'Base trim factory size'),
  ('Toyota',    'Vios',    2023, 2030, '185/65R15', '185/65R15', 'Latest generation base'),
  ('Toyota',    'Hilux',   2016, 2030, '265/60R18', '265/60R18', 'Conquest/G trim'),
  ('Toyota',    'Fortuner',2016, 2030, '265/60R18', '265/60R18', '2.4 V trim'),
  ('Honda',     'Civic',   2016, 2021, '215/50R17', '215/50R17', 'RS Turbo'),
  ('Honda',     'City',    2014, 2020, '185/55R16', '185/55R16', 'VX trim'),
  ('Mitsubishi','Mirage',  2013, 2022, '175/55R15', '175/55R15', 'GLS'),
  ('Mitsubishi','Montero Sport', 2016, 2030, '265/60R18', '265/60R18', 'GLS/GT'),
  ('Nissan',    'Almera',  2014, 2022, '185/65R15', '185/65R15', NULL),
  ('Ford',      'Ranger',  2016, 2022, '265/60R18', '265/60R18', 'Wildtrak'),
  ('Isuzu',     'D-Max',   2016, 2030, '265/60R18', '265/60R18', 'LS-A');

-- ===== END SOURCE MIGRATION: 20260611160209_a5575f50-1cb9-450f-baa9-f18e961b7c98.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260612013755_cfd60716-fd91-4494-9a6f-987d9a3959dc.sql =====
CREATE TABLE public.listing_fitment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year_min INTEGER,
  year_max INTEGER,
  trim TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.listing_fitment TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_fitment TO authenticated;
GRANT ALL ON public.listing_fitment TO service_role;

ALTER TABLE public.listing_fitment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fitment"
  ON public.listing_fitment FOR SELECT
  USING (true);

CREATE POLICY "Owner can insert fitment"
  ON public.listing_fitment FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

CREATE POLICY "Owner can update fitment"
  ON public.listing_fitment FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

CREATE POLICY "Owner can delete fitment"
  ON public.listing_fitment FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

CREATE INDEX listing_fitment_lookup_idx
  ON public.listing_fitment (lower(make), lower(model), year_min, year_max);

CREATE INDEX listing_fitment_listing_idx
  ON public.listing_fitment (listing_id);
-- ===== END SOURCE MIGRATION: 20260612013755_cfd60716-fd91-4494-9a6f-987d9a3959dc.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260612083700_a84d7d79-b5c4-45b0-a897-5d9cc8211d55.sql =====
GRANT EXECUTE ON FUNCTION public.can_support(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.can_moderate(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.can_manage_org(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.can_manage_ads(uuid) TO anon;
-- ===== END SOURCE MIGRATION: 20260612083700_a84d7d79-b5c4-45b0-a897-5d9cc8211d55.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260612083840_d97f4a0f-e475-415c-b725-117c1d8854fc.sql =====
CREATE OR REPLACE FUNCTION public.seller_account_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND account_status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.seller_account_active(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Active listings public read" ON public.listings;
CREATE POLICY "Active listings public read"
ON public.listings
FOR SELECT
USING (
  (status IN ('active'::listing_status, 'pending_sale'::listing_status)
   AND public.seller_account_active(user_id))
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
-- ===== END SOURCE MIGRATION: 20260612083840_d97f4a0f-e475-415c-b725-117c1d8854fc.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260612095918_23be51e3-0d54-4b89-9256-2ae888bf7934.sql =====

update public.listing_media set url = '/__l5e/assets-v1/02e59b7a-ca35-4bb9-b6d5-9ff15622acd1/180sx.jpg' where url like '%/180sx.jpg';
update public.listing_media set url = '/__l5e/assets-v1/e2654ed6-5a62-482c-b251-6bd1fe3e7619/ae86.jpg'  where url like '%/ae86.jpg';
update public.listing_media set url = '/__l5e/assets-v1/1ea6ebb5-24b0-46e3-ba59-4995eeb16e0c/celica.jpg' where url like '%/celica.jpg';
update public.listing_media set url = '/__l5e/assets-v1/e55089b7-4211-45e9-8b26-467cb2919158/evo.jpg' where url like '%/evo.jpg';
update public.listing_media set url = '/__l5e/assets-v1/06e53b05-6234-4284-ab5a-21036610061a/r32.jpg' where url like '%/r32.jpg';
update public.listing_media set url = '/__l5e/assets-v1/8b1f7da3-1133-4ce5-b5b9-ebc0644c6123/rx7.jpg' where url like '%/rx7.jpg';
update public.listing_media set url = '/__l5e/assets-v1/8f1c856e-45e6-436d-8e64-4feaf4961559/s13.jpg' where url like '%/s13.jpg';
update public.listing_media set url = '/__l5e/assets-v1/39ec0367-0395-489f-aa8c-26e69d93f405/supra.jpg' where url like '%/supra.jpg';
update public.listing_media set url = '/__l5e/assets-v1/d5cbceee-859a-4014-a121-e06c6edc7558/wrx.jpg' where url like '%/wrx.jpg';
update public.listing_media set url = '/__l5e/assets-v1/0c8c4a23-2ed0-48ef-bd77-7c094617fe5e/z32.jpg' where url like '%/z32.jpg';

-- ===== END SOURCE MIGRATION: 20260612095918_23be51e3-0d54-4b89-9256-2ae888bf7934.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260612101500_207a2c27-ab68-4f15-9c77-df3f81333e51.sql =====
GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid, uuid) TO anon, authenticated;
-- ===== END SOURCE MIGRATION: 20260612101500_207a2c27-ab68-4f15-9c77-df3f81333e51.sql =====

