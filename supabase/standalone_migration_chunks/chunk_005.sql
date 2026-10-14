-- 365 standalone migration package | chunk_005.sql | 69 source migrations
-- Byte-for-byte concatenation of supabase/migrations. No SQL modified.

-- ===== BEGIN SOURCE MIGRATION: 20260627112833_1ec2290c-82f7-4ce8-9c26-b00513855013.sql =====

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

-- ===== END SOURCE MIGRATION: 20260627112833_1ec2290c-82f7-4ce8-9c26-b00513855013.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260627114738_c46dc744-e570-41a8-b80d-536ecbe7a5cd.sql =====

-- Add supplier onboarding fields for auto parts stores
ALTER TABLE public.parts_supplier_applications
  ADD COLUMN IF NOT EXISTS legal_business_name TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS province_state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
  ADD COLUMN IF NOT EXISTS warehouse_locations TEXT,
  ADD COLUMN IF NOT EXISTS ships_nationwide BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS catalog_feed_url TEXT,
  ADD COLUMN IF NOT EXISTS catalog_feed_format TEXT,
  ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS agreed_terms BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreed_terms_at TIMESTAMPTZ;

-- ===== END SOURCE MIGRATION: 20260627114738_c46dc744-e570-41a8-b80d-536ecbe7a5cd.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260627114834_89899757-a064-4f38-8146-4d4c41a5c70b.sql =====

-- Public upload (applicants submit docs without account), admin-only read/delete
CREATE POLICY "Anyone can upload supplier docs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'supplier-docs');

CREATE POLICY "Admins can read supplier docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'supplier-docs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete supplier docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'supplier-docs' AND public.has_role(auth.uid(), 'admin'));

-- ===== END SOURCE MIGRATION: 20260627114834_89899757-a064-4f38-8146-4d4c41a5c70b.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260627150439_5c3d6dc8-8f14-45b1-9eb3-dc261579364b.sql =====

-- =========================================================
-- Phase 1: Parts Supplier Outreach / CRM layer
-- =========================================================

-- Extend parts_suppliers with operational columns
ALTER TABLE public.parts_suppliers
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lead_score INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS business_hours TEXT;

CREATE INDEX IF NOT EXISTS parts_suppliers_pipeline_stage_idx
  ON public.parts_suppliers(pipeline_stage);
CREATE INDEX IF NOT EXISTS parts_suppliers_next_action_at_idx
  ON public.parts_suppliers(next_action_at);
CREATE INDEX IF NOT EXISTS parts_suppliers_owner_user_id_idx
  ON public.parts_suppliers(owner_user_id);

-- updated_at helper (reuse if it exists)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------
-- parts_supplier_contacts
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parts_supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.parts_suppliers(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  viber TEXT,
  whatsapp TEXT,
  messenger TEXT,
  preferred_channel TEXT,
  preferred_time TEXT,
  language TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  do_not_contact BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_supplier_contacts TO authenticated;
GRANT ALL ON public.parts_supplier_contacts TO service_role;

ALTER TABLE public.parts_supplier_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and sales can read supplier contacts"
  ON public.parts_supplier_contacts FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE POLICY "Admins and sales can write supplier contacts"
  ON public.parts_supplier_contacts FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE INDEX IF NOT EXISTS psc_supplier_idx ON public.parts_supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS psc_primary_idx ON public.parts_supplier_contacts(supplier_id) WHERE is_primary;

CREATE TRIGGER psc_set_updated_at
  BEFORE UPDATE ON public.parts_supplier_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------------------------------------------------------
-- parts_supplier_outreach
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parts_supplier_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.parts_suppliers(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.parts_supplier_contacts(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.parts_supplier_applications(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'call',
  direction TEXT NOT NULL DEFAULT 'outbound',
  outcome TEXT NOT NULL DEFAULT 'spoke',
  duration_sec INT,
  summary TEXT,
  next_action TEXT,
  next_action_at TIMESTAMPTZ,
  owner_user_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_supplier_outreach TO authenticated;
GRANT ALL ON public.parts_supplier_outreach TO service_role;

ALTER TABLE public.parts_supplier_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and sales can read outreach"
  ON public.parts_supplier_outreach FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE POLICY "Admins and sales can write outreach"
  ON public.parts_supplier_outreach FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE INDEX IF NOT EXISTS pso_supplier_idx ON public.parts_supplier_outreach(supplier_id);
CREATE INDEX IF NOT EXISTS pso_owner_idx ON public.parts_supplier_outreach(owner_user_id);
CREATE INDEX IF NOT EXISTS pso_occurred_idx ON public.parts_supplier_outreach(occurred_at DESC);
CREATE INDEX IF NOT EXISTS pso_next_action_idx ON public.parts_supplier_outreach(next_action_at);

CREATE TRIGGER pso_set_updated_at
  BEFORE UPDATE ON public.parts_supplier_outreach
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- When an outreach row is created, roll the supplier's last_contacted_at /
-- next_action_at forward so the "Today" queue stays accurate.
CREATE OR REPLACE FUNCTION public.tg_outreach_roll_supplier()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.parts_suppliers s
     SET last_contacted_at = GREATEST(COALESCE(s.last_contacted_at, NEW.occurred_at), NEW.occurred_at),
         next_action_at    = COALESCE(NEW.next_action_at, s.next_action_at),
         owner_user_id     = COALESCE(NEW.owner_user_id, s.owner_user_id),
         updated_at        = now()
   WHERE s.id = NEW.supplier_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pso_roll_supplier
  AFTER INSERT ON public.parts_supplier_outreach
  FOR EACH ROW EXECUTE FUNCTION public.tg_outreach_roll_supplier();

-- ---------------------------------------------------------
-- parts_supplier_tasks
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parts_supplier_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.parts_suppliers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ,
  owner_user_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_supplier_tasks TO authenticated;
GRANT ALL ON public.parts_supplier_tasks TO service_role;

ALTER TABLE public.parts_supplier_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and sales can read supplier tasks"
  ON public.parts_supplier_tasks FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE POLICY "Admins and sales can write supplier tasks"
  ON public.parts_supplier_tasks FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sales')
  );

CREATE INDEX IF NOT EXISTS pst_supplier_idx ON public.parts_supplier_tasks(supplier_id);
CREATE INDEX IF NOT EXISTS pst_due_idx ON public.parts_supplier_tasks(due_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS pst_owner_idx ON public.parts_supplier_tasks(owner_user_id);

CREATE TRIGGER pst_set_updated_at
  BEFORE UPDATE ON public.parts_supplier_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== END SOURCE MIGRATION: 20260627150439_5c3d6dc8-8f14-45b1-9eb3-dc261579364b.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260627155108_133816c5-a182-43a6-9159-d8d6d6da0491.sql =====

-- Phase A: region filtering on affiliate_links
ALTER TABLE public.affiliate_links
  ADD COLUMN IF NOT EXISTS allowed_countries text[];

UPDATE public.affiliate_links SET allowed_countries = ARRAY['PH'] WHERE supplier_slug IN ('shopee-ph','lazada-ph');
UPDATE public.affiliate_links SET allowed_countries = ARRAY['PH','SG','MY','TH','ID','VN'] WHERE supplier_slug = 'aliexpress-ph';
UPDATE public.affiliate_links SET allowed_countries = ARRAY['US','CA','AU','GB'] WHERE supplier_slug = 'ebay-motors';
UPDATE public.affiliate_links SET allowed_countries = ARRAY['US','CA','GB'] WHERE supplier_slug = 'amazon';
UPDATE public.affiliate_links SET allowed_countries = ARRAY['US','CA'] WHERE supplier_slug = 'rockauto';
-- Amayama, PartSouq, Megazip stay NULL = available everywhere

-- Phase B: partner_product_feeds
CREATE TABLE IF NOT EXISTS public.partner_product_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL,
  merchant_slug text NOT NULL,
  merchant_label text NOT NULL,
  country text NOT NULL DEFAULT 'PH',
  is_enabled boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_status text,
  last_error text,
  item_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network, merchant_slug)
);

GRANT SELECT ON public.partner_product_feeds TO authenticated;
GRANT ALL ON public.partner_product_feeds TO service_role;

ALTER TABLE public.partner_product_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage feeds" ON public.partner_product_feeds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Phase B: partner_products
CREATE TABLE IF NOT EXISTS public.partner_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL,
  merchant_slug text NOT NULL,
  sku text NOT NULL,
  title text NOT NULL,
  brand text,
  category_path text,
  price numeric(12,2),
  currency text DEFAULT 'PHP',
  image_url text,
  deeplink text NOT NULL,
  country text NOT NULL DEFAULT 'PH',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network, sku)
);

GRANT SELECT ON public.partner_products TO anon, authenticated;
GRANT ALL ON public.partner_products TO service_role;

ALTER TABLE public.partner_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read partner products" ON public.partner_products
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage partner products" ON public.partner_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS partner_products_country_idx ON public.partner_products (country);
CREATE INDEX IF NOT EXISTS partner_products_network_idx ON public.partner_products (network);
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS partner_products_title_trgm ON public.partner_products USING gin (title gin_trgm_ops);

-- updated_at triggers
CREATE TRIGGER partner_product_feeds_set_updated_at
  BEFORE UPDATE ON public.partner_product_feeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER partner_products_set_updated_at
  BEFORE UPDATE ON public.partner_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed feed entries for the three Involve Asia merchants we're starting with
INSERT INTO public.partner_product_feeds (network, merchant_slug, merchant_label, country)
VALUES
  ('involve_asia', 'lazada-ph', 'Lazada Philippines', 'PH'),
  ('involve_asia', 'shopee-ph', 'Shopee Philippines', 'PH'),
  ('involve_asia', 'aliexpress', 'AliExpress', 'PH')
ON CONFLICT (network, merchant_slug) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260627155108_133816c5-a182-43a6-9159-d8d6d6da0491.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260628013733_5fde4486-0240-40cb-a419-67c7220089a2.sql =====

-- Filter selection events from /parts wizard
CREATE TABLE public.parts_filter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  make TEXT,
  model TEXT,
  year INTEGER,
  country TEXT,
  session_id TEXT,
  user_id UUID,
  referrer TEXT,
  user_agent TEXT
);
CREATE INDEX parts_filter_events_created_at_idx ON public.parts_filter_events (created_at DESC);
CREATE INDEX parts_filter_events_make_model_idx ON public.parts_filter_events (make, model);

GRANT INSERT ON public.parts_filter_events TO anon, authenticated;
GRANT ALL ON public.parts_filter_events TO service_role;

ALTER TABLE public.parts_filter_events ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon visitors) can log a filter event; no reads from public.
CREATE POLICY "anyone can log filter events"
  ON public.parts_filter_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins can read filter events"
  ON public.parts_filter_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add product attribution to affiliate_clicks so we know which ingested tile was clicked.
ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS partner_sku TEXT,
  ADD COLUMN IF NOT EXISTS product_title TEXT;

-- ===== END SOURCE MIGRATION: 20260628013733_5fde4486-0240-40cb-a419-67c7220089a2.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260701070732_03c8b90e-546c-4419-856a-3892535f6c88.sql =====

-- 1) parts_outlets: remove public SELECT (all client reads go through server functions using service role)
DROP POLICY IF EXISTS "Anyone can read active outlets" ON public.parts_outlets;

-- 2) parts_supplier_applications: remove broad public row SELECT, expose safe view instead
DROP POLICY IF EXISTS "public read published storefronts" ON public.parts_supplier_applications;

CREATE OR REPLACE VIEW public.partner_storefronts_public AS
SELECT
  storefront_slug,
  company_name,
  country,
  business_kind,
  website,
  storefront_blurb,
  storefront_logo_url,
  storefront_categories
FROM public.parts_supplier_applications
WHERE storefront_published = true
  AND storefront_slug IS NOT NULL;

GRANT SELECT ON public.partner_storefronts_public TO anon, authenticated;

-- 3) wanted_post_responses: hide contact_value from the public; keep it visible to responder & post owner
DROP POLICY IF EXISTS "Anyone can view responses to open posts" ON public.wanted_post_responses;

CREATE POLICY "Responder or post owner can view responses"
ON public.wanted_post_responses
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.wanted_posts wp
    WHERE wp.id = wanted_post_responses.wanted_post_id
      AND wp.user_id = auth.uid()
  )
);

CREATE OR REPLACE VIEW public.wanted_post_responses_public AS
SELECT
  wpr.id,
  wpr.wanted_post_id,
  wpr.user_id,
  wpr.message,
  wpr.listing_id,
  wpr.business_id,
  wpr.created_at,
  wpr.updated_at
FROM public.wanted_post_responses wpr
JOIN public.wanted_posts wp ON wp.id = wpr.wanted_post_id
WHERE wp.status = 'open';

GRANT SELECT ON public.wanted_post_responses_public TO anon, authenticated;

-- ===== END SOURCE MIGRATION: 20260701070732_03c8b90e-546c-4419-856a-3892535f6c88.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260701070829_7ed9e1a7-9b04-41aa-bac6-8fe8404bd771.sql =====

ALTER VIEW public.partner_storefronts_public SET (security_invoker = true);
ALTER VIEW public.wanted_post_responses_public SET (security_invoker = true);

-- ===== END SOURCE MIGRATION: 20260701070829_7ed9e1a7-9b04-41aa-bac6-8fe8404bd771.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260701070901_f008c70a-e732-4f58-a816-1618aefed792.sql =====

ALTER VIEW public.partner_storefronts_public SET (security_invoker = false);
ALTER VIEW public.wanted_post_responses_public SET (security_invoker = false);

-- ===== END SOURCE MIGRATION: 20260701070901_f008c70a-e732-4f58-a816-1618aefed792.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260701072731_9871982b-7cfc-4c7c-b27a-a88cfce0a6f5.sql =====

-- Applications
CREATE TABLE public.partner_program_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  region text,
  channel_type text NOT NULL,
  platforms text[] NOT NULL DEFAULT '{}',
  audience_band text,
  pitch text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes text,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  agreed_terms boolean NOT NULL DEFAULT false,
  agreed_terms_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.partner_program_applications TO authenticated;
GRANT INSERT ON public.partner_program_applications TO anon;
GRANT ALL ON public.partner_program_applications TO service_role;
ALTER TABLE public.partner_program_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_apps" ON public.partner_program_applications
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_insert_apps" ON public.partner_program_applications
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "self_read_apps" ON public.partner_program_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_apps" ON public.partner_program_applications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Partners
CREATE TABLE public.partner_program_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.partner_program_applications(id) ON DELETE SET NULL,
  referral_code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  agreed_terms_at timestamptz,
  agreed_terms_version text,
  payout_method text,
  payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_program_partners TO authenticated;
GRANT ALL ON public.partner_program_partners TO service_role;
ALTER TABLE public.partner_program_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self_or_admin_read_partners" ON public.partner_program_partners
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_write_partners" ON public.partner_program_partners
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Commission events
CREATE TABLE public.partner_program_commission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_program_partners(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('seller_sub','boost','verified_business','advertiser_purchase','shop_purchase','other')),
  amount_php numeric(12,2) NOT NULL DEFAULT 0,
  commission_php numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','clawed_back','paid')),
  source_ref text,
  event_at timestamptz NOT NULL DEFAULT now(),
  cleared_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_program_commission_events TO authenticated;
GRANT ALL ON public.partner_program_commission_events TO service_role;
ALTER TABLE public.partner_program_commission_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_or_admin_read_events" ON public.partner_program_commission_events
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    partner_id IN (SELECT id FROM public.partner_program_partners WHERE user_id = auth.uid())
  );
CREATE POLICY "admin_write_events" ON public.partner_program_commission_events
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER pp_apps_updated BEFORE UPDATE ON public.partner_program_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pp_partners_updated BEFORE UPDATE ON public.partner_program_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX pp_apps_status_idx ON public.partner_program_applications(status, created_at DESC);
CREATE INDEX pp_partners_user_idx ON public.partner_program_partners(user_id);
CREATE INDEX pp_events_partner_idx ON public.partner_program_commission_events(partner_id, event_at DESC);

-- ===== END SOURCE MIGRATION: 20260701072731_9871982b-7cfc-4c7c-b27a-a88cfce0a6f5.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260701073345_120230cf-82bf-44f2-9a3f-845373a6c87c.sql =====

-- Payout batches
CREATE TABLE public.partner_program_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_program_partners(id) ON DELETE CASCADE,
  amount_php numeric(12,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'manual',
  reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_program_payouts TO authenticated;
GRANT ALL ON public.partner_program_payouts TO service_role;
ALTER TABLE public.partner_program_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_or_admin_read_payouts" ON public.partner_program_payouts
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    partner_id IN (SELECT id FROM public.partner_program_partners WHERE user_id = auth.uid())
  );
CREATE POLICY "admin_write_payouts" ON public.partner_program_payouts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pp_payouts_updated BEFORE UPDATE ON public.partner_program_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link commission events to payouts + audit fields
ALTER TABLE public.partner_program_commission_events
  ADD COLUMN payout_id uuid REFERENCES public.partner_program_payouts(id) ON DELETE SET NULL,
  ADD COLUMN approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN paid_at timestamptz,
  ADD COLUMN clawed_back_reason text,
  ADD COLUMN clawed_back_at timestamptz,
  ADD COLUMN clawed_back_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX pp_events_payout_idx ON public.partner_program_commission_events(payout_id);
CREATE INDEX pp_payouts_partner_idx ON public.partner_program_payouts(partner_id, created_at DESC);

-- Recompute payout total from linked approved events
CREATE OR REPLACE FUNCTION public.pp_recompute_payout_total(_payout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.partner_program_payouts
     SET amount_php = COALESCE((
       SELECT SUM(commission_php)
         FROM public.partner_program_commission_events
        WHERE payout_id = _payout_id
     ), 0)
   WHERE id = _payout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.pp_recompute_payout_total(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pp_recompute_payout_total(uuid) TO authenticated, service_role;

-- ===== END SOURCE MIGRATION: 20260701073345_120230cf-82bf-44f2-9a3f-845373a6c87c.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260702133312_b82ffba0-6e87-4f60-a422-87b37cfb994f.sql =====
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        SELECT count(*) FROM public.referral_redemptions r
        WHERE r.created_at >= d7 AND coalesce(r.kind,'signup') = 'signup'
      ),
      'topStaff', (
        SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
          SELECT s.referral_code AS code,
                 coalesce(nullif(s.full_name,''), s.referral_code) AS name,
                 count(q.id)::int AS scans,
                 (SELECT count(*)::int FROM public.referral_redemptions rr
                    WHERE rr.referral_code = s.referral_code
                      AND rr.created_at >= d30) AS signups
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
                 (SELECT count(*)::int FROM public.referral_redemptions rr
                    WHERE rr.referral_code = p.referral_code
                      AND rr.created_at >= d30) AS signups
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
      'failedPayments24h',    (SELECT count(*) FROM public.payments WHERE status IN ('failed','rejected') AND created_at >= h24),
      'openReports',          (SELECT count(*) FROM public.reports WHERE status IN ('open','pending','submitted','under_review')),
      'unacknowledgedAlerts', (SELECT count(*) FROM public.ops_alerts WHERE coalesce(acknowledged, false) = false),
      'pendingClaimReviews',  (SELECT count(*) FROM public.business_claim_requests WHERE status = 'pending')
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_overview() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO service_role;
-- ===== END SOURCE MIGRATION: 20260702133312_b82ffba0-6e87-4f60-a422-87b37cfb994f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260702134016_fa6a61dc-4391-4a0c-8b36-ba5c9d4ddd02.sql =====
create table if not exists public.promoter_analytics_events (
  id uuid primary key default gen_random_uuid(),
  surface text not null,
  event   text not null,
  cta_id  text,
  variant text,
  partner_code text,
  user_id uuid,
  session_hash text,
  path text,
  referrer text,
  meta jsonb,
  created_at timestamptz not null default now()
);

grant select, insert on public.promoter_analytics_events to anon, authenticated;
grant all on public.promoter_analytics_events to service_role;

alter table public.promoter_analytics_events enable row level security;

create policy "promoter_analytics_events_insert_any"
  on public.promoter_analytics_events
  for insert
  to anon, authenticated
  with check (true);

create policy "promoter_analytics_events_select_admin"
  on public.promoter_analytics_events
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create index if not exists promoter_analytics_events_created_at_idx
  on public.promoter_analytics_events (created_at desc);
create index if not exists promoter_analytics_events_surface_event_idx
  on public.promoter_analytics_events (surface, event, created_at desc);
create index if not exists promoter_analytics_events_partner_idx
  on public.promoter_analytics_events (partner_code, created_at desc);
-- ===== END SOURCE MIGRATION: 20260702134016_fa6a61dc-4391-4a0c-8b36-ba5c9d4ddd02.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260702135859_cd21d4f3-c323-473c-8b80-8960437e500a.sql =====
CREATE OR REPLACE FUNCTION public.admin_overview_trends(days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  n int := greatest(1, least(coalesce(days, 30), 90));
  day_start timestamptz := date_trunc('day', now());
  start_day timestamptz := day_start - make_interval(days => n - 1);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  WITH days AS (
    SELECT generate_series(start_day, day_start, interval '1 day')::date AS d
  ),
  signups AS (
    SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS c
    FROM public.profiles WHERE created_at >= start_day GROUP BY 1
  ),
  scans AS (
    SELECT date_trunc('day', scanned_at)::date AS d, count(*)::int AS c
    FROM public.qr_scans WHERE scanned_at >= start_day GROUP BY 1
  ),
  listings AS (
    SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS c
    FROM public.listings WHERE created_at >= start_day GROUP BY 1
  ),
  boosts AS (
    SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS c
    FROM public.listing_boosts WHERE created_at >= start_day GROUP BY 1
  ),
  msgs AS (
    SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS c
    FROM public.messages WHERE created_at >= start_day GROUP BY 1
  ),
  pays AS (
    SELECT date_trunc('day', coalesce(paid_at, created_at))::date AS d,
           count(*)::int AS c,
           coalesce(sum(amount_php), 0)::numeric AS amt
    FROM public.payments
    WHERE status = 'paid' AND coalesce(paid_at, created_at) >= start_day
    GROUP BY 1
  ),
  series AS (
    SELECT to_char(days.d, 'YYYY-MM-DD') AS day,
           coalesce(signups.c, 0)  AS signups,
           coalesce(scans.c, 0)    AS scans,
           coalesce(listings.c, 0) AS listings,
           coalesce(boosts.c, 0)   AS boosts,
           coalesce(msgs.c, 0)     AS messages,
           coalesce(pays.c, 0)     AS payments,
           coalesce(pays.amt, 0)   AS revenue
    FROM days
    LEFT JOIN signups  ON signups.d  = days.d
    LEFT JOIN scans    ON scans.d    = days.d
    LEFT JOIN listings ON listings.d = days.d
    LEFT JOIN boosts   ON boosts.d   = days.d
    LEFT JOIN msgs     ON msgs.d     = days.d
    LEFT JOIN pays     ON pays.d     = days.d
    ORDER BY days.d
  )
  SELECT jsonb_build_object(
    'days', n,
    'series', coalesce(jsonb_agg(row_to_json(series)), '[]'::jsonb)
  ) INTO result FROM series;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_overview_trends(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_overview_trends(int) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_overview_trends(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview_trends(int) TO service_role;
-- ===== END SOURCE MIGRATION: 20260702135859_cd21d4f3-c323-473c-8b80-8960437e500a.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260703001045_a60e1893-fdf9-4317-b0d1-11606fea2118.sql =====
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
        SELECT count(*) FROM public.referral_redemptions r
        WHERE r.created_at >= d7 AND coalesce(r.kind,'signup') = 'signup'
      ),
      'topStaff', (
        SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
          SELECT s.referral_code AS code,
                 coalesce(nullif(s.full_name,''), s.referral_code) AS name,
                 count(q.id)::int AS scans,
                 (SELECT count(*)::int FROM public.referral_redemptions rr
                    WHERE rr.referral_code = s.referral_code
                      AND rr.created_at >= d30) AS signups
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
                 (SELECT count(*)::int FROM public.referral_redemptions rr
                    WHERE rr.referral_code = p.referral_code
                      AND rr.created_at >= d30) AS signups
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
-- ===== END SOURCE MIGRATION: 20260703001045_a60e1893-fdf9-4317-b0d1-11606fea2118.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260703041725_735e3af3-b71d-420f-a48c-9f9418f9fd03.sql =====

DROP POLICY IF EXISTS "Sales view listings" ON public.listings;
CREATE POLICY "Sales view listings"
ON public.listings FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND public.is_sales_assigned_user(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Sales read referral_redemptions" ON public.referral_redemptions;
CREATE POLICY "Sales read referral_redemptions"
ON public.referral_redemptions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = referral_redemptions.staff_referral_id
      AND s.staff_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Sales read user_referrals" ON public.user_referrals;
CREATE POLICY "Sales read user_referrals"
ON public.user_referrals FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = user_referrals.referred_by_staff_id
      AND s.staff_user_id = auth.uid()
  )
);

-- ===== END SOURCE MIGRATION: 20260703041725_735e3af3-b71d-420f-a48c-9f9418f9fd03.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260703133351_ae2ded6d-03e2-4c5a-bda9-8ab011454540.sql =====

-- ENUMS
CREATE TYPE public.club_type AS ENUM ('motorcycle_riding','car_club','off_road','truck_club','brand_owners','general_motoring','other');
CREATE TYPE public.club_status AS ENUM ('pending','active','rejected','suspended');
CREATE TYPE public.club_member_role AS ENUM ('owner','admin','member');
CREATE TYPE public.club_member_status AS ENUM ('pending','active','banned');
CREATE TYPE public.club_document_kind AS ENUM ('lto_accreditation','sec_incorporation','dti_business_permit','other');
CREATE TYPE public.club_event_status AS ENUM ('scheduled','cancelled','completed');
CREATE TYPE public.club_rsvp_response AS ENUM ('going','maybe','no');

-- CLUBS
CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  type public.club_type NOT NULL DEFAULT 'general_motoring',
  description text,
  region text,
  city text,
  logo_url text,
  cover_url text,
  contact_email text,
  contact_phone text,
  website_url text,
  status public.club_status NOT NULL DEFAULT 'pending',
  verified boolean NOT NULL DEFAULT false,
  member_count integer NOT NULL DEFAULT 1,
  review_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clubs_status ON public.clubs(status);
CREATE INDEX idx_clubs_type ON public.clubs(type);
CREATE INDEX idx_clubs_owner ON public.clubs(owner_id);

GRANT SELECT ON public.clubs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clubs TO authenticated;
GRANT ALL ON public.clubs TO service_role;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- CLUB DOCUMENTS
CREATE TABLE public.club_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  kind public.club_document_kind NOT NULL,
  storage_path text NOT NULL,
  original_filename text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_club_documents_club ON public.club_documents(club_id);

GRANT SELECT, INSERT, DELETE ON public.club_documents TO authenticated;
GRANT ALL ON public.club_documents TO service_role;
ALTER TABLE public.club_documents ENABLE ROW LEVEL SECURITY;

-- CLUB MEMBERS
CREATE TABLE public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.club_member_role NOT NULL DEFAULT 'member',
  status public.club_member_status NOT NULL DEFAULT 'pending',
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);
CREATE INDEX idx_club_members_club ON public.club_members(club_id);
CREATE INDEX idx_club_members_user ON public.club_members(user_id);

GRANT SELECT ON public.club_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_members TO authenticated;
GRANT ALL ON public.club_members TO service_role;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- CLUB EVENTS
CREATE TABLE public.club_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  meetup_location text,
  meetup_lat double precision,
  meetup_lng double precision,
  cover_url text,
  status public.club_event_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_club_events_club ON public.club_events(club_id);
CREATE INDEX idx_club_events_starts_at ON public.club_events(starts_at);

GRANT SELECT ON public.club_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_events TO authenticated;
GRANT ALL ON public.club_events TO service_role;
ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;

-- EVENT RSVPs
CREATE TABLE public.club_event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response public.club_rsvp_response NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
CREATE INDEX idx_club_event_rsvps_event ON public.club_event_rsvps(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_event_rsvps TO authenticated;
GRANT ALL ON public.club_event_rsvps TO service_role;
ALTER TABLE public.club_event_rsvps ENABLE ROW LEVEL SECURITY;

-- CLUB RIDES
CREATE TABLE public.club_rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, ride_id)
);
CREATE INDEX idx_club_rides_club ON public.club_rides(club_id);

GRANT SELECT ON public.club_rides TO anon;
GRANT SELECT, INSERT, DELETE ON public.club_rides TO authenticated;
GRANT ALL ON public.club_rides TO service_role;
ALTER TABLE public.club_rides ENABLE ROW LEVEL SECURITY;

-- CLUB POSTS
CREATE TABLE public.club_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_club_posts_club ON public.club_posts(club_id);

GRANT SELECT ON public.club_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_posts TO authenticated;
GRANT ALL ON public.club_posts TO service_role;
ALTER TABLE public.club_posts ENABLE ROW LEVEL SECURITY;

-- HELPER: is_club_admin (owner or club admin role, active)
CREATE OR REPLACE FUNCTION public.is_club_admin(_user uuid, _club uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs c WHERE c.id = _club AND c.owner_id = _user
  ) OR EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.club_id = _club AND m.user_id = _user
      AND m.status = 'active' AND m.role IN ('owner','admin')
  );
$$;

-- HELPER: is_club_member (active member)
CREATE OR REPLACE FUNCTION public.is_club_member(_user uuid, _club uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs c WHERE c.id = _club AND c.owner_id = _user
  ) OR EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.club_id = _club AND m.user_id = _user AND m.status = 'active'
  );
$$;

-- POLICIES: clubs
CREATE POLICY "Public can read active clubs" ON public.clubs
  FOR SELECT TO anon, authenticated
  USING (status = 'active');
CREATE POLICY "Owner and admins read own club" ON public.clubs
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_club_admin(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can apply to create a club" ON public.clubs
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND status = 'pending');
CREATE POLICY "Owner and admins update club" ON public.clubs
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_club_admin(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.is_club_admin(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner deletes club" ON public.clubs
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- POLICIES: club_documents (private)
CREATE POLICY "Club admins read own docs" ON public.club_documents
  FOR SELECT TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Club admins insert docs" ON public.club_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (public.is_club_admin(auth.uid(), club_id) OR EXISTS (
      SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.owner_id = auth.uid()
    ))
  );
CREATE POLICY "Club admins delete docs" ON public.club_documents
  FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

-- POLICIES: club_members
CREATE POLICY "Public reads members of active clubs" ON public.club_members
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.status = 'active'));
CREATE POLICY "Users see own memberships" ON public.club_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User requests to join" ON public.club_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'member' AND status = 'pending');
CREATE POLICY "Club admins manage members" ON public.club_members
  FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "User leaves or admin removes" ON public.club_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

-- POLICIES: club_events
CREATE POLICY "Public reads events for active clubs" ON public.club_events
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.status = 'active'));
CREATE POLICY "Club admins manage events" ON public.club_events
  FOR ALL TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

-- POLICIES: club_event_rsvps
CREATE POLICY "Members read event rsvps" ON public.club_event_rsvps
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.club_events e
      WHERE e.id = event_id AND public.is_club_member(auth.uid(), e.club_id)
    )
  );
CREATE POLICY "User manages own rsvp" ON public.club_event_rsvps
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "User updates own rsvp" ON public.club_event_rsvps
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "User deletes own rsvp" ON public.club_event_rsvps
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- POLICIES: club_rides
CREATE POLICY "Public reads rides on active clubs" ON public.club_rides
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.status = 'active'));
CREATE POLICY "Member attaches own ride" ON public.club_rides
  FOR INSERT TO authenticated
  WITH CHECK (
    added_by = auth.uid()
    AND public.is_club_member(auth.uid(), club_id)
    AND EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Member detaches own or admin removes" ON public.club_rides
  FOR DELETE TO authenticated
  USING (
    added_by = auth.uid()
    OR public.is_club_admin(auth.uid(), club_id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- POLICIES: club_posts
CREATE POLICY "Public reads posts of active clubs" ON public.club_posts
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.status = 'active'));
CREATE POLICY "Club admins write posts" ON public.club_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  );
CREATE POLICY "Club admins update posts" ON public.club_posts
  FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Club admins delete posts" ON public.club_posts
  FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_role(auth.uid(), 'admin'));

-- UPDATED_AT TRIGGERS
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_club_events_updated_at BEFORE UPDATE ON public.club_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MEMBER COUNT TRIGGER
CREATE OR REPLACE FUNCTION public.update_club_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.clubs SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.club_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'active' AND OLD.status <> 'active' THEN
      UPDATE public.clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
    ELSIF OLD.status = 'active' AND NEW.status <> 'active' THEN
      UPDATE public.clubs SET member_count = GREATEST(0, member_count - 1) WHERE id = NEW.club_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_club_members_count
  AFTER INSERT OR UPDATE OR DELETE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.update_club_member_count();

-- AUTO OWNER MEMBERSHIP on club insert
CREATE OR REPLACE FUNCTION public.create_club_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.club_members (club_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active', now())
  ON CONFLICT (club_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_clubs_owner_membership
  AFTER INSERT ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.create_club_owner_membership();

-- ===== END SOURCE MIGRATION: 20260703133351_ae2ded6d-03e2-4c5a-bda9-8ab011454540.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260703133635_5cc0adde-634a-4f1e-9fde-f821eca32075.sql =====

-- Storage RLS: club-docs (private)
CREATE POLICY "Club admins read own club docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-docs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id::text = split_part(name, '/', 1)
          AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
      )
    )
  );

CREATE POLICY "Club admins upload club docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-docs'
    AND EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id::text = split_part(name, '/', 1)
        AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
    )
  );

CREATE POLICY "Club admins delete club docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-docs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id::text = split_part(name, '/', 1)
          AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
      )
    )
  );

-- Storage RLS: business-media, path prefix clubs/{club_id}/...
CREATE POLICY "Club admins upload club media in business-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-media'
    AND split_part(name, '/', 1) = 'clubs'
    AND EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id::text = split_part(name, '/', 2)
        AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
    )
  );

CREATE POLICY "Club admins update club media in business-media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-media'
    AND split_part(name, '/', 1) = 'clubs'
    AND EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id::text = split_part(name, '/', 2)
        AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
    )
  );

CREATE POLICY "Club admins delete club media in business-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-media'
    AND split_part(name, '/', 1) = 'clubs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id::text = split_part(name, '/', 2)
          AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
      )
    )
  );

-- ===== END SOURCE MIGRATION: 20260703133635_5cc0adde-634a-4f1e-9fde-f821eca32075.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260703135517_be64835f-9a09-4cbc-84d7-739d9c05be1a.sql =====

-- Helper: is the user an active member of a verified, active club?
CREATE OR REPLACE FUNCTION public.user_has_verified_club(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_members cm
    JOIN public.clubs c ON c.id = cm.club_id
    WHERE cm.user_id = _user_id
      AND cm.status = 'active'
      AND c.status = 'active'
      AND c.verified = true
  );
$$;

-- Audit table for each applied club-member discount
CREATE TABLE public.club_member_discount_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  scope text NOT NULL, -- e.g. 'ad_order', 'boost', 'bundle', 'subscription', 'passport_premium', 'promotion'
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  line_item_id uuid REFERENCES public.payment_line_items(id) ON DELETE SET NULL,
  original_amount_php numeric NOT NULL,
  discount_amount_php numeric NOT NULL,
  discount_pct numeric NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.club_member_discount_grants TO authenticated;
GRANT ALL ON public.club_member_discount_grants TO service_role;

ALTER TABLE public.club_member_discount_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own club discount grants"
  ON public.club_member_discount_grants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_club_discount_grants_user ON public.club_member_discount_grants(user_id);
CREATE INDEX idx_club_discount_grants_payment ON public.club_member_discount_grants(payment_id);

-- Config rows in pricing_settings
INSERT INTO public.pricing_settings (key, value, label, description)
VALUES
  ('club_member_discount_pct', 5, 'Club member discount %',
   'Percent discount applied to internal 365 purchases (ads, boosts, bundles, plans, passport premium) for active members of verified clubs.'),
  ('club_member_discount_enabled', 1, 'Club member discount enabled',
   'Set to 1 to enable the club member discount, 0 to disable globally.')
ON CONFLICT (key) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260703135517_be64835f-9a09-4cbc-84d7-739d9c05be1a.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260703141331_e3dda1ee-6d75-488f-8143-538acfa08b50.sql =====
INSERT INTO public.pricing_settings (key, value, label, description) VALUES
  ('club_member_discount_coupon_duration', 0, 'Club coupon duration',
   'Stripe coupon duration for the club-member discount. 0 = auto (once for one-time payments, forever for subscriptions), 1 = once (single invoice only), 2 = forever (applies to every renewal).'),
  ('club_member_discount_require_verified', 1, 'Require verified club',
   'When 1, only members of clubs marked verified=true qualify. When 0, any active club counts.'),
  ('club_member_discount_include_pending_clubs', 0, 'Include pending clubs',
   'When 1, members of clubs in status=pending also qualify. Default 0 (active clubs only).'),
  ('club_member_discount_include_pending_members', 0, 'Include pending members',
   'When 1, memberships in status=pending also qualify. Default 0 (active members only).')
ON CONFLICT (key) DO NOTHING;
-- ===== END SOURCE MIGRATION: 20260703141331_e3dda1ee-6d75-488f-8143-538acfa08b50.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260704042432_7e9aeeea-3d2f-4253-8cee-e1e25c93ca1a.sql =====
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS club_discount JSONB;

COMMENT ON COLUMN public.payments.club_discount IS
  'Immutable snapshot of the club-member discount applied to this payment. Shape: { club_id, club_name, club_slug, scope, discount_pct, discount_amount_php, original_amount_php, final_amount_php, applied_at, eligibility_reason, grant_id }. Written server-side when the discount is granted; do not mutate after checkout.';

CREATE INDEX IF NOT EXISTS payments_club_discount_club_id_idx
  ON public.payments ((club_discount->>'club_id'))
  WHERE club_discount IS NOT NULL;
-- ===== END SOURCE MIGRATION: 20260704042432_7e9aeeea-3d2f-4253-8cee-e1e25c93ca1a.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260704080518_4e24ea68-0ef0-4482-862a-e3dd6e601dd8.sql =====

-- Extend subject enum to support supplier assignments
ALTER TYPE public.sales_rep_subject ADD VALUE IF NOT EXISTS 'supplier';

-- ===== END SOURCE MIGRATION: 20260704080518_4e24ea68-0ef0-4482-862a-e3dd6e601dd8.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260704080604_32cb4318-076d-4e4f-9469-17276834652d.sql =====

CREATE OR REPLACE FUNCTION public.is_sales_assigned_supplier(_rep uuid, _supplier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sales_rep_assignments
    WHERE rep_user_id = _rep
      AND active = true
      AND subject_type = 'supplier'
      AND subject_id = _supplier_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_sales_assigned_supplier(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_sales_assigned_supplier(uuid, uuid) TO authenticated;

-- parts_supplier_contacts
DROP POLICY IF EXISTS "Admins and sales can read supplier contacts" ON public.parts_supplier_contacts;
DROP POLICY IF EXISTS "Admins and sales can write supplier contacts" ON public.parts_supplier_contacts;

CREATE POLICY "Admins and assigned sales can read supplier contacts"
ON public.parts_supplier_contacts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND public.is_sales_assigned_supplier(auth.uid(), supplier_id))
);

CREATE POLICY "Admins and assigned sales can write supplier contacts"
ON public.parts_supplier_contacts FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND public.is_sales_assigned_supplier(auth.uid(), supplier_id))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND public.is_sales_assigned_supplier(auth.uid(), supplier_id))
);

-- parts_supplier_outreach
DROP POLICY IF EXISTS "Admins and sales can read outreach" ON public.parts_supplier_outreach;
DROP POLICY IF EXISTS "Admins and sales can write outreach" ON public.parts_supplier_outreach;

CREATE POLICY "Admins and scoped sales can read outreach"
ON public.parts_supplier_outreach FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
);

CREATE POLICY "Admins and scoped sales can write outreach"
ON public.parts_supplier_outreach FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
);

-- parts_supplier_tasks
DROP POLICY IF EXISTS "Admins and sales can read supplier tasks" ON public.parts_supplier_tasks;
DROP POLICY IF EXISTS "Admins and sales can write supplier tasks" ON public.parts_supplier_tasks;

CREATE POLICY "Admins and scoped sales can read supplier tasks"
ON public.parts_supplier_tasks FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
);

CREATE POLICY "Admins and scoped sales can write supplier tasks"
ON public.parts_supplier_tasks FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
);

-- ===== END SOURCE MIGRATION: 20260704080604_32cb4318-076d-4e4f-9469-17276834652d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260704084341_d710463c-2b79-4a46-a696-1d1639e2939d.sql =====

CREATE TABLE public.club_discount_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  headline text NOT NULL,
  description text NOT NULL,
  percent numeric(5,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  audiences text[] NOT NULL DEFAULT '{}',
  applies_to text[] NOT NULL DEFAULT '{}',
  excludes text[] NOT NULL DEFAULT '{}',
  stacking_rules text NOT NULL DEFAULT '',
  eligibility_notes text NOT NULL DEFAULT '',
  how_it_applies text NOT NULL DEFAULT '',
  footer_note text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.club_discount_promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_discount_promotions TO authenticated;
GRANT ALL ON public.club_discount_promotions TO service_role;

ALTER TABLE public.club_discount_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active promotions"
  ON public.club_discount_promotions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can read all promotions"
  ON public.club_discount_promotions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert promotions"
  ON public.club_discount_promotions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update promotions"
  ON public.club_discount_promotions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete promotions"
  ON public.club_discount_promotions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_club_discount_promotions_updated_at
  BEFORE UPDATE ON public.club_discount_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.club_discount_promotions
  (name, headline, description, percent, is_active, audiences, applies_to, excludes,
   stacking_rules, eligibility_notes, how_it_applies, footer_note, sort_order)
VALUES (
  'Club Member 5%',
  '5% Club Member Discount',
  'Active members of a verified club on 365 MotorSales automatically get 5% off internal 365 purchases at checkout — no coupon code needed. Eligibility is re-checked on every purchase and recorded on your receipt.',
  5,
  true,
  ARRAY['Verified club members'],
  ARRAY['Ads & ad orders','Listing boosts','Listing bundles','Subscription plans','Passport Premium'],
  ARRAY['Third-party partner parts','Insurance quotes','Tow provider fees','External shops & marketplaces','Items sold between members'],
  'Doesn''t stack with other percentage discounts or promo coupons on the same purchase — the larger discount wins.',
  'Signed-in members of a verified club with active membership. If you leave the club or the club loses verified status, the discount stops on future purchases.',
  'Automatically at checkout on eligible purchases. You''ll see a "Club member 5% off applied" note and the eligibility reason is stored on your receipt.',
  'More perks (insurance rates, parts discounts, event access) are on the roadmap. The 5% Club Member Discount is the only live perk today.',
  0
);

-- ===== END SOURCE MIGRATION: 20260704084341_d710463c-2b79-4a46-a696-1d1639e2939d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260705075701_7b5fec29-9760-4f5c-9f2a-d6dbc691a76b.sql =====
CREATE TABLE public.signup_failure_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  intent text,
  phone_iso text,
  reason text NOT NULL,
  missing_fields text[] NOT NULL DEFAULT '{}',
  status_code int NOT NULL,
  ip_hash text,
  user_agent text
);

GRANT SELECT ON public.signup_failure_events TO authenticated;
GRANT ALL ON public.signup_failure_events TO service_role;

ALTER TABLE public.signup_failure_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read signup failures"
  ON public.signup_failure_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_signup_failure_created ON public.signup_failure_events (created_at DESC);
CREATE INDEX idx_signup_failure_reason ON public.signup_failure_events (reason, created_at DESC);
-- ===== END SOURCE MIGRATION: 20260705075701_7b5fec29-9760-4f5c-9f2a-d6dbc691a76b.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260705080402_b51586e0-228a-4936-bccc-4c170e4283a6.sql =====
GRANT EXECUTE ON FUNCTION public.can_manage_shop(uuid) TO anon, authenticated;
-- ===== END SOURCE MIGRATION: 20260705080402_b51586e0-228a-4936-bccc-4c170e4283a6.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260705145013_215852c9-9200-4048-9941-804a66f1c867.sql =====
ALTER TABLE public.listings
  ADD CONSTRAINT listings_user_id_profiles_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
-- ===== END SOURCE MIGRATION: 20260705145013_215852c9-9200-4048-9941-804a66f1c867.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260706042027_d7ff3b5e-60ff-4d87-ad68-c6934d53d076.sql =====

-- Auto-accredit @365motorsales.com staff (with a staff_referrals row) as
-- approved Partner Program partners, sharing the same referral_code.

CREATE OR REPLACE FUNCTION public.accredit_staff_partner(_staff_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_sr RECORD;
  v_full_name text;
  v_app_id uuid;
BEGIN
  IF _staff_user_id IS NULL THEN RETURN; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = _staff_user_id;
  IF v_email IS NULL OR lower(v_email) NOT LIKE '%@365motorsales.com' THEN
    RETURN;
  END IF;

  SELECT * INTO v_sr FROM public.staff_referrals
   WHERE staff_user_id = _staff_user_id AND active = true
   ORDER BY updated_at DESC LIMIT 1;
  IF v_sr.id IS NULL THEN RETURN; END IF;

  -- Skip if partner already exists for this code or user.
  IF EXISTS (
    SELECT 1 FROM public.partner_program_partners
     WHERE referral_code = v_sr.referral_code OR user_id = _staff_user_id
  ) THEN
    -- Ensure it's active.
    UPDATE public.partner_program_partners
       SET active = true, updated_at = now()
     WHERE (referral_code = v_sr.referral_code OR user_id = _staff_user_id)
       AND active = false;
    RETURN;
  END IF;

  SELECT COALESCE(full_name, v_sr.full_name, v_email)
    INTO v_full_name FROM public.profiles WHERE id = _staff_user_id;
  IF v_full_name IS NULL THEN v_full_name := COALESCE(v_sr.full_name, v_email); END IF;

  -- Find or create approved application.
  SELECT id INTO v_app_id FROM public.partner_program_applications
   WHERE user_id = _staff_user_id AND channel_type = 'internal_staff'
   LIMIT 1;

  IF v_app_id IS NULL THEN
    INSERT INTO public.partner_program_applications (
      user_id, full_name, email, phone, channel_type, platforms,
      status, agreed_terms, agreed_terms_at, reviewed_at, admin_notes
    ) VALUES (
      _staff_user_id, v_full_name, v_email, v_sr.phone, 'internal_staff', ARRAY['internal']::text[],
      'approved', true, now(), now(),
      'Auto-accredited: 365 Motorsales internal staff'
    )
    RETURNING id INTO v_app_id;
  ELSE
    UPDATE public.partner_program_applications
       SET status = 'approved', agreed_terms = true,
           agreed_terms_at = COALESCE(agreed_terms_at, now()),
           reviewed_at = COALESCE(reviewed_at, now()),
           admin_notes = COALESCE(admin_notes, 'Auto-accredited: 365 Motorsales internal staff')
     WHERE id = v_app_id;
  END IF;

  INSERT INTO public.partner_program_partners (
    user_id, application_id, referral_code, display_name, active,
    agreed_terms_at, agreed_terms_version
  ) VALUES (
    _staff_user_id, v_app_id, v_sr.referral_code, v_full_name, true,
    now(), 'internal-staff-v1'
  )
  ON CONFLICT (referral_code) DO NOTHING;
END;
$$;

-- Trigger on staff_referrals insert/update
CREATE OR REPLACE FUNCTION public.tg_staff_referrals_accredit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_user_id IS NOT NULL AND NEW.active = true THEN
    PERFORM public.accredit_staff_partner(NEW.staff_user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_referrals_accredit ON public.staff_referrals;
CREATE TRIGGER staff_referrals_accredit
AFTER INSERT OR UPDATE OF staff_user_id, referral_code, active
ON public.staff_referrals
FOR EACH ROW EXECUTE FUNCTION public.tg_staff_referrals_accredit();

-- Trigger on auth.users email confirmation for staff domain
CREATE OR REPLACE FUNCTION public.tg_auth_user_staff_accredit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) LIKE '%@365motorsales.com'
     AND NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM public.accredit_staff_partner(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed_accredit_staff ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_accredit_staff
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tg_auth_user_staff_accredit();

-- Backfill existing staff.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT sr.staff_user_id
      FROM public.staff_referrals sr
      JOIN auth.users u ON u.id = sr.staff_user_id
     WHERE sr.active = true
       AND lower(u.email) LIKE '%@365motorsales.com'
  LOOP
    PERFORM public.accredit_staff_partner(r.staff_user_id);
  END LOOP;
END $$;

-- ===== END SOURCE MIGRATION: 20260706042027_d7ff3b5e-60ff-4d87-ad68-c6934d53d076.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260706042342_a2a3a3d6-6594-4d25-9a6b-2e02e5dff27f.sql =====

-- Gate referral crediting on Partner Program accreditation.
-- Codes only credit when an active partner_program_partners row exists.

CREATE OR REPLACE FUNCTION public.attach_signup_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb;
  code text;
  s public.staff_referrals%ROWTYPE;
  is_accredited boolean;
BEGIN
  SELECT raw_user_meta_data INTO meta FROM auth.users WHERE id = NEW.id;
  code := NULLIF(meta->>'referral_code','');
  IF code IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO s FROM public.staff_referrals WHERE referral_code = code AND active = true;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Accreditation gate: only credit if an active Partner Program partner
  -- record exists for this code. Non-accredited referrers get no credit.
  SELECT EXISTS (
    SELECT 1 FROM public.partner_program_partners
     WHERE referral_code = code AND active = true
  ) INTO is_accredited;

  INSERT INTO public.user_referrals(user_id, referred_by_staff_id, first_referral_code, last_referral_code, credited_referral_code)
    VALUES (
      NEW.id, s.id, code, code,
      CASE WHEN is_accredited THEN code ELSE NULL END
    )
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.record_qr_scan(_code text, _visitor_id uuid, _user_agent text DEFAULT NULL::text, _landing text DEFAULT NULL::text, _device text DEFAULT NULL::text, _browser text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.staff_referrals%ROWTYPE;
  v public.referral_visits%ROWTYPE;
  is_active boolean;
  is_accredited boolean;
  can_credit boolean;
  inserted_scan boolean := false;
  new_scan_id uuid;
BEGIN
  SELECT * INTO s FROM public.staff_referrals WHERE referral_code = _code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;
  is_active := s.active;

  SELECT EXISTS (
    SELECT 1 FROM public.partner_program_partners
     WHERE referral_code = _code AND active = true
  ) INTO is_accredited;

  can_credit := is_active AND is_accredited;

  INSERT INTO public.qr_scans(referral_code, visitor_id, device_type, browser)
    VALUES (_code, _visitor_id, _device, _browser)
    ON CONFLICT (referral_code, visitor_id) WHERE visitor_id IS NOT NULL
    DO NOTHING
    RETURNING id INTO new_scan_id;
  inserted_scan := new_scan_id IS NOT NULL;

  SELECT * INTO v FROM public.referral_visits WHERE visitor_id = _visitor_id;
  IF NOT FOUND THEN
    INSERT INTO public.referral_visits(visitor_id, first_referral_code, last_referral_code, credited_referral_code, landing_page, user_agent)
      VALUES (_visitor_id, _code, _code, CASE WHEN can_credit THEN _code ELSE NULL END, _landing, _user_agent);
  ELSE
    UPDATE public.referral_visits
       SET last_referral_code = _code,
           last_seen_at = now(),
           credited_referral_code = COALESCE(credited_referral_code, CASE WHEN can_credit THEN _code ELSE NULL END),
           first_referral_code = COALESCE(first_referral_code, _code)
     WHERE visitor_id = _visitor_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'active', is_active,
    'accredited', is_accredited,
    'credited', can_credit,
    'inserted_scan', inserted_scan
  );
END $function$;

-- ===== END SOURCE MIGRATION: 20260706042342_a2a3a3d6-6594-4d25-9a6b-2e02e5dff27f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260706042631_6543409d-ceed-4d72-bc09-7b9b2564b2d0.sql =====

-- Referral-source tracking on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_source text
  CHECK (signup_source IN ('qr','link','direct'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_is_business boolean := v_intent IN ('business','service_provider');
  v_seller_type seller_type := CASE WHEN v_is_business THEN 'business'::seller_type ELSE 'private'::seller_type END;
  v_ref_code text := NULLIF(m->>'referral_code','');
  v_src_raw text := lower(NULLIF(m->>'signup_source',''));
  v_signup_source text;
BEGIN
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

  -- Normalize signup_source. If client didn't send one, infer from referral_code.
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
    business_kind, seller_type, signup_source
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
    v_signup_source
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END
$function$;

-- Backfill: mark existing users. If they have a user_referrals row => 'link',
-- otherwise 'direct'. (We can't recover 'qr' historically.)
UPDATE public.profiles p
   SET signup_source = CASE
     WHEN EXISTS (SELECT 1 FROM public.user_referrals ur WHERE ur.user_id = p.id) THEN 'link'
     ELSE 'direct'
   END
 WHERE signup_source IS NULL;

-- ===== END SOURCE MIGRATION: 20260706042631_6543409d-ceed-4d72-bc09-7b9b2564b2d0.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260706044717_364ddd91-48e7-4224-b5cf-a6b500a9bd42.sql =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS intent_evaluated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intent_evaluated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
-- ===== END SOURCE MIGRATION: 20260706044717_364ddd91-48e7-4224-b5cf-a6b500a9bd42.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260706045048_1725132d-d311-46a4-8ce9-cffcca83cb5d.sql =====
-- Deterministic derivation shared by triggers + admin recompute UI.
CREATE OR REPLACE FUNCTION public.derive_signup_intent(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seller_type text;
  _owns_business boolean;
BEGIN
  SELECT seller_type INTO _seller_type FROM public.profiles WHERE id = _user_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = _user_id)
    INTO _owns_business;

  IF lower(coalesce(_seller_type, '')) = 'repair_shop' THEN
    RETURN 'service_provider';
  ELSIF lower(coalesce(_seller_type, '')) IN ('dealer', 'insurance') THEN
    RETURN 'business';
  ELSIF _owns_business THEN
    RETURN 'business';
  ELSE
    RETURN 'buyer';
  END IF;
END;
$$;

-- Writes the derived value only when it actually differs.
CREATE OR REPLACE FUNCTION public.recompute_signup_intent(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next text;
  _prev text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;
  _next := public.derive_signup_intent(_user_id);
  SELECT signup_intent INTO _prev FROM public.profiles WHERE id = _user_id;
  IF _prev IS DISTINCT FROM _next THEN
    UPDATE public.profiles
       SET signup_intent = _next,
           intent_evaluated_at = now(),
           intent_evaluated_by = NULL
     WHERE id = _user_id;
  END IF;
END;
$$;

-- 1) Profile seller_type / seller_type_confirmed_at changes
CREATE OR REPLACE FUNCTION public.trg_profiles_recompute_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.seller_type IS DISTINCT FROM OLD.seller_type) THEN
    PERFORM public.recompute_signup_intent(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_recompute_intent ON public.profiles;
CREATE TRIGGER profiles_recompute_intent
AFTER INSERT OR UPDATE OF seller_type ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_profiles_recompute_intent();

-- 2) Business ownership add/remove/move
CREATE OR REPLACE FUNCTION public.trg_businesses_recompute_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_signup_intent(NEW.owner_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_signup_intent(OLD.owner_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      PERFORM public.recompute_signup_intent(OLD.owner_id);
      PERFORM public.recompute_signup_intent(NEW.owner_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS businesses_recompute_intent ON public.businesses;
CREATE TRIGGER businesses_recompute_intent
AFTER INSERT OR UPDATE OF owner_id OR DELETE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.trg_businesses_recompute_intent();

-- 3) Partner Program accreditation add/activate/revoke — recompute anyone
--    currently credited to that referral code so intent stays fresh even if
--    future derivation logic ever gates on accreditation.
CREATE OR REPLACE FUNCTION public.trg_partners_recompute_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
  _uid uuid;
BEGIN
  _code := COALESCE(NEW.referral_code, OLD.referral_code);
  IF _code IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  FOR _uid IN
    SELECT user_id FROM public.user_referrals
     WHERE credited_referral_code = _code OR first_referral_code = _code
  LOOP
    PERFORM public.recompute_signup_intent(_uid);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS partners_recompute_intent ON public.partner_program_partners;
CREATE TRIGGER partners_recompute_intent
AFTER INSERT OR UPDATE OF active, referral_code OR DELETE
ON public.partner_program_partners
FOR EACH ROW EXECUTE FUNCTION public.trg_partners_recompute_intent();

-- Backfill: recompute every profile once so existing badges match the derived value.
DO $$
DECLARE
  _uid uuid;
BEGIN
  FOR _uid IN SELECT id FROM public.profiles LOOP
    PERFORM public.recompute_signup_intent(_uid);
  END LOOP;
END $$;
-- ===== END SOURCE MIGRATION: 20260706045048_1725132d-d311-46a4-8ce9-cffcca83cb5d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260706045431_7f2e9b7f-0a44-499c-8482-f19f453b658d.sql =====

CREATE OR REPLACE FUNCTION public.recompute_signup_intent(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _next text;
  _prev text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;
  _next := public.derive_signup_intent(_user_id);
  SELECT signup_intent INTO _prev FROM public.profiles WHERE id = _user_id;
  IF _prev IS DISTINCT FROM _next THEN
    UPDATE public.profiles
       SET signup_intent = _next,
           intent_evaluated_at = now(),
           intent_evaluated_by = NULL
     WHERE id = _user_id;
    BEGIN
      INSERT INTO public.admin_audit_log
        (actor_id, target_user_id, action, field, old_value, new_value, note, metadata)
      VALUES
        (_user_id, _user_id, 'intent_recomputed', 'signup_intent',
         _prev, _next, 'Automatic re-evaluation via database trigger',
         jsonb_build_object('source', 'auto'));
    EXCEPTION WHEN OTHERS THEN
      -- audit failure is non-fatal
      NULL;
    END;
  END IF;
END;
$function$;

-- ===== END SOURCE MIGRATION: 20260706045431_7f2e9b7f-0a44-499c-8482-f19f453b658d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260706045715_97c676ff-485d-46a0-a0e6-cc08a8da583d.sql =====

-- Extend recompute_signup_intent to accept trigger-source context and record it in the audit metadata.
CREATE OR REPLACE FUNCTION public.recompute_signup_intent(
  _user_id uuid,
  _trigger_source text DEFAULT NULL,
  _trigger_field text DEFAULT NULL,
  _trigger_old text DEFAULT NULL,
  _trigger_new text DEFAULT NULL,
  _trigger_entity_type text DEFAULT NULL,
  _trigger_entity_id text DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _next text;
  _prev text;
  _meta jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;
  _next := public.derive_signup_intent(_user_id);
  SELECT signup_intent INTO _prev FROM public.profiles WHERE id = _user_id;
  IF _prev IS DISTINCT FROM _next THEN
    UPDATE public.profiles
       SET signup_intent = _next,
           intent_evaluated_at = now(),
           intent_evaluated_by = NULL
     WHERE id = _user_id;

    _meta := jsonb_build_object('source', 'auto');
    IF _trigger_source IS NOT NULL THEN
      _meta := _meta || jsonb_build_object('trigger', _trigger_source);
    END IF;
    IF _trigger_field IS NOT NULL THEN
      _meta := _meta || jsonb_build_object(
        'changed_field', _trigger_field,
        'changed_old', _trigger_old,
        'changed_new', _trigger_new
      );
    END IF;

    BEGIN
      INSERT INTO public.admin_audit_log
        (actor_id, target_user_id, action, field, old_value, new_value, note,
         entity_type, entity_id, metadata)
      VALUES
        (_user_id, _user_id, 'intent_recomputed', 'signup_intent',
         _prev, _next,
         COALESCE(
           'Automatic re-evaluation via database trigger (' || _trigger_source || ')',
           'Automatic re-evaluation via database trigger'),
         _trigger_entity_type, _trigger_entity_id, _meta);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END;
$function$;

-- Profile seller_type change: capture old/new seller_type.
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
      'seller_type', NULL, NEW.seller_type,
      'profile', NEW.id::text
    );
  ELSIF NEW.seller_type IS DISTINCT FROM OLD.seller_type THEN
    PERFORM public.recompute_signup_intent(
      NEW.id,
      'seller_type_changed',
      'seller_type', OLD.seller_type, NEW.seller_type,
      'profile', NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Business ownership changes: capture which business drove it.
CREATE OR REPLACE FUNCTION public.trg_businesses_recompute_intent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_signup_intent(
      NEW.owner_id,
      'business_added',
      'owns_business', 'false', 'true',
      'business', NEW.id::text
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_signup_intent(
      OLD.owner_id,
      'business_removed',
      'owns_business', 'true', 'false',
      'business', OLD.id::text
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      PERFORM public.recompute_signup_intent(
        OLD.owner_id,
        'business_owner_changed',
        'owns_business', 'true', 'false',
        'business', OLD.id::text
      );
      PERFORM public.recompute_signup_intent(
        NEW.owner_id,
        'business_owner_changed',
        'owns_business', 'false', 'true',
        'business', NEW.id::text
      );
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Partner program referral changes: capture the referral code that drove it.
CREATE OR REPLACE FUNCTION public.trg_partners_recompute_intent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _code text;
  _uid uuid;
  _src text;
  _old_code text;
  _new_code text;
BEGIN
  _code := COALESCE(NEW.referral_code, OLD.referral_code);
  IF _code IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    _src := 'partner_added';
    _old_code := NULL;
    _new_code := NEW.referral_code;
  ELSIF TG_OP = 'DELETE' THEN
    _src := 'partner_removed';
    _old_code := OLD.referral_code;
    _new_code := NULL;
  ELSE
    _src := 'partner_updated';
    _old_code := OLD.referral_code;
    _new_code := NEW.referral_code;
  END IF;

  FOR _uid IN
    SELECT user_id FROM public.user_referrals
     WHERE credited_referral_code = _code OR first_referral_code = _code
  LOOP
    PERFORM public.recompute_signup_intent(
      _uid,
      _src,
      'referral_code', _old_code, _new_code,
      'partner_program_partner', COALESCE(NEW.id, OLD.id)::text
    );
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ===== END SOURCE MIGRATION: 20260706045715_97c676ff-485d-46a0-a0e6-cc08a8da583d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260706053153_e5511901-f040-4b61-b703-264d0911ac16.sql =====

ALTER TABLE public.sales_rep_profiles
  ADD COLUMN IF NOT EXISTS commission_rate_override numeric NULL
  CHECK (commission_rate_override IS NULL OR (commission_rate_override >= 0 AND commission_rate_override <= 1));

INSERT INTO public.site_settings (key, value, label, description)
VALUES (
  'sales_rep_commission_rate',
  '0.10',
  'Sales rep default commission rate',
  'Default commission rate applied to sales-rep-attributed revenue when no per-rep override is set. Value is a decimal fraction (e.g. 0.10 = 10%).'
)
ON CONFLICT (key) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260706053153_e5511901-f040-4b61-b703-264d0911ac16.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260706054357_10431f45-ac66-46e5-a269-94edb188c7ea.sql =====

-- Helper: auto-populate a rep's territory from their profile signup area.
-- Safe to call any time; no-op if they already have any territory or no signup area.
CREATE OR REPLACE FUNCTION public.auto_setup_sales_rep_territory(_rep_user_id uuid)
RETURNS TABLE(added boolean, region text, province text, city text, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_region text;
  v_city text;
  v_existing int;
BEGIN
  SELECT COUNT(*) INTO v_existing
  FROM public.sales_rep_territories
  WHERE rep_user_id = _rep_user_id;

  IF v_existing > 0 THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, 'already_has_territories'::text;
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(TRIM(signup_region), ''), NULLIF(TRIM(business_region), '')),
         COALESCE(NULLIF(TRIM(signup_city), ''),   NULLIF(TRIM(business_city), ''))
    INTO v_region, v_city
  FROM public.profiles
  WHERE id = _rep_user_id;

  IF v_region IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, 'no_signup_area'::text;
    RETURN;
  END IF;

  INSERT INTO public.sales_rep_territories (rep_user_id, region, province, city, is_primary)
  VALUES (_rep_user_id, v_region, NULL, v_city, true);

  RETURN QUERY SELECT true, v_region, NULL::text, v_city, 'inserted'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_setup_sales_rep_territory(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_setup_sales_rep_territory(uuid) TO authenticated, service_role;

-- Trigger: when a user gains the 'sales' role, auto-setup their territory.
CREATE OR REPLACE FUNCTION public.trg_auto_setup_sales_rep_territory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'sales' THEN
    PERFORM public.auto_setup_sales_rep_territory(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_setup_sales_rep_territory_on_role ON public.user_roles;
CREATE TRIGGER trg_auto_setup_sales_rep_territory_on_role
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_setup_sales_rep_territory();

-- ===== END SOURCE MIGRATION: 20260706054357_10431f45-ac66-46e5-a269-94edb188c7ea.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260706060958_d3327508-28b4-441c-8c04-04a1ae4ec6a3.sql =====
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
-- ===== END SOURCE MIGRATION: 20260706060958_d3327508-28b4-441c-8c04-04a1ae4ec6a3.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260707030403_7ec9381d-6c4b-4bca-899d-b4e894adb6f8.sql =====
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
-- ===== END SOURCE MIGRATION: 20260707030403_7ec9381d-6c4b-4bca-899d-b4e894adb6f8.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260707031454_7349bfbb-6ba5-415f-ba4a-63cd39c90f88.sql =====
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

-- ===== END SOURCE MIGRATION: 20260707031454_7349bfbb-6ba5-415f-ba4a-63cd39c90f88.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260707032926_14a53ed0-2a8d-464d-ace9-fd0b9348ad26.sql =====

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

-- ===== END SOURCE MIGRATION: 20260707032926_14a53ed0-2a8d-464d-ace9-fd0b9348ad26.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260707035635_7d2b1a07-5394-44db-a776-960b45aa686a.sql =====

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

-- ===== END SOURCE MIGRATION: 20260707035635_7d2b1a07-5394-44db-a776-960b45aa686a.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260707040025_b9000316-7857-4be7-b4ff-9b1401174bf6.sql =====

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

-- ===== END SOURCE MIGRATION: 20260707040025_b9000316-7857-4be7-b4ff-9b1401174bf6.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260707070949_d718892b-ccd8-45c4-a81b-058bb9b75211.sql =====

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

-- ===== END SOURCE MIGRATION: 20260707070949_d718892b-ccd8-45c4-a81b-058bb9b75211.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260707080025_262f0b57-b8aa-4af5-bab2-cfddbda4264d.sql =====

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

-- ===== END SOURCE MIGRATION: 20260707080025_262f0b57-b8aa-4af5-bab2-cfddbda4264d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260707080753_afc8dc03-a367-4712-aa1d-0cb0c4310c7b.sql =====

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

-- ===== END SOURCE MIGRATION: 20260707080753_afc8dc03-a367-4712-aa1d-0cb0c4310c7b.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260707090829_a2dc61f9-cef9-40f8-a590-f3b5b25216da.sql =====

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

-- ===== END SOURCE MIGRATION: 20260707090829_a2dc61f9-cef9-40f8-a590-f3b5b25216da.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260708014445_0fe7ee12-5ca2-4fbf-bc88-607758af62e2.sql =====
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

-- ===== END SOURCE MIGRATION: 20260708014445_0fe7ee12-5ca2-4fbf-bc88-607758af62e2.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260708120839_b73df2c1-3bad-464b-8d0e-2feef373ee6b.sql =====
ALTER TABLE public.signup_failure_events
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_message text;

CREATE INDEX IF NOT EXISTS idx_signup_failure_error_code
  ON public.signup_failure_events (error_code, created_at DESC)
  WHERE error_code IS NOT NULL;
-- ===== END SOURCE MIGRATION: 20260708120839_b73df2c1-3bad-464b-8d0e-2feef373ee6b.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260708123217_5b3e358c-e539-49de-8754-19d253503b91.sql =====

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

-- ===== END SOURCE MIGRATION: 20260708123217_5b3e358c-e539-49de-8754-19d253503b91.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260708125611_e1cfedea-54a0-4a13-b001-bd85362cc654.sql =====

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

-- ===== END SOURCE MIGRATION: 20260708125611_e1cfedea-54a0-4a13-b001-bd85362cc654.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260708153505_f6b6ac7a-c38a-43cb-be5e-2e6be4cacbd3.sql =====
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
-- ===== END SOURCE MIGRATION: 20260708153505_f6b6ac7a-c38a-43cb-be5e-2e6be4cacbd3.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260708160022_e03fc10a-b6d0-47be-b6d3-5fa49f1190a6.sql =====

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

-- ===== END SOURCE MIGRATION: 20260708160022_e03fc10a-b6d0-47be-b6d3-5fa49f1190a6.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260709023324_24974e61-13ff-43ae-bf62-3a0e6ecc181a.sql =====

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

-- ===== END SOURCE MIGRATION: 20260709023324_24974e61-13ff-43ae-bf62-3a0e6ecc181a.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260709025751_5a50c373-3640-4199-a6fc-e1fe4ebd7a9d.sql =====

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

-- ===== END SOURCE MIGRATION: 20260709025751_5a50c373-3640-4199-a6fc-e1fe4ebd7a9d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260709031605_e6ef502c-ccd3-4729-82ef-0126d7982b97.sql =====

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

-- ===== END SOURCE MIGRATION: 20260709031605_e6ef502c-ccd3-4729-82ef-0126d7982b97.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260709032120_5b7ded67-d4e9-469d-a33c-0eb42fc15732.sql =====

ALTER TABLE public.network_part_inquiries
  ADD COLUMN IF NOT EXISTS fulfilled_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS fulfilled_quantity numeric(12,2),
  ADD COLUMN IF NOT EXISTS fulfilled_eta timestamptz,
  ADD COLUMN IF NOT EXISTS fulfilled_message text;

-- ===== END SOURCE MIGRATION: 20260709032120_5b7ded67-d4e9-469d-a33c-0eb42fc15732.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260709032612_de807014-2081-45d2-aeb9-d87eaaf84cfa.sql =====

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

-- ===== END SOURCE MIGRATION: 20260709032612_de807014-2081-45d2-aeb9-d87eaaf84cfa.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260709033210_c4809a08-9c0c-4d61-ba3a-e8ac506f4506.sql =====

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

-- ===== END SOURCE MIGRATION: 20260709033210_c4809a08-9c0c-4d61-ba3a-e8ac506f4506.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260709033911_3dc415e7-4ec3-47e8-bafa-e2dc520d5f34.sql =====

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

-- ===== END SOURCE MIGRATION: 20260709033911_3dc415e7-4ec3-47e8-bafa-e2dc520d5f34.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260709034512_8a7efe1e-4333-424c-bb42-05bb9524ae1c.sql =====

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

-- ===== END SOURCE MIGRATION: 20260709034512_8a7efe1e-4333-424c-bb42-05bb9524ae1c.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260709050925_918c4bd8-4b0a-4918-8562-62b2489289d0.sql =====

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

-- ===== END SOURCE MIGRATION: 20260709050925_918c4bd8-4b0a-4918-8562-62b2489289d0.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260709060552_123adf7e-1ad8-41e9-b69a-a952324aa074.sql =====

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

-- ===== END SOURCE MIGRATION: 20260709060552_123adf7e-1ad8-41e9-b69a-a952324aa074.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260710001100_9dd483f0-8801-42c9-b17e-cce04dd856b5.sql =====

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

-- ===== END SOURCE MIGRATION: 20260710001100_9dd483f0-8801-42c9-b17e-cce04dd856b5.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260710034108_5d384337-c4aa-4b0f-9db3-10393bda2e5e.sql =====
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
-- ===== END SOURCE MIGRATION: 20260710034108_5d384337-c4aa-4b0f-9db3-10393bda2e5e.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260710034222_13379b58-1899-400b-b56d-c680b5c320fd.sql =====
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
-- ===== END SOURCE MIGRATION: 20260710034222_13379b58-1899-400b-b56d-c680b5c320fd.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260710040652_dc16ddc2-7a94-4dff-9bd2-18d0ca42895f.sql =====
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
-- ===== END SOURCE MIGRATION: 20260710040652_dc16ddc2-7a94-4dff-9bd2-18d0ca42895f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260710045307_201d3de0-c3d7-4e00-ac7a-289796cc509a.sql =====
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
-- ===== END SOURCE MIGRATION: 20260710045307_201d3de0-c3d7-4e00-ac7a-289796cc509a.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260710051539_39c40ffd-84f4-4989-af0d-330b19a37527.sql =====
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
-- ===== END SOURCE MIGRATION: 20260710051539_39c40ffd-84f4-4989-af0d-330b19a37527.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260710053418_5ad16e5f-34db-4532-9dfc-af38d4f013a1.sql =====
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
-- ===== END SOURCE MIGRATION: 20260710053418_5ad16e5f-34db-4532-9dfc-af38d4f013a1.sql =====

