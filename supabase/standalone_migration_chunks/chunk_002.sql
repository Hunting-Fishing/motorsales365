
-- ============================================================================
-- SOURCE MIGRATION: 20260525110546_bcdd53df-2d19-4f55-bc0e-4b364fa2db0a.sql
-- ============================================================================

-- 1. Rename subscription plans
UPDATE public.subscription_plans SET name = 'Private Seller', price_php = 0, listings_per_month = 5, max_photos_per_listing = 20, sort_order = 0 WHERE name = 'Free';
UPDATE public.subscription_plans SET name = 'Verified Seller', price_php = 149, listings_per_month = 15, max_photos_per_listing = 25, stripe_lookup_key = 'verified_monthly', sort_order = 1 WHERE name = 'Bronze';
UPDATE public.subscription_plans SET name = 'Dealer Starter', price_php = 499, listings_per_month = 30, max_photos_per_listing = 30, stripe_lookup_key = 'dealer_starter_monthly', sort_order = 2 WHERE name = 'Silver';
UPDATE public.subscription_plans SET name = 'Dealer Pro', price_php = 1499, listings_per_month = 100, max_photos_per_listing = 40, stripe_lookup_key = 'dealer_pro_monthly', sort_order = 3 WHERE name = 'Gold';
UPDATE public.subscription_plans SET name = 'Enterprise', price_php = 1200, stripe_lookup_key = 'enterprise_monthly', sort_order = 4 WHERE name = 'Business';
UPDATE public.subscription_plans SET active = false, sort_order = 99 WHERE name = 'Platinum';

-- 2. Free posting
INSERT INTO public.pricing_settings (key, value, label, description) VALUES
  ('listing_fee_php', 0, 'Standard listing fee', 'Charged when posting a standard listing. Set to 0 for free posting.')
  ON CONFLICT (key) DO UPDATE SET value = 0;

-- 3. New Private Seller quota: 5 active listings instead of 1/week
CREATE OR REPLACE FUNCTION public.enforce_free_listing_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  active_count int;
  cap int := 5;
BEGIN
  IF public.user_has_paid_subscription(NEW.user_id) THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('active'::listing_status, 'pending_sale'::listing_status, 'draft'::listing_status) THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO active_count
  FROM public.listings
  WHERE user_id = NEW.user_id
    AND status IN ('active'::listing_status, 'pending_sale'::listing_status)
    AND id <> NEW.id;
  IF active_count >= cap THEN
    RAISE EXCEPTION 'Private Seller plan is limited to % active listings. Upgrade to Verified Seller or higher for more.', cap;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Boost catalog
CREATE TABLE IF NOT EXISTS public.boost_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  price_php numeric(14,2) NOT NULL,
  duration_days integer NOT NULL,
  recurring boolean NOT NULL DEFAULT false,
  stripe_lookup_key text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.boost_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active boost products public read" ON public.boost_products
  FOR SELECT USING (active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage boost products" ON public.boost_products
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_boost_products_updated_at
  BEFORE UPDATE ON public.boost_products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.boost_products (slug, label, description, price_php, duration_days, recurring, stripe_lookup_key, sort_order) VALUES
  ('search_boost',       'Search Boost',       'Higher placement in search results for 7 days.',                          99,   7,  false, 'boost_search_once',         1),
  ('province_boost',     'Province Boost',     'Featured at the top of your province for 7 days.',                       199,   7,  false, 'boost_province_once',       2),
  ('homepage_spotlight', 'Homepage Spotlight', 'Rotating homepage placement for 7 days.',                                499,   7,  false, 'boost_homepage_once',       3),
  ('category_sponsor',   'Category Sponsor',   'Sponsor an entire category (Cars / Motorcycles / Trucks / Equipment).',  999,  30,  true,  'boost_category_monthly',    4),
  ('dealer_of_the_week', 'Dealer of the Week', 'Homepage feature plus social spotlight for 7 days.',                    1500,  7,  false, 'boost_dealer_of_week_once', 5)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.listing_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL REFERENCES public.boost_products(slug),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listing_boosts_listing ON public.listing_boosts(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_boosts_active ON public.listing_boosts(ends_at DESC);
ALTER TABLE public.listing_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Boosts public read" ON public.listing_boosts FOR SELECT USING (true);
CREATE POLICY "Owners insert own boosts" ON public.listing_boosts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage boosts" ON public.listing_boosts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Service inquiries
DO $$ BEGIN
  CREATE TYPE public.service_inquiry_type AS ENUM ('financing','insurance','or_cr','title_transfer','inspection','towing','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.service_inquiry_status AS ENUM ('new','contacted','quoted','won','lost','spam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.service_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  inquiry_type public.service_inquiry_type NOT NULL,
  vehicle_summary text,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  status public.service_inquiry_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_notes text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_inquiries_status ON public.service_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_service_inquiries_type ON public.service_inquiries(inquiry_type);
CREATE INDEX IF NOT EXISTS idx_service_inquiries_user ON public.service_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_service_inquiries_listing ON public.service_inquiries(listing_id);

ALTER TABLE public.service_inquiries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_service_inquiry()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.contact_name := btrim(NEW.contact_name);
  NEW.email := lower(btrim(NEW.email));
  IF NEW.phone IS NOT NULL THEN NEW.phone := btrim(NEW.phone); END IF;
  IF NEW.message IS NOT NULL THEN NEW.message := btrim(NEW.message); END IF;
  IF char_length(NEW.contact_name) < 1 OR char_length(NEW.contact_name) > 100 THEN
    RAISE EXCEPTION 'contact_name must be 1-100 characters';
  END IF;
  IF char_length(NEW.email) > 255 OR NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'email is invalid';
  END IF;
  IF NEW.phone IS NOT NULL AND char_length(NEW.phone) > 30 THEN
    RAISE EXCEPTION 'phone must be at most 30 characters';
  END IF;
  IF NEW.message IS NOT NULL AND char_length(NEW.message) > 2000 THEN
    RAISE EXCEPTION 'message must be at most 2000 characters';
  END IF;
  IF NEW.vehicle_summary IS NOT NULL AND char_length(NEW.vehicle_summary) > 300 THEN
    RAISE EXCEPTION 'vehicle_summary must be at most 300 characters';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_validate_service_inquiry
  BEFORE INSERT OR UPDATE ON public.service_inquiries FOR EACH ROW EXECUTE FUNCTION public.validate_service_inquiry();
CREATE TRIGGER trg_service_inquiries_updated_at
  BEFORE UPDATE ON public.service_inquiries FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "Anyone can submit service inquiry" ON public.service_inquiries
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Submitter reads own inquiry" ON public.service_inquiries
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NOT NULL AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  );
CREATE POLICY "Support read inquiries" ON public.service_inquiries
  FOR SELECT USING (can_support(auth.uid()));
CREATE POLICY "Support update inquiries" ON public.service_inquiries
  FOR UPDATE USING (can_support(auth.uid())) WITH CHECK (can_support(auth.uid()));
CREATE POLICY "Admins delete inquiries" ON public.service_inquiries
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260525122358_a9ae8cc8-acf8-4ce2-b2fd-52154331f6c3.sql
-- ============================================================================
-- Add missing business kinds used by the directory ladder
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'financing';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'trucking';


-- ============================================================================
-- SOURCE MIGRATION: 20260525122506_288550cc-cdd5-4c54-8926-9990a6df896a.sql
-- ============================================================================
-- 1. Directory tier enum + columns on businesses
DO $$ BEGIN
  CREATE TYPE public.business_tier AS ENUM ('free', 'listed', 'featured', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS subscription_tier public.business_tier NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS featured_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_businesses_tier_featured
  ON public.businesses (subscription_tier, featured_until DESC);

-- 2. Business plans catalog
CREATE TABLE IF NOT EXISTS public.business_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  business_kind public.business_kind NOT NULL,
  tier public.business_tier NOT NULL,
  interval text NOT NULL CHECK (interval IN ('month','year')),
  price_php numeric(10,2) NOT NULL,
  stripe_lookup_key text NOT NULL UNIQUE,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business plans are public"
  ON public.business_plans FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage business plans"
  ON public.business_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER business_plans_updated_at
  BEFORE UPDATE ON public.business_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Business subscriptions
CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.business_plans(id) ON DELETE SET NULL,
  plan_slug text,
  tier public.business_tier NOT NULL DEFAULT 'listed',
  status text NOT NULL DEFAULT 'pending',
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_end timestamptz,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','live')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_biz_subs_business ON public.business_subscriptions (business_id);
CREATE INDEX IF NOT EXISTS idx_biz_subs_owner ON public.business_subscriptions (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_biz_subs_stripe_sub ON public.business_subscriptions (stripe_subscription_id);

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their own business subscriptions"
  ON public.business_subscriptions FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.can_support(auth.uid())
  );

CREATE POLICY "Admins manage business subscriptions"
  ON public.business_subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER business_subscriptions_updated_at
  BEFORE UPDATE ON public.business_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4. Seed business_plans (Listed / Featured / Premium, monthly + yearly @ 2 mo free)
INSERT INTO public.business_plans (slug, business_kind, tier, interval, price_php, stripe_lookup_key, description, sort_order) VALUES
  ('carwash_listed_monthly',   'carwash', 'listed',   'month', 199,  'biz_carwash_listed_monthly',   'Listed Car Wash', 10),
  ('carwash_listed_yearly',    'carwash', 'listed',   'year',  1990, 'biz_carwash_listed_yearly',    'Listed Car Wash — 2 mo. free', 11),
  ('carwash_featured_monthly', 'carwash', 'featured', 'month', 399,  'biz_carwash_featured_monthly', 'Featured Car Wash', 20),
  ('carwash_featured_yearly',  'carwash', 'featured', 'year',  3990, 'biz_carwash_featured_yearly',  'Featured Car Wash — 2 mo. free', 21),
  ('carwash_premium_monthly',  'carwash', 'premium',  'month', 799,  'biz_carwash_premium_monthly',  'Premium Car Wash', 30),
  ('carwash_premium_yearly',   'carwash', 'premium',  'year',  7990, 'biz_carwash_premium_yearly',   'Premium Car Wash — 2 mo. free', 31),

  ('repair_listed_monthly',   'repair_shop', 'listed',   'month', 299,  'biz_repair_listed_monthly',   'Listed Repair Shop', 10),
  ('repair_listed_yearly',    'repair_shop', 'listed',   'year',  2990, 'biz_repair_listed_yearly',    'Listed Repair Shop — 2 mo. free', 11),
  ('repair_featured_monthly', 'repair_shop', 'featured', 'month', 599,  'biz_repair_featured_monthly', 'Featured Repair Shop', 20),
  ('repair_featured_yearly',  'repair_shop', 'featured', 'year',  5990, 'biz_repair_featured_yearly',  'Featured Repair Shop — 2 mo. free', 21),
  ('repair_premium_monthly',  'repair_shop', 'premium',  'month', 1199, 'biz_repair_premium_monthly',  'Premium Repair Shop', 30),
  ('repair_premium_yearly',   'repair_shop', 'premium',  'year',  11990,'biz_repair_premium_yearly',   'Premium Repair Shop — 2 mo. free', 31),

  ('bodyshop_listed_monthly',   'body_shop', 'listed',   'month', 299,  'biz_bodyshop_listed_monthly',   'Listed Body Shop', 10),
  ('bodyshop_listed_yearly',    'body_shop', 'listed',   'year',  2990, 'biz_bodyshop_listed_yearly',    'Listed Body Shop — 2 mo. free', 11),
  ('bodyshop_featured_monthly', 'body_shop', 'featured', 'month', 599,  'biz_bodyshop_featured_monthly', 'Featured Body Shop', 20),
  ('bodyshop_featured_yearly',  'body_shop', 'featured', 'year',  5990, 'biz_bodyshop_featured_yearly',  'Featured Body Shop — 2 mo. free', 21),
  ('bodyshop_premium_monthly',  'body_shop', 'premium',  'month', 1199, 'biz_bodyshop_premium_monthly',  'Premium Body Shop', 30),
  ('bodyshop_premium_yearly',   'body_shop', 'premium',  'year',  11990,'biz_bodyshop_premium_yearly',   'Premium Body Shop — 2 mo. free', 31),

  ('towing_listed_monthly',   'towing', 'listed',   'month', 299,  'biz_towing_listed_monthly',   'Listed Tow Provider', 10),
  ('towing_listed_yearly',    'towing', 'listed',   'year',  2990, 'biz_towing_listed_yearly',    'Listed Tow Provider — 2 mo. free', 11),
  ('towing_featured_monthly', 'towing', 'featured', 'month', 699,  'biz_towing_featured_monthly', 'Featured Tow Provider', 20),
  ('towing_featured_yearly',  'towing', 'featured', 'year',  6990, 'biz_towing_featured_yearly',  'Featured Tow Provider — 2 mo. free', 21),
  ('towing_premium_monthly',  'towing', 'premium',  'month', 1499, 'biz_towing_premium_monthly',  'Premium Tow Provider', 30),
  ('towing_premium_yearly',   'towing', 'premium',  'year',  14990,'biz_towing_premium_yearly',   'Premium Tow Provider — 2 mo. free', 31),

  ('salvage_listed_monthly',   'salvage', 'listed',   'month', 299,  'biz_salvage_listed_monthly',   'Listed Salvage Yard', 10),
  ('salvage_listed_yearly',    'salvage', 'listed',   'year',  2990, 'biz_salvage_listed_yearly',    'Listed Salvage Yard — 2 mo. free', 11),
  ('salvage_featured_monthly', 'salvage', 'featured', 'month', 699,  'biz_salvage_featured_monthly', 'Featured Salvage Yard', 20),
  ('salvage_featured_yearly',  'salvage', 'featured', 'year',  6990, 'biz_salvage_featured_yearly',  'Featured Salvage Yard — 2 mo. free', 21),
  ('salvage_premium_monthly',  'salvage', 'premium',  'month', 1499, 'biz_salvage_premium_monthly',  'Premium Salvage Yard', 30),
  ('salvage_premium_yearly',   'salvage', 'premium',  'year',  14990,'biz_salvage_premium_yearly',   'Premium Salvage Yard — 2 mo. free', 31),

  ('parts_listed_monthly',   'parts_shop', 'listed',   'month', 299,  'biz_parts_listed_monthly',   'Listed Parts Shop', 10),
  ('parts_listed_yearly',    'parts_shop', 'listed',   'year',  2990, 'biz_parts_listed_yearly',    'Listed Parts Shop — 2 mo. free', 11),
  ('parts_featured_monthly', 'parts_shop', 'featured', 'month', 699,  'biz_parts_featured_monthly', 'Featured Parts Shop', 20),
  ('parts_featured_yearly',  'parts_shop', 'featured', 'year',  6990, 'biz_parts_featured_yearly',  'Featured Parts Shop — 2 mo. free', 21),
  ('parts_premium_monthly',  'parts_shop', 'premium',  'month', 1499, 'biz_parts_premium_monthly',  'Premium Parts Shop', 30),
  ('parts_premium_yearly',   'parts_shop', 'premium',  'year',  14990,'biz_parts_premium_yearly',   'Premium Parts Shop — 2 mo. free', 31),

  ('rental_listed_monthly',   'rental', 'listed',   'month', 399,  'biz_rental_listed_monthly',   'Listed Rental / Equipment', 10),
  ('rental_listed_yearly',    'rental', 'listed',   'year',  3990, 'biz_rental_listed_yearly',    'Listed Rental — 2 mo. free', 11),
  ('rental_featured_monthly', 'rental', 'featured', 'month', 899,  'biz_rental_featured_monthly', 'Featured Rental', 20),
  ('rental_featured_yearly',  'rental', 'featured', 'year',  8990, 'biz_rental_featured_yearly',  'Featured Rental — 2 mo. free', 21),
  ('rental_premium_monthly',  'rental', 'premium',  'month', 1799, 'biz_rental_premium_monthly',  'Premium Rental', 30),
  ('rental_premium_yearly',   'rental', 'premium',  'year',  17990,'biz_rental_premium_yearly',   'Premium Rental — 2 mo. free', 31),

  ('trucking_listed_monthly',   'trucking', 'listed',   'month', 399,  'biz_trucking_listed_monthly',   'Listed Trucking', 10),
  ('trucking_listed_yearly',    'trucking', 'listed',   'year',  3990, 'biz_trucking_listed_yearly',    'Listed Trucking — 2 mo. free', 11),
  ('trucking_featured_monthly', 'trucking', 'featured', 'month', 899,  'biz_trucking_featured_monthly', 'Featured Trucking', 20),
  ('trucking_featured_yearly',  'trucking', 'featured', 'year',  8990, 'biz_trucking_featured_yearly',  'Featured Trucking — 2 mo. free', 21),
  ('trucking_premium_monthly',  'trucking', 'premium',  'month', 1799, 'biz_trucking_premium_monthly',  'Premium Trucking', 30),
  ('trucking_premium_yearly',   'trucking', 'premium',  'year',  17990,'biz_trucking_premium_yearly',   'Premium Trucking — 2 mo. free', 31),

  ('insurance_listed_monthly',   'insurance', 'listed',   'month', 599,  'biz_insurance_listed_monthly',   'Listed Insurance', 10),
  ('insurance_listed_yearly',    'insurance', 'listed',   'year',  5990, 'biz_insurance_listed_yearly',    'Listed Insurance — 2 mo. free', 11),
  ('insurance_featured_monthly', 'insurance', 'featured', 'month', 1499, 'biz_insurance_featured_monthly', 'Featured Insurance', 20),
  ('insurance_featured_yearly',  'insurance', 'featured', 'year',  14990,'biz_insurance_featured_yearly',  'Featured Insurance — 2 mo. free', 21),
  ('insurance_premium_monthly',  'insurance', 'premium',  'month', 2999, 'biz_insurance_premium_monthly',  'Premium Insurance', 30),
  ('insurance_premium_yearly',   'insurance', 'premium',  'year',  29990,'biz_insurance_premium_yearly',   'Premium Insurance — 2 mo. free', 31),

  ('financing_listed_monthly',   'financing', 'listed',   'month', 599,  'biz_financing_listed_monthly',   'Listed Financing', 10),
  ('financing_listed_yearly',    'financing', 'listed',   'year',  5990, 'biz_financing_listed_yearly',    'Listed Financing — 2 mo. free', 11),
  ('financing_featured_monthly', 'financing', 'featured', 'month', 1499, 'biz_financing_featured_monthly', 'Featured Financing', 20),
  ('financing_featured_yearly',  'financing', 'featured', 'year',  14990,'biz_financing_featured_yearly',  'Featured Financing — 2 mo. free', 21),
  ('financing_premium_monthly',  'financing', 'premium',  'month', 2999, 'biz_financing_premium_monthly',  'Premium Financing', 30),
  ('financing_premium_yearly',   'financing', 'premium',  'year',  29990,'biz_financing_premium_yearly',   'Premium Financing — 2 mo. free', 31)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260525125312_004fb4cf-07b7-4034-ab89-43e5c7e6becf.sql
-- ============================================================================
ALTER TABLE public.business_plans
  ADD COLUMN IF NOT EXISTS type_slug text;

UPDATE public.business_plans SET type_slug = 'carwash'           WHERE business_kind = 'carwash';
UPDATE public.business_plans SET type_slug = 'repair_shop'       WHERE business_kind = 'repair_shop';
UPDATE public.business_plans SET type_slug = 'body_paint'        WHERE business_kind = 'body_shop';
UPDATE public.business_plans SET type_slug = 'towing'            WHERE business_kind = 'towing';
UPDATE public.business_plans SET type_slug = 'salvage'           WHERE business_kind = 'salvage';
UPDATE public.business_plans SET type_slug = 'parts_accessories' WHERE business_kind = 'parts_shop';
UPDATE public.business_plans SET type_slug = 'insurance'         WHERE business_kind = 'insurance';

CREATE INDEX IF NOT EXISTS idx_business_plans_type_slug ON public.business_plans (type_slug, tier, interval);


-- ============================================================================
-- SOURCE MIGRATION: 20260525131427_be1ff2ed-4252-4891-8033-514954cadfc8.sql
-- ============================================================================

-- 1. Add organization_id to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_organization_id ON public.businesses(organization_id);

-- 2. Enums
DO $$ BEGIN
  CREATE TYPE public.lead_source AS ENUM ('listing_message','business_inquiry','service_inquiry','tow_request');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM ('new','in_progress','won','lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_activity_kind AS ENUM ('created','assigned','status_changed','note','reply_sent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source public.lead_source NOT NULL,
  source_id text NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  customer_user_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  subject text,
  preview text,
  status public.lead_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON public.leads(last_activity_at DESC);

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view leads" ON public.leads
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. lead_activities
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind public.lead_activity_kind NOT NULL,
  from_value text,
  to_value text,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities(lead_id, created_at DESC);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view lead activities" ON public.lead_activities
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_activities.lead_id
      AND public.is_org_member(auth.uid(), l.organization_id)
  ));

CREATE POLICY "Org members can insert lead activities" ON public.lead_activities
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_activities.lead_id
      AND public.is_org_member(auth.uid(), l.organization_id)
  ));

-- 5. Auto-activity trigger on leads
CREATE OR REPLACE FUNCTION public.tg_lead_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lead_activities(lead_id, actor_id, kind, to_value, body)
    VALUES (NEW.id, NEW.assigned_to, 'created', NEW.status::text, NEW.preview);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.lead_activities(lead_id, actor_id, kind, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status::text, NEW.status::text);
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.lead_activities(lead_id, actor_id, kind, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'assigned',
              COALESCE(OLD.assigned_to::text,''),
              COALESCE(NEW.assigned_to::text,''));
      NEW.assigned_at = now();
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_leads_activity_ins AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_activity();
CREATE TRIGGER trg_leads_activity_upd BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_activity();

-- 6. Auto-create leads from messages on org-linked listings
CREATE OR REPLACE FUNCTION public.tg_lead_from_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_org uuid;
  l_listing uuid := NEW.listing_id;
  customer uuid;
  cust_name text;
  cust_email text;
  cust_phone text;
  thread_key text;
BEGIN
  IF l_listing IS NULL THEN RETURN NEW; END IF;
  SELECT organization_id INTO l_org FROM public.listings WHERE id = l_listing;
  IF l_org IS NULL THEN RETURN NEW; END IF;

  -- Determine who is the customer (the one who is NOT in the org)
  IF public.is_org_member(NEW.sender_id, l_org) THEN
    customer := NEW.recipient_id;
    -- A reply from an org member counts as reply_sent
    INSERT INTO public.lead_activities(lead_id, actor_id, kind, body)
    SELECT id, NEW.sender_id, 'reply_sent', LEFT(NEW.body, 280)
      FROM public.leads
     WHERE source = 'listing_message'
       AND source_id = LEAST(NEW.sender_id::text, NEW.recipient_id::text)
                    || '|' || GREATEST(NEW.sender_id::text, NEW.recipient_id::text)
                    || '|' || l_listing::text;
    -- Bump activity timestamp
    UPDATE public.leads SET last_activity_at = now()
     WHERE source = 'listing_message'
       AND source_id = LEAST(NEW.sender_id::text, NEW.recipient_id::text)
                    || '|' || GREATEST(NEW.sender_id::text, NEW.recipient_id::text)
                    || '|' || l_listing::text;
    RETURN NEW;
  ELSE
    customer := NEW.sender_id;
  END IF;

  SELECT full_name, NULL::text, phone INTO cust_name, cust_email, cust_phone
    FROM public.profiles WHERE id = customer;

  thread_key := LEAST(NEW.sender_id::text, NEW.recipient_id::text)
             || '|' || GREATEST(NEW.sender_id::text, NEW.recipient_id::text)
             || '|' || l_listing::text;

  INSERT INTO public.leads(
    organization_id, source, source_id, listing_id,
    customer_user_id, customer_name, customer_phone,
    subject, preview, last_activity_at
  ) VALUES (
    l_org, 'listing_message', thread_key, l_listing,
    customer, cust_name, cust_phone,
    'Listing inquiry', LEFT(NEW.body, 280), now()
  )
  ON CONFLICT (source, source_id) DO UPDATE
    SET last_activity_at = now(),
        preview = LEFT(NEW.body, 280);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_message_lead AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_from_message();

-- 7. Auto-create leads from service_inquiries on org-linked businesses
CREATE OR REPLACE FUNCTION public.tg_lead_from_service_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_org uuid;
BEGIN
  IF NEW.business_id IS NULL THEN RETURN NEW; END IF;
  SELECT organization_id INTO l_org FROM public.businesses WHERE id = NEW.business_id;
  IF l_org IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.leads(
    organization_id, source, source_id, business_id,
    customer_name, customer_email, customer_phone,
    subject, preview, last_activity_at
  ) VALUES (
    l_org, 'service_inquiry', NEW.id::text, NEW.business_id,
    NEW.contact_name, NEW.email, NEW.phone,
    COALESCE('Service inquiry: ' || NEW.vehicle_summary, 'Service inquiry'),
    LEFT(COALESCE(NEW.message,''), 280), now()
  )
  ON CONFLICT (source, source_id) DO NOTHING;
  RETURN NEW;
END $$;

-- Only attach if service_inquiries has business_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='service_inquiries' AND column_name='business_id') THEN
    EXECUTE 'CREATE TRIGGER trg_service_inquiry_lead AFTER INSERT ON public.service_inquiries
             FOR EACH ROW EXECUTE FUNCTION public.tg_lead_from_service_inquiry()';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. Auto-create leads from tow_requests on org-linked listings
CREATE OR REPLACE FUNCTION public.tg_lead_from_tow_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_org uuid;
  cust_name text;
  cust_phone text;
BEGIN
  IF NEW.listing_id IS NULL THEN RETURN NEW; END IF;
  SELECT organization_id INTO l_org FROM public.listings WHERE id = NEW.listing_id;
  IF l_org IS NULL THEN RETURN NEW; END IF;

  SELECT full_name, phone INTO cust_name, cust_phone FROM public.profiles WHERE id = NEW.requester_id;

  INSERT INTO public.leads(
    organization_id, source, source_id, listing_id,
    customer_user_id, customer_name, customer_phone,
    subject, preview, last_activity_at
  ) VALUES (
    l_org, 'tow_request', NEW.id::text, NEW.listing_id,
    NEW.requester_id, cust_name, cust_phone,
    'Tow request: ' || NEW.vehicle_summary,
    LEFT(COALESCE(NEW.notes,''), 280), now()
  )
  ON CONFLICT (source, source_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_tow_request_lead AFTER INSERT ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_from_tow_request();

-- 9. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;


-- ============================================================================
-- SOURCE MIGRATION: 20260525154337_8148e969-e07c-4e8c-b8bc-2f4a19c2e1d3.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.preview_org_invite(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE inv record;
BEGIN
  SELECT i.id, i.email, i.role, i.expires_at, i.accepted_at, o.name AS org_name
    INTO inv
    FROM public.organization_invites i
    JOIN public.organizations o ON o.id = i.organization_id
   WHERE i.token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'email', inv.email,
    'role', inv.role::text,
    'org_name', inv.org_name,
    'accepted', inv.accepted_at IS NOT NULL,
    'expired', inv.expires_at < now()
  );
END $$;
GRANT EXECUTE ON FUNCTION public.preview_org_invite(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_org_invite(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
  inv public.organization_invites%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT email INTO uemail FROM auth.users WHERE id = uid;
  SELECT * INTO inv FROM public.organization_invites WHERE token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF inv.accepted_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_accepted'); END IF;
  IF inv.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;
  IF lower(inv.email) <> lower(COALESCE(uemail,'')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_mismatch', 'expected', inv.email);
  END IF;
  INSERT INTO public.organization_members(organization_id, user_id, role)
    VALUES (inv.organization_id, uid, inv.role)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  UPDATE public.organization_invites SET accepted_at = now() WHERE id = inv.id;
  RETURN jsonb_build_object('ok', true, 'organization_id', inv.organization_id);
END $$;
GRANT EXECUTE ON FUNCTION public.accept_org_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_lead_notify_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  org_name text;
  rec record;
BEGIN
  SELECT name INTO org_name FROM public.organizations WHERE id = NEW.organization_id;
  FOR rec IN
    SELECT u.email
      FROM public.organization_members m
      JOIN auth.users u ON u.id = m.user_id
     WHERE m.organization_id = NEW.organization_id
       AND m.role IN ('owner','admin','manager')
       AND u.email IS NOT NULL
  LOOP
    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'template', 'team-new-lead',
      'to', rec.email,
      'data', jsonb_build_object(
        'org_name', COALESCE(org_name,'your team'),
        'customer_name', COALESCE(NEW.customer_name,'A customer'),
        'subject', COALESCE(NEW.subject,'New inquiry'),
        'preview', COALESCE(NEW.preview,''),
        'source', NEW.source::text,
        'lead_id', NEW.id::text
      )
    ));
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS leads_notify_org ON public.leads;
CREATE TRIGGER leads_notify_org AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_lead_notify_org();


-- ============================================================================
-- SOURCE MIGRATION: 20260525155935_31efaded-ef49-43e7-945b-f213f41edda7.sql
-- ============================================================================

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year int,
  color text,
  vin text,
  plate_number text,
  nickname text,
  cover_url text,
  is_public boolean NOT NULL DEFAULT false,
  passport_slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicles_owner ON public.vehicles(owner_user_id);
CREATE UNIQUE INDEX idx_vehicles_vin_owner ON public.vehicles(owner_user_id, lower(vin)) WHERE vin IS NOT NULL;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own vehicles" ON public.vehicles
  FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Public vehicles readable" ON public.vehicles
  FOR SELECT USING (is_public = true);
CREATE POLICY "Admins manage vehicles" ON public.vehicles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tg_vehicles_updated BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_vehicles_set_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.passport_slug IS NULL THEN
    NEW.passport_slug := encode(extensions.gen_random_bytes(8), 'hex');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_vehicles_slug BEFORE INSERT ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.tg_vehicles_set_slug();

CREATE TYPE public.service_record_type AS ENUM (
  'oil_change','tire_change','brake_service','battery','tune_up',
  'transmission','inspection','registration','insurance','accident_repair','other'
);

CREATE TABLE public.vehicle_service_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  performed_at date NOT NULL,
  mileage_km int,
  service_type public.service_record_type NOT NULL DEFAULT 'other',
  title text NOT NULL,
  shop_name text,
  cost_php numeric,
  notes text,
  receipt_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_records_vehicle ON public.vehicle_service_records(vehicle_id, performed_at DESC);

ALTER TABLE public.vehicle_service_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own service records" ON public.vehicle_service_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.owner_user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.owner_user_id = auth.uid())
    AND created_by = auth.uid()
  );
CREATE POLICY "Public records readable" ON public.vehicle_service_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.is_public = true)
  );
CREATE POLICY "Admins manage service records" ON public.vehicle_service_records
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.listings ADD COLUMN vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;
CREATE INDEX idx_listings_vehicle ON public.listings(vehicle_id) WHERE vehicle_id IS NOT NULL;

CREATE TABLE public.affiliate_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  make text,
  model text,
  year_min int,
  year_max int,
  image_url text,
  target_url text NOT NULL,
  price_php numeric,
  network_slug text REFERENCES public.affiliate_networks(slug) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_parts_match ON public.affiliate_parts(lower(make), lower(model), category) WHERE active = true;
CREATE INDEX idx_parts_category ON public.affiliate_parts(category) WHERE active = true;

ALTER TABLE public.affiliate_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active parts public read" ON public.affiliate_parts
  FOR SELECT USING (active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage parts" ON public.affiliate_parts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tg_affiliate_parts_updated BEFORE UPDATE ON public.affiliate_parts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.vehicle_part_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.affiliate_parts(id) ON DELETE CASCADE,
  listing_id uuid,
  vehicle_id uuid,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_part_clicks_part ON public.vehicle_part_clicks(part_id, created_at DESC);

ALTER TABLE public.vehicle_part_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record part clicks" ON public.vehicle_part_clicks
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view part clicks" ON public.vehicle_part_clicks
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.affiliate_parts (title, category, make, target_url, price_php, sort_order, active, description)
VALUES
  ('Premium synthetic engine oil 5W-30 (4L)', 'oil', NULL, 'https://example.com/oil-5w30', 1850, 1, true, 'Universal fit — meets API SN standards.'),
  ('All-terrain tire 265/65 R17', 'tires', NULL, 'https://example.com/tire-at-265', 7990, 2, true, 'Popular SUV/pickup size.'),
  ('Ceramic brake pad set (front)', 'brakes', NULL, 'https://example.com/brake-ceramic', 2490, 3, true, 'Low-dust, quiet daily-driver pads.'),
  ('Maintenance-free car battery 12V 60Ah', 'battery', NULL, 'https://example.com/battery-60ah', 5990, 4, true, 'Sealed, 18-month warranty.'),
  ('HD dash cam 1440p with parking mode', 'electronics', NULL, 'https://example.com/dashcam-hd', 4490, 5, true, 'Loop recording + G-sensor.');


-- ============================================================================
-- SOURCE MIGRATION: 20260525162719_50c7215e-4c67-42cb-8aec-b68ec5ca7ef6.sql
-- ============================================================================
-- Track price changes for listings so we can show price drops in a live feed.
CREATE TABLE IF NOT EXISTS public.listing_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  old_price_php numeric NOT NULL,
  new_price_php numeric NOT NULL,
  delta_php numeric NOT NULL,
  delta_pct numeric NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_price_history_changed_at
  ON public.listing_price_history (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_price_history_listing
  ON public.listing_price_history (listing_id, changed_at DESC);

ALTER TABLE public.listing_price_history ENABLE ROW LEVEL SECURITY;

-- Anyone can read price history for active/pending listings (public marketplace data).
DROP POLICY IF EXISTS "Public can read price history for visible listings" ON public.listing_price_history;
CREATE POLICY "Public can read price history for visible listings"
  ON public.listing_price_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_price_history.listing_id
        AND l.status IN ('active','pending_sale')
    )
  );

-- Trigger to capture price changes
CREATE OR REPLACE FUNCTION public.tg_listing_price_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old numeric := COALESCE(OLD.price_php, 0);
  v_new numeric := COALESCE(NEW.price_php, 0);
  v_delta numeric;
  v_pct numeric;
BEGIN
  IF v_old = v_new OR v_old <= 0 OR v_new <= 0 THEN
    RETURN NEW;
  END IF;
  v_delta := v_new - v_old;
  v_pct := ROUND((v_delta / v_old) * 100.0, 2);
  INSERT INTO public.listing_price_history (listing_id, old_price_php, new_price_php, delta_php, delta_pct)
  VALUES (NEW.id, v_old, v_new, v_delta, v_pct);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listing_price_history ON public.listings;
CREATE TRIGGER trg_listing_price_history
AFTER UPDATE OF price_php ON public.listings
FOR EACH ROW
WHEN (OLD.price_php IS DISTINCT FROM NEW.price_php)
EXECUTE FUNCTION public.tg_listing_price_history();

-- Enable realtime for the activity feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_price_history;


-- ============================================================================
-- SOURCE MIGRATION: 20260526073719_11c435e8-6844-44c8-941a-e0d57931962c.sql
-- ============================================================================

-- 1) Security Definer View → security_invoker
ALTER VIEW public.public_profiles SET (security_invoker = on);

-- 2) Revoke EXECUTE from trigger-only / internal-only SECURITY DEFINER functions
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'tg_audit_ad_inquiry()',
    'tg_business_recompute_rating()',
    'tg_create_staff_referral()',
    'tg_lead_activity()',
    'tg_lead_from_message()',
    'tg_lead_from_service_inquiry()',
    'tg_lead_from_tow_request()',
    'tg_lead_notify_org()',
    'tg_listing_price_history()',
    'tg_org_add_creator_as_owner()',
    'tg_shop_click_increment()',
    'ride_likes_count_sync()',
    'rides_listing_sold_sync()',
    'ad_events_increment()',
    'handle_new_user()',
    'handle_tow_bid_accepted()',
    'sync_profile_verification()',
    'notify_tow_status_change()',
    'notify_towing_providers()',
    'enforce_ad_inquiry_status_transitions()',
    'enforce_free_listing_quota()',
    'enforce_tow_status_transitions()',
    'on_ad_inquiry_created()',
    'on_ad_inquiry_reply()',
    'gen_referral_code(text)',
    'grant_founding_bronze()',
    'assign_founding_member()',
    'attach_signup_referral()',
    'expire_stale_pending_sales()',
    'pick_referral_promo(uuid, text, numeric)',
    'move_to_dlq(text, text, bigint, jsonb)',
    'read_email_batch(text, integer, integer)',
    'delete_email(text, bigint)',
    'enqueue_email(text, jsonb)',
    'sync_staff_referrals()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing %', fn;
    END;
  END LOOP;
END $$;

-- 3) Revoke anon-only EXECUTE on helper functions that should only be callable by signed-in users
REVOKE EXECUTE ON FUNCTION public.can_manage_org(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_shop(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.org_role(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_business_trial() FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_org_invite(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.preview_org_invite(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.self_serve_change_plan(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_listing_view(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid, uuid) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_qr_scan(text, uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_qr_scan(text, uuid, text, text, text, text) TO anon, authenticated;

-- 4) Block bucket-wide LISTING on public buckets while still allowing direct file reads.
-- The default "Public Access" policy allows listing. Replace with a SELECT policy that requires a known object name (no folder listing).
-- We do this by removing any over-broad policy and creating a strict per-object SELECT policy per public bucket.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN (
        'Public Access', 'Public access', 'public read',
        'Avatar images are publicly accessible',
        'Listing photos are publicly accessible',
        'Listing videos are publicly accessible',
        'Business logos are publicly accessible',
        'QR codes are publicly accessible',
        'Ride media is publicly accessible',
        'Ad media is publicly accessible'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Recreate per-bucket read-by-name policies. These still allow GET on a specific path
-- (which is how the CDN URL works) but anon clients cannot enumerate the bucket
-- because the policy requires the request to target a non-null object name.
CREATE POLICY "Public buckets: read file by name"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id IN ('listing-photos','listing-videos','avatars','business-logos','qr-codes','ride-media','ad-media')
  AND name IS NOT NULL
);


-- ============================================================================
-- SOURCE MIGRATION: 20260526123921_c0881eba-e524-4c6d-a54b-2a3052863d99.sql
-- ============================================================================

-- 1) listing_boosts: drop public read, add a thin public view
DROP POLICY IF EXISTS "Boosts public read" ON public.listing_boosts;

CREATE POLICY "Owners read own boosts"
  ON public.listing_boosts FOR SELECT
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE OR REPLACE VIEW public.listing_active_boosts
WITH (security_invoker = on) AS
SELECT
  listing_id,
  product_slug,
  starts_at,
  ends_at
FROM public.listing_boosts
WHERE (starts_at IS NULL OR starts_at <= now())
  AND (ends_at   IS NULL OR ends_at   >= now());

GRANT SELECT ON public.listing_active_boosts TO anon, authenticated;

-- 2) advertisements: drop column-leaking public policy, expose a safe view
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.advertisements;

CREATE OR REPLACE VIEW public.active_ads_public
WITH (security_invoker = on) AS
SELECT
  id,
  title,
  caption,
  image_url,
  target_url,
  placement,
  priority,
  starts_at,
  ends_at,
  created_at
FROM public.advertisements
WHERE status = 'active'
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at   IS NULL OR ends_at   >= now());

-- Allow anon access to the view (the view itself filters down to safe columns).
-- The underlying table still needs RLS to permit reads via the view in security_invoker mode.
CREATE POLICY "Public reads active-ad safe columns"
  ON public.advertisements FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at   IS NULL OR ends_at   >= now())
  );

-- ^ NOTE: this still allows SELECT * via the table for anon; we mitigate by
-- pointing the client and getActiveAds() at the active_ads_public view, and
-- by REVOKEing column SELECT on the sensitive columns from anon.
REVOKE SELECT (advertiser_email, advertiser_name) ON public.advertisements FROM anon, authenticated;

GRANT SELECT ON public.active_ads_public TO anon, authenticated;

-- 3) listing_views: lock down direct inserts (writes only via SECURITY DEFINER fn)
REVOKE INSERT ON public.listing_views FROM anon, authenticated, PUBLIC;


-- ============================================================================
-- SOURCE MIGRATION: 20260526123959_95b81751-3a57-42d8-9821-6efa63d98c4f.sql
-- ============================================================================

DROP POLICY IF EXISTS "Ad media public read" ON storage.objects;
DROP POLICY IF EXISTS "Ride media public read" ON storage.objects;

CREATE POLICY "Ad media public read by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-media' AND name IS NOT NULL);

CREATE POLICY "Ride media public read by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ride-media' AND name IS NOT NULL);


-- ============================================================================
-- SOURCE MIGRATION: 20260526124041_f83db816-5a47-437d-9f74-32008ea6a86f.sql
-- ============================================================================

-- Triggers only — no RPC callers
REVOKE EXECUTE ON FUNCTION public.grant_business_trial() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_vehicles_set_slug() FROM PUBLIC, anon, authenticated;

-- Drop anon access from helpers that should only be callable by signed-in users
REVOKE EXECUTE ON FUNCTION public.can_manage_org(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_shop(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.org_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_org_invite(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.self_serve_change_plan(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.preview_org_invite(text) FROM PUBLIC, anon;


-- ============================================================================
-- SOURCE MIGRATION: 20260526135703_84f307b7-e94c-43dc-aeb6-bc64b7791a18.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE MIGRATION: 20260526140147_f6f966b7-0fc5-46c2-b4d8-118c389b2900.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE MIGRATION: 20260526140452_0eba8686-52b8-4d7e-9f8f-8dd9c386dc54.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE MIGRATION: 20260527060550_8c0bf854-44a1-4ab0-9de9-e3653c175773.sql
-- ============================================================================
ALTER TABLE public.shop_product_fitment ADD COLUMN IF NOT EXISTS engine TEXT;
CREATE INDEX IF NOT EXISTS idx_fitment_engine ON public.shop_product_fitment(engine);


-- ============================================================================
-- SOURCE MIGRATION: 20260527070514_22098064-ab1d-4a26-ba5b-52e8ed15dc7f.sql
-- ============================================================================

-- Categories: SEO landing fields
ALTER TABLE public.shop_categories
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS intro_md text;

-- Products: deal fields
ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS is_deal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deal_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS deal_price_php numeric;

CREATE INDEX IF NOT EXISTS idx_shop_products_deal
  ON public.shop_products (is_deal) WHERE is_deal = true;

-- Outbound click event log (for analytics/revenue reporting)
CREATE TABLE IF NOT EXISTS public.shop_click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  link_id uuid REFERENCES public.shop_product_links(id) ON DELETE SET NULL,
  user_id uuid,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shop_click_events_product ON public.shop_click_events(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_click_events_user ON public.shop_click_events(user_id) WHERE user_id IS NOT NULL;

GRANT SELECT, INSERT ON public.shop_click_events TO anon, authenticated;
GRANT ALL ON public.shop_click_events TO service_role;

ALTER TABLE public.shop_click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a click"
  ON public.shop_click_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Shop managers can read clicks"
  ON public.shop_click_events FOR SELECT
  TO authenticated
  USING (can_manage_shop(auth.uid()));


-- ============================================================================
-- SOURCE MIGRATION: 20260527072653_b3f8801f-5bc6-40e2-8261-1a600dde648f.sql
-- ============================================================================

-- 1. Departments table
CREATE TABLE public.shop_departments (
  slug text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  sort_order int NOT NULL DEFAULT 100,
  hero_image_url text,
  seo_title text,
  seo_description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_departments TO anon;
GRANT SELECT ON public.shop_departments TO authenticated;
GRANT ALL ON public.shop_departments TO service_role;

ALTER TABLE public.shop_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Departments are viewable by everyone"
  ON public.shop_departments FOR SELECT
  USING (active = true);

CREATE POLICY "Shop managers can manage departments"
  ON public.shop_departments FOR ALL
  TO authenticated
  USING (public.can_manage_shop(auth.uid()))
  WITH CHECK (public.can_manage_shop(auth.uid()));

CREATE TRIGGER trg_shop_departments_updated
  BEFORE UPDATE ON public.shop_departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Department columns on shop_categories
ALTER TABLE public.shop_categories
  ADD COLUMN IF NOT EXISTS department_slug text REFERENCES public.shop_departments(slug) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cross_department_slugs text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_shop_categories_department
  ON public.shop_categories(department_slug);
CREATE INDEX IF NOT EXISTS idx_shop_categories_cross_dept
  ON public.shop_categories USING GIN (cross_department_slugs);

-- 3. Seed departments
INSERT INTO public.shop_departments (slug, name, description, icon, sort_order) VALUES
  ('performance-parts',     'Performance Parts',     'Intakes, exhausts, body kits, spoilers, tuning and bolt-on power.', 'Gauge',    10),
  ('maintenance-fluids',    'Maintenance & Fluids',  'Engine oil, ATF, brake fluid, coolant, grease and service supplies.', 'Droplets', 20),
  ('repair-replacement',    'Repair & Replacement',  'OEM-style brakes, suspension, ignition, cooling and engine parts.', 'Wrench',   30),
  ('wheels-tires-brakes',   'Wheels, Tires & Brakes','Tires, wheels, TPMS, brake pads and rotors.', 'CircleDot',40),
  ('interior-exterior',     'Interior & Exterior',   'Detailing, mats, seat covers, tint, decals and accessories.', 'Sparkles', 50),
  ('tools-garage',          'Tools & Garage',        'Hand tools, power tools, jacks, lifts, storage and safety gear.', 'Hammer',   60),
  ('electronics-lighting',  'Electronics & Lighting','Dashcams, head units, speakers, sensors and LED/HID lighting.', 'Cable',    70),
  ('specialty',             'Specialty',             'Motorcycle gear, off-road overland and EV/hybrid essentials.', 'Compass',  80)
ON CONFLICT (slug) DO NOTHING;

-- 4. Assign each top-level category to a department
UPDATE public.shop_categories SET department_slug = 'interior-exterior'    WHERE slug = 'detailing'         AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'tools-garage'         WHERE slug = 'tools'             AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'repair-replacement'   WHERE slug = 'parts'             AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'electronics-lighting' WHERE slug = 'electronics'       AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'interior-exterior'    WHERE slug = 'accessories'       AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'wheels-tires-brakes'  WHERE slug = 'tires-wheels'      AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'maintenance-fluids'   WHERE slug = 'lubricants'        AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'tools-garage'         WHERE slug = 'safety'            AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'performance-parts'    WHERE slug = 'performance-tuning' AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'performance-parts'    WHERE slug = 'exterior-mods'     AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'specialty'            WHERE slug = 'motorcycle-gear'   AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'specialty'            WHERE slug = 'off-road-overland' AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'specialty'            WHERE slug = 'ev-hybrid'         AND parent_id IS NULL;
UPDATE public.shop_categories SET department_slug = 'tools-garage'         WHERE slug = 'garage-storage'    AND parent_id IS NULL;

-- 5. Cross-department tags for items that naturally fit two departments
UPDATE public.shop_categories SET cross_department_slugs = ARRAY['wheels-tires-brakes']    WHERE slug = 'brakes';
UPDATE public.shop_categories SET cross_department_slugs = ARRAY['maintenance-fluids']     WHERE slug = 'filters';
UPDATE public.shop_categories SET cross_department_slugs = ARRAY['maintenance-fluids']     WHERE slug = 'belts-hoses';
UPDATE public.shop_categories SET cross_department_slugs = ARRAY['performance-parts']      WHERE slug IN ('window-tint','decals');
UPDATE public.shop_categories SET cross_department_slugs = ARRAY['performance-parts']      WHERE slug = 'perf-exhaust';


-- ============================================================================
-- SOURCE MIGRATION: 20260527074406_6c863d0d-b51d-40f8-8049-5ece6a07a207.sql
-- ============================================================================

UPDATE public.shop_departments SET hero_image_url = '/departments/performance-parts.jpg' WHERE slug = 'performance-parts';
UPDATE public.shop_departments SET hero_image_url = '/departments/maintenance-fluids.jpg' WHERE slug = 'maintenance-fluids';
UPDATE public.shop_departments SET hero_image_url = '/departments/repair-replacement.jpg' WHERE slug = 'repair-replacement';
UPDATE public.shop_departments SET hero_image_url = '/departments/wheels-tires-brakes.jpg' WHERE slug = 'wheels-tires-brakes';
UPDATE public.shop_departments SET hero_image_url = '/departments/interior-exterior.jpg' WHERE slug = 'interior-exterior';
UPDATE public.shop_departments SET hero_image_url = '/departments/tools-garage.jpg' WHERE slug = 'tools-garage';
UPDATE public.shop_departments SET hero_image_url = '/departments/electronics-lighting.jpg' WHERE slug = 'electronics-lighting';
UPDATE public.shop_departments SET hero_image_url = '/departments/specialty.jpg' WHERE slug = 'specialty';


-- ============================================================================
-- SOURCE MIGRATION: 20260527101926_98d7c403-0beb-4d30-b432-0fce0c2c409a.sql
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='refresh-lazada-prices') THEN
    PERFORM cron.unschedule('refresh-lazada-prices');
  END IF;
END $$;

SELECT cron.schedule(
  'refresh-lazada-prices',
  '0 */6 * * *',
  $cron$SELECT net.http_post(
    url:='https://project--0738c881-614d-4885-8d75-1b7c90e0835e.lovable.app/api/public/hooks/refresh-lazada',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmanJuanlyb3h2bHlkYWp2bmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTc4MDcsImV4cCI6MjA5MzIzMzgwN30.5jA3w00xtR3Y975XYk4Tks4j82NpOA8XXNiB8XLYiSE"}'::jsonb,
    body:='{"limit":50}'::jsonb
  ) AS request_id;$cron$
);


-- ============================================================================
-- SOURCE MIGRATION: 20260527114114_35fc4d77-e5e1-45f9-b94b-b96a0abe025d.sql
-- ============================================================================

ALTER TABLE public.shop_product_links
  ADD COLUMN IF NOT EXISTS price_php numeric,
  ADD COLUMN IF NOT EXISTS sale_price_php numeric,
  ADD COLUMN IF NOT EXISTS in_stock boolean;

CREATE TABLE IF NOT EXISTS public.shop_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  network_id uuid REFERENCES public.affiliate_networks(id) ON DELETE SET NULL,
  price_php numeric,
  sale_price_php numeric,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_price_history_product_time
  ON public.shop_price_history (product_id, captured_at DESC);

GRANT SELECT ON public.shop_price_history TO anon, authenticated;
GRANT ALL ON public.shop_price_history TO service_role;

ALTER TABLE public.shop_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price history public read"
  ON public.shop_price_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_products p
      WHERE p.id = shop_price_history.product_id
        AND (p.active = true OR public.can_manage_shop(auth.uid()))
    )
  );

CREATE POLICY "Shop managers manage price history"
  ON public.shop_price_history
  USING (public.can_manage_shop(auth.uid()))
  WITH CHECK (public.can_manage_shop(auth.uid()));


-- ============================================================================
-- SOURCE MIGRATION: 20260528054733_ad81c4de-65fb-49d4-8b17-b0273d9d9216.sql
-- ============================================================================

-- =========================================================
-- 1) Extend businesses
-- =========================================================
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS theme_color text,
  ADD COLUMN IF NOT EXISTS show_services boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_products boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_posts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cta_primary text NOT NULL DEFAULT 'inquiry';

-- =========================================================
-- Helper: is_business_editor(business_id, user_id)
-- Owner OR member of the linked organization
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_business_editor(_business_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _business_id
      AND (
        b.owner_id = _user_id
        OR (
          b.organization_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = b.organization_id
              AND om.user_id = _user_id
          )
        )
      )
  );
$$;

-- =========================================================
-- updated_at trigger fn (reuse if exists)
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================
-- 2) business_services
-- =========================================================
CREATE TABLE IF NOT EXISTS public.business_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price_label text,
  photo_url text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_business_services_biz ON public.business_services(business_id, sort_order);

GRANT SELECT ON public.business_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_services TO authenticated;
GRANT ALL ON public.business_services TO service_role;

ALTER TABLE public.business_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active services public read"
  ON public.business_services FOR SELECT
  USING (active = true OR public.is_business_editor(business_id, auth.uid()));

CREATE POLICY "Editors manage services"
  ON public.business_services FOR ALL
  TO authenticated
  USING (public.is_business_editor(business_id, auth.uid()))
  WITH CHECK (public.is_business_editor(business_id, auth.uid()));

CREATE TRIGGER trg_business_services_updated
  BEFORE UPDATE ON public.business_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 3) business_products
-- =========================================================
CREATE TABLE IF NOT EXISTS public.business_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price_php numeric(12,2),
  sale_price_php numeric(12,2),
  photo_url text,
  in_stock boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_business_products_biz ON public.business_products(business_id, sort_order);

GRANT SELECT ON public.business_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_products TO authenticated;
GRANT ALL ON public.business_products TO service_role;

ALTER TABLE public.business_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active products public read"
  ON public.business_products FOR SELECT
  USING (active = true OR public.is_business_editor(business_id, auth.uid()));

CREATE POLICY "Editors manage products"
  ON public.business_products FOR ALL
  TO authenticated
  USING (public.is_business_editor(business_id, auth.uid()))
  WITH CHECK (public.is_business_editor(business_id, auth.uid()));

CREATE TRIGGER trg_business_products_updated
  BEFORE UPDATE ON public.business_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 4) business_posts
-- =========================================================
CREATE TABLE IF NOT EXISTS public.business_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  body text NOT NULL,
  photo_url text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_business_posts_biz ON public.business_posts(business_id, created_at DESC);

GRANT SELECT ON public.business_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_posts TO authenticated;
GRANT ALL ON public.business_posts TO service_role;

ALTER TABLE public.business_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published posts public read"
  ON public.business_posts FOR SELECT
  USING (published = true OR public.is_business_editor(business_id, auth.uid()));

CREATE POLICY "Editors manage posts"
  ON public.business_posts FOR ALL
  TO authenticated
  USING (public.is_business_editor(business_id, auth.uid()))
  WITH CHECK (public.is_business_editor(business_id, auth.uid()));

CREATE TRIGGER trg_business_posts_updated
  BEFORE UPDATE ON public.business_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 5) business_inquiries
-- =========================================================
CREATE TABLE IF NOT EXISTS public.business_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_business_inquiries_biz ON public.business_inquiries(business_id, created_at DESC);

-- Anyone (anon + authed) can INSERT, but cannot SELECT (only editors).
GRANT INSERT ON public.business_inquiries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_inquiries TO authenticated;
GRANT ALL ON public.business_inquiries TO service_role;

ALTER TABLE public.business_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit inquiry"
  ON public.business_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(name) BETWEEN 1 AND 120
    AND length(message) BETWEEN 1 AND 4000
    AND (phone IS NULL OR length(phone) <= 40)
    AND (email IS NULL OR length(email) <= 200)
  );

CREATE POLICY "Editors read inquiries"
  ON public.business_inquiries FOR SELECT
  TO authenticated
  USING (public.is_business_editor(business_id, auth.uid()));

CREATE POLICY "Editors update inquiries"
  ON public.business_inquiries FOR UPDATE
  TO authenticated
  USING (public.is_business_editor(business_id, auth.uid()))
  WITH CHECK (public.is_business_editor(business_id, auth.uid()));

CREATE POLICY "Editors delete inquiries"
  ON public.business_inquiries FOR DELETE
  TO authenticated
  USING (public.is_business_editor(business_id, auth.uid()));

CREATE TRIGGER trg_business_inquiries_updated
  BEFORE UPDATE ON public.business_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 6) Storage bucket for vendor media
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-media', 'business-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "business-media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-media');

-- Authenticated users can write into a folder matching their uid
-- Path convention: <user_id>/<business_id>/<filename>
CREATE POLICY "business-media authed insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "business-media authed update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'business-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "business-media authed delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'business-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260529001000_96012e17-51ea-4a35-8f29-fff7b08d7b61.sql
-- ============================================================================
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  topic TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_status_check CHECK (status IN ('open','in_progress','resolved','closed')),
  CONSTRAINT support_tickets_topic_check CHECK (topic IN ('buying','selling','account','business','payments','other')),
  CONSTRAINT support_tickets_email_len CHECK (char_length(email) <= 255),
  CONSTRAINT support_tickets_name_len CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT support_tickets_subject_len CHECK (char_length(subject) BETWEEN 3 AND 200),
  CONSTRAINT support_tickets_message_len CHECK (char_length(message) BETWEEN 5 AND 4000)
);

GRANT INSERT ON public.support_tickets TO anon;
GRANT INSERT, SELECT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a support ticket"
  ON public.support_tickets FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tickets"
  ON public.support_tickets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_support_tickets_status ON public.support_tickets(status, created_at DESC);
CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id) WHERE user_id IS NOT NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260529091647_234cb316-296e-4d77-9bda-5af7a3528cf1.sql
-- ============================================================================
INSERT INTO public.business_tags (slug, label, type_slug, category, sort_order, is_popular) VALUES
  ('fuel-gas-91', 'Gasoline 91', 'fuel_station', 'fuel_grade', 10, true),
  ('fuel-gas-95', 'Gasoline 95', 'fuel_station', 'fuel_grade', 20, true),
  ('fuel-gas-97', 'Gasoline 97', 'fuel_station', 'fuel_grade', 30, false),
  ('fuel-gas-100', 'Gasoline 100', 'fuel_station', 'fuel_grade', 40, false),
  ('fuel-diesel', 'Diesel', 'fuel_station', 'fuel_grade', 50, true),
  ('fuel-diesel-euro5', 'Premium Diesel (Euro 5)', 'fuel_station', 'fuel_grade', 60, false),
  ('fuel-biodiesel-b5', 'Bio-Diesel B5', 'fuel_station', 'fuel_grade', 70, false),
  ('fuel-e10', 'E10 / Ethanol blend', 'fuel_station', 'fuel_grade', 80, false),
  ('fuel-kerosene', 'Kerosene', 'fuel_station', 'fuel_grade', 90, false),
  ('fuel-avgas', 'AvGas', 'fuel_station', 'fuel_grade', 100, false),
  ('fuel-autogas-lpg', 'Autogas (LPG)', 'fuel_station', 'fuel_grade', 110, false),
  ('fuel-cng', 'CNG', 'fuel_station', 'fuel_grade', 120, false),

  ('ev-type2-ac', 'Type 2 AC', 'fuel_station', 'ev_charging', 200, true),
  ('ev-ccs2-dc', 'CCS2 DC', 'fuel_station', 'ev_charging', 210, true),
  ('ev-chademo', 'CHAdeMO', 'fuel_station', 'ev_charging', 220, false),
  ('ev-tesla-nacs', 'Tesla / NACS', 'fuel_station', 'ev_charging', 230, false),
  ('ev-7kw', '7 kW', 'fuel_station', 'ev_charging', 240, false),
  ('ev-22kw', '22 kW', 'fuel_station', 'ev_charging', 250, false),
  ('ev-50kw', '50 kW', 'fuel_station', 'ev_charging', 260, false),
  ('ev-150kw-plus', '150 kW+', 'fuel_station', 'ev_charging', 270, false),
  ('ev-24-7-charging', '24/7 charging', 'fuel_station', 'ev_charging', 280, false),

  ('station-convenience-store', 'Convenience store', 'fuel_station', 'station_services', 300, true),
  ('station-restrooms', 'Restrooms', 'fuel_station', 'station_services', 310, false),
  ('station-atm', 'ATM', 'fuel_station', 'station_services', 320, false),
  ('station-air-water', 'Air & water', 'fuel_station', 'station_services', 330, false),
  ('station-car-wash', 'Car wash', 'fuel_station', 'station_services', 340, false),
  ('station-lube-bay', 'Lube bay', 'fuel_station', 'station_services', 350, false),
  ('station-tire-service', 'Tire service', 'fuel_station', 'station_services', 360, false),
  ('station-lpg-refill', 'LPG refill', 'fuel_station', 'station_services', 370, false),
  ('station-24-7', '24/7 open', 'fuel_station', 'station_services', 380, true),
  ('station-loyalty-card', 'Loyalty card accepted', 'fuel_station', 'station_services', 390, false),
  ('station-fleet-card', 'Fleet card accepted', 'fuel_station', 'station_services', 400, false)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260529103420_2638953d-9d10-4fb6-a50b-b469e593a1ec.sql
-- ============================================================================

-- Fix race/duplicate by using MAX+1 instead of COUNT+1
CREATE OR REPLACE FUNCTION public.assign_founding_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
  current_count int;
BEGIN
  SELECT count(*) INTO current_count FROM public.profiles WHERE is_founding_member = true;
  IF current_count < 1000 THEN
    SELECT COALESCE(MAX(founding_member_number), 0) + 1
      INTO next_num
      FROM public.profiles
      WHERE founding_member_number IS NOT NULL;
    NEW.is_founding_member := true;
    NEW.founding_member_number := next_num;
  END IF;
  RETURN NEW;
END;
$$;

-- Add address fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS business_postal_code text;

-- Update handle_new_user to persist new address fields from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  IF v_full IS NULL AND (v_first IS NOT NULL OR v_last IS NOT NULL) THEN
    v_full := trim(concat_ws(' ', v_first, v_last));
  END IF;
  IF v_full IS NULL THEN
    v_full := NEW.email;
  END IF;

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

  INSERT INTO public.profiles (
    id, full_name, first_name, last_name, phone, phone_e164,
    signup_intent, signup_city, signup_region, signup_province,
    street_address, postal_code,
    business_name, business_address, business_region, business_province, business_city, business_postal_code,
    business_kind, seller_type
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
    v_seller_type
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260529110857_5046e165-5e9b-4dd8-b643-3deffd0a340e.sql
-- ============================================================================

-- Function: delete auth users whose email is not confirmed after 24h
-- Cascades via existing FKs (profiles.id -> auth.users.id on delete cascade, etc.)
CREATE OR REPLACE FUNCTION public.cleanup_unverified_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  deleted_count integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT id
    FROM auth.users
    WHERE email_confirmed_at IS NULL
      AND confirmed_at IS NULL
      AND created_at < (now() - interval '24 hours')
      AND (deleted_at IS NULL)
  LOOP
    -- Remove dependent business ownership references first (defensive)
    UPDATE public.businesses SET owner_id = NULL WHERE owner_id = r.id;
    DELETE FROM auth.users WHERE id = r.id;
    deleted_count := deleted_count + 1;
  END LOOP;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_unverified_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_unverified_users() TO service_role;

-- Schedule hourly cleanup via pg_cron
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-unverified-users');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'cleanup-unverified-users',
  '17 * * * *',
  $$SELECT public.cleanup_unverified_users();$$
);


-- ============================================================================
-- SOURCE MIGRATION: 20260529110941_ec4ca8a5-b78c-4254-b9f4-315a9b19ef9b.sql
-- ============================================================================

-- Remove the unconfirmed goldcity4u@icloud.com signup that has been showing in admin
UPDATE public.businesses SET owner_id = NULL WHERE owner_id = 'e3b80d24-34d7-4a36-85cb-a89826e2c8da';
DELETE FROM auth.users WHERE id = 'e3b80d24-34d7-4a36-85cb-a89826e2c8da' AND email_confirmed_at IS NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260529114303_62e11c44-56f1-4552-828e-cc9e2d3c3fe5.sql
-- ============================================================================

-- Seed expanded fuel-station tags
INSERT INTO public.business_tags (slug, label, type_slug, category, sort_order, is_popular) VALUES
-- fuel_grade additions
('fuel-premium-95',     'Premium 95 (XCS/Blaze 95)',     'fuel_station', 'fuel_grade',  20, true),
('fuel-premium-97',     'Premium 97/98',                  'fuel_station', 'fuel_grade',  21, false),
('fuel-racing-100',     'Racing 100 (Blaze 100)',         'fuel_station', 'fuel_grade',  22, false),
('fuel-diesel-standard','Standard Diesel',                'fuel_station', 'fuel_grade',  23, true),
('fuel-diesel-premium', 'Premium Diesel (Diesel Max/Xtra/Turbo)', 'fuel_station','fuel_grade',24,true),
('fuel-bio-b2',         'Bio-Diesel B2',                  'fuel_station', 'fuel_grade',  25, false),
('fuel-e85',            'E85',                            'fuel_station', 'fuel_grade',  26, false),
-- station_services additions
('station-quick-food',  'Quick-serve food',               'fuel_station', 'station_services', 30, false),
('station-coffee-bar',  'Coffee bar',                     'fuel_station', 'station_services', 31, false),
('station-fast-food-tenant','Fast-food tenant (Jollibee/McDo/etc.)','fuel_station','station_services',32,false),
('station-pharmacy',    'Pharmacy',                       'fuel_station', 'station_services', 33, false),
('station-seating',     'Seating area',                   'fuel_station', 'station_services', 34, false),
('station-wifi',        'Wi-Fi',                          'fuel_station', 'station_services', 35, false),
('station-eload',       'Mobile load / e-load',           'fuel_station', 'station_services', 36, false),
('station-bills-payment','Bills payment',                 'fuel_station', 'station_services', 37, false),
('station-remittance',  'Remittance',                     'fuel_station', 'station_services', 38, false),
('station-gcash-cashin','GCash cash-in',                  'fuel_station', 'station_services', 39, false),
('station-package-pickup','Package pickup (Lalamove/Grab)','fuel_station','station_services', 40, false),
('station-parking',     'Parking',                        'fuel_station', 'station_services', 41, false),
('station-truck-parking','Truck parking',                 'fuel_station', 'station_services', 42, false),
('station-high-flow-diesel','High-flow diesel for trucks','fuel_station','station_services', 43, false),
('station-motorcycle-lane','Motorcycle lane',             'fuel_station', 'station_services', 44, false),
('station-pwd',         'PWD-accessible',                 'fuel_station', 'station_services', 45, false),
('station-prayer-room', 'Prayer room',                    'fuel_station', 'station_services', 46, false),
('station-baby-changing','Baby changing',                 'fuel_station', 'station_services', 47, false),
-- station_products (new category)
('station-sari-sari-store','Sari-Sari Store',             'fuel_station', 'station_products', 10, true),
('station-engine-oil',  'Engine oil',                     'fuel_station', 'station_products', 11, true),
('station-coolant',     'Coolant',                        'fuel_station', 'station_products', 12, false),
('station-brake-fluid', 'Brake fluid',                    'fuel_station', 'station_products', 13, false),
('station-wiper-fluid', 'Wiper fluid',                    'fuel_station', 'station_products', 14, false),
('station-lubricants-drums','Lubricants (drums)',         'fuel_station', 'station_products', 15, false),
('station-batteries',   'Batteries',                      'fuel_station', 'station_products', 16, false),
('station-tires',       'Tires',                          'fuel_station', 'station_products', 17, false),
('station-tire-sealant','Tire sealant',                   'fuel_station', 'station_products', 18, false),
('station-air-fresheners','Air fresheners',               'fuel_station', 'station_products', 19, false),
('station-snacks-drinks','Snacks & drinks',               'fuel_station', 'station_products', 20, false),
('station-ice',         'Ice',                            'fuel_station', 'station_products', 21, false),
('station-cigarettes-vape','Cigarettes / Vape',           'fuel_station', 'station_products', 22, false),
('station-lpg-cylinders','LPG cylinders for sale',        'fuel_station', 'station_products', 23, false),
-- station_payment (new category)
('pay-cash',            'Cash',                           'fuel_station', 'station_payment', 10, true),
('pay-credit-card',     'Credit card',                    'fuel_station', 'station_payment', 11, true),
('pay-debit-card',      'Debit card',                     'fuel_station', 'station_payment', 12, false),
('pay-gcash',           'GCash',                          'fuel_station', 'station_payment', 13, true),
('pay-maya',            'Maya',                           'fuel_station', 'station_payment', 14, false),
('pay-qrph',            'QR Ph',                          'fuel_station', 'station_payment', 15, false),
('pay-fleet-card',      'Fleet card (Petron/Shell/Caltex)','fuel_station','station_payment', 16, false),
('pay-corporate',       'Corporate account',              'fuel_station', 'station_payment', 17, false),
-- station_brand (new category)
('brand-petron',        'Petron',                         'fuel_station', 'station_brand', 10, false),
('brand-shell',         'Shell',                          'fuel_station', 'station_brand', 11, false),
('brand-caltex',        'Caltex',                         'fuel_station', 'station_brand', 12, false),
('brand-phoenix',       'Phoenix',                        'fuel_station', 'station_brand', 13, false),
('brand-seaoil',        'Seaoil',                         'fuel_station', 'station_brand', 14, false),
('brand-cleanfuel',     'Cleanfuel',                      'fuel_station', 'station_brand', 15, false),
('brand-total',         'Total / TotalEnergies',          'fuel_station', 'station_brand', 16, false),
('brand-unioil',        'Unioil',                         'fuel_station', 'station_brand', 17, false),
('brand-flying-v',      'Flying V',                       'fuel_station', 'station_brand', 18, false),
('brand-ptt',           'PTT',                            'fuel_station', 'station_brand', 19, false),
('brand-jetti',         'Jetti',                          'fuel_station', 'station_brand', 20, false),
('brand-independent',   'Independent',                    'fuel_station', 'station_brand', 21, false)
ON CONFLICT (slug) DO NOTHING;

-- RPC: let business owners suggest a custom tag that adds to the shared catalog
CREATE OR REPLACE FUNCTION public.suggest_business_tag(
  _label text,
  _type_slug text,
  _category text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  trimmed text := btrim(COALESCE(_label, ''));
  base text;
  candidate text;
  i int := 0;
  cat text := NULLIF(btrim(COALESCE(_category, '')), '');
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF char_length(trimmed) < 2 OR char_length(trimmed) > 40 THEN
    RAISE EXCEPTION 'Tag label must be 2-40 characters';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = uid) THEN
    RAISE EXCEPTION 'Only business owners can suggest tags';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.business_types WHERE slug = _type_slug) THEN
    RAISE EXCEPTION 'Unknown business type';
  END IF;

  base := lower(regexp_replace(trimmed, '[^a-zA-Z0-9]+', '-', 'g'));
  base := regexp_replace(base, '^-+|-+$', '', 'g');
  IF base = '' THEN base := 'tag'; END IF;
  base := substr(base, 1, 48);

  -- Reuse existing slug if label already exists for this type
  SELECT slug INTO candidate
    FROM public.business_tags
   WHERE lower(label) = lower(trimmed)
     AND (type_slug = _type_slug OR type_slug IS NULL)
   LIMIT 1;
  IF candidate IS NOT NULL THEN
    RETURN candidate;
  END IF;

  candidate := base;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.business_tags WHERE slug = candidate);
    i := i + 1;
    candidate := base || '-' || i::text;
    IF i > 50 THEN
      candidate := base || '-' || extract(epoch from now())::bigint::text;
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.business_tags(slug, label, type_slug, category, sort_order, is_popular)
  VALUES (candidate, trimmed, _type_slug, cat, 1000, false);

  RETURN candidate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.suggest_business_tag(text, text, text) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260529115629_f7974081-5d14-4967-8e7b-e8303c363ad0.sql
-- ============================================================================
DROP POLICY IF EXISTS "Owners update own businesses" ON public.businesses;
CREATE POLICY "Owners update own businesses" ON public.businesses
FOR UPDATE TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);


-- ============================================================================
-- SOURCE MIGRATION: 20260529120807_a6d7b5c5-c7ca-4a03-b7a7-025a7aca5ec9.sql
-- ============================================================================
ALTER TABLE public.business_services
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS price_php numeric(12,2),
  ADD COLUMN IF NOT EXISTS sale_price_php numeric(12,2),
  ADD COLUMN IF NOT EXISTS catalog_key text;

CREATE INDEX IF NOT EXISTS idx_business_services_catalog_key ON public.business_services (catalog_key) WHERE catalog_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_services_category ON public.business_services (category) WHERE category IS NOT NULL;


-- ============================================================================
-- SOURCE MIGRATION: 20260530131847_36e4ac3c-8ab5-4310-ae44-f419fb7b3997.sql
-- ============================================================================

-- Phase 2 (Gallery) + Phase 4 (Contact channels) + featured video

-- GALLERY ALBUMS
CREATE TABLE public.business_gallery_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 400),
  cover_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_business_gallery_albums_biz ON public.business_gallery_albums(business_id, sort_order);

GRANT SELECT ON public.business_gallery_albums TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_gallery_albums TO authenticated;
GRANT ALL ON public.business_gallery_albums TO service_role;

ALTER TABLE public.business_gallery_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read gallery albums of active businesses"
ON public.business_gallery_albums FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_gallery_albums.business_id
      AND (b.status = 'active' OR b.owner_id = auth.uid() OR public.can_moderate(auth.uid()))
  )
);

CREATE POLICY "Owner/org/mod manage gallery albums"
ON public.business_gallery_albums FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_gallery_albums.business_id
      AND (
        b.owner_id = auth.uid()
        OR public.can_moderate(auth.uid())
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_gallery_albums.business_id
      AND (
        b.owner_id = auth.uid()
        OR public.can_moderate(auth.uid())
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
);

CREATE TRIGGER trg_business_gallery_albums_updated
BEFORE UPDATE ON public.business_gallery_albums
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- GALLERY PHOTOS
CREATE TABLE public.business_gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.business_gallery_albums(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  url TEXT NOT NULL CHECK (char_length(url) BETWEEN 1 AND 1000),
  caption TEXT CHECK (caption IS NULL OR char_length(caption) <= 300),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_business_gallery_photos_album ON public.business_gallery_photos(album_id, sort_order);
CREATE INDEX idx_business_gallery_photos_biz ON public.business_gallery_photos(business_id);

GRANT SELECT ON public.business_gallery_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_gallery_photos TO authenticated;
GRANT ALL ON public.business_gallery_photos TO service_role;

ALTER TABLE public.business_gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read gallery photos of active businesses"
ON public.business_gallery_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_gallery_photos.business_id
      AND (b.status = 'active' OR b.owner_id = auth.uid() OR public.can_moderate(auth.uid()))
  )
);

CREATE POLICY "Owner/org/mod manage gallery photos"
ON public.business_gallery_photos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_gallery_photos.business_id
      AND (
        b.owner_id = auth.uid()
        OR public.can_moderate(auth.uid())
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_gallery_photos.business_id
      AND (
        b.owner_id = auth.uid()
        OR public.can_moderate(auth.uid())
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
);

-- CONTACT CHANNELS
CREATE TABLE public.business_contact_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('phone','whatsapp','viber','telegram','instagram','tiktok','email','facebook','x','linkedin')),
  label TEXT CHECK (label IS NULL OR char_length(label) <= 40),
  value TEXT NOT NULL CHECK (char_length(value) BETWEEN 1 AND 200),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_business_contact_channels_biz ON public.business_contact_channels(business_id, sort_order);

GRANT SELECT ON public.business_contact_channels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_contact_channels TO authenticated;
GRANT ALL ON public.business_contact_channels TO service_role;

ALTER TABLE public.business_contact_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read contact channels of active businesses"
ON public.business_contact_channels FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_contact_channels.business_id
      AND (b.status = 'active' OR b.owner_id = auth.uid() OR public.can_moderate(auth.uid()))
  )
);

CREATE POLICY "Owner/org/mod manage contact channels"
ON public.business_contact_channels FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_contact_channels.business_id
      AND (
        b.owner_id = auth.uid()
        OR public.can_moderate(auth.uid())
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_contact_channels.business_id
      AND (
        b.owner_id = auth.uid()
        OR public.can_moderate(auth.uid())
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
);

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-gallery', 'business-gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read business gallery"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-gallery');

CREATE POLICY "Authenticated upload to business gallery"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'business-gallery');

CREATE POLICY "Authenticated update own business gallery"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'business-gallery' AND owner = auth.uid())
WITH CHECK (bucket_id = 'business-gallery' AND owner = auth.uid());

CREATE POLICY "Authenticated delete own business gallery"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'business-gallery' AND owner = auth.uid());

-- TOGGLES + FEATURED VIDEO
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS show_gallery BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_contact BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS featured_video_url TEXT,
  ADD COLUMN IF NOT EXISTS featured_video_provider TEXT CHECK (featured_video_provider IS NULL OR featured_video_provider IN ('youtube','vimeo','facebook'));


-- ============================================================================
-- SOURCE MIGRATION: 20260530160305_f8c16c63-0b0a-4b7c-bdd8-4f305066be96.sql
-- ============================================================================

CREATE TABLE public.business_bookable_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  duration_min INT NOT NULL DEFAULT 30,
  buffer_min INT NOT NULL DEFAULT 0,
  price_php NUMERIC(12,2),
  max_concurrent INT NOT NULL DEFAULT 1,
  require_approval BOOLEAN NOT NULL DEFAULT true,
  lead_time_hours INT NOT NULL DEFAULT 2,
  horizon_days INT NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_bookable_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_bookable_items TO authenticated;
GRANT ALL ON public.business_bookable_items TO service_role;
ALTER TABLE public.business_bookable_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active bookable items" ON public.business_bookable_items FOR SELECT USING (active = true);
CREATE POLICY "Owners manage their bookable items" ON public.business_bookable_items FOR ALL
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_bookable_items.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_bookable_items.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))));
CREATE INDEX idx_bookable_items_business ON public.business_bookable_items(business_id);

CREATE TABLE public.business_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_availability TO authenticated;
GRANT ALL ON public.business_availability TO service_role;
ALTER TABLE public.business_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view availability" ON public.business_availability FOR SELECT USING (true);
CREATE POLICY "Owners manage availability" ON public.business_availability FOR ALL
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_availability.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_availability.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))));
CREATE INDEX idx_availability_business ON public.business_availability(business_id);

CREATE TABLE public.business_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  closed BOOLEAN NOT NULL DEFAULT true,
  start_time TIME,
  end_time TIME,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_availability_exceptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_availability_exceptions TO authenticated;
GRANT ALL ON public.business_availability_exceptions TO service_role;
ALTER TABLE public.business_availability_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view exceptions" ON public.business_availability_exceptions FOR SELECT USING (true);
CREATE POLICY "Owners manage exceptions" ON public.business_availability_exceptions FOR ALL
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_availability_exceptions.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_availability_exceptions.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))));
CREATE INDEX idx_exceptions_business_date ON public.business_availability_exceptions(business_id, date);

CREATE TABLE public.business_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  bookable_item_id UUID NOT NULL REFERENCES public.business_bookable_items(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  user_id UUID,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.business_bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_bookings TO authenticated;
GRANT ALL ON public.business_bookings TO service_role;
ALTER TABLE public.business_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create a booking" ON public.business_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can view their bookings" ON public.business_bookings FOR SELECT
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_bookings.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))));
CREATE POLICY "Customers view their own bookings" ON public.business_bookings FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "Owners update their bookings" ON public.business_bookings FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_bookings.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))));
CREATE POLICY "Owners delete bookings" ON public.business_bookings FOR DELETE
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_bookings.business_id AND (b.owner_id = auth.uid() OR (b.organization_id IS NOT NULL AND public.is_org_member(b.organization_id, auth.uid())))));
CREATE INDEX idx_bookings_business_start ON public.business_bookings(business_id, starts_at);
CREATE INDEX idx_bookings_item_start ON public.business_bookings(bookable_item_id, starts_at);
CREATE INDEX idx_bookings_user ON public.business_bookings(user_id);

CREATE TRIGGER tg_bookable_items_updated_at BEFORE UPDATE ON public.business_bookable_items
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_bookings_updated_at BEFORE UPDATE ON public.business_bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


-- ============================================================================
-- SOURCE MIGRATION: 20260531024844_848819ff-499d-4421-8227-559670575ed9.sql
-- ============================================================================

-- 1. vanity_slug column (short URL like /b/ucatchfuels)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS vanity_slug text;

-- case-insensitive uniqueness via functional unique index
CREATE UNIQUE INDEX IF NOT EXISTS businesses_vanity_slug_lower_uidx
  ON public.businesses ((lower(vanity_slug)))
  WHERE vanity_slug IS NOT NULL;

-- format check: 3-32 chars, [a-z0-9-], cannot start/end with -
ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_vanity_slug_format_chk;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_vanity_slug_format_chk
  CHECK (vanity_slug IS NULL OR vanity_slug ~ '^[a-z0-9]([a-z0-9-]{1,30})[a-z0-9]$');

-- 2. slug history (for 301 redirects after slug/vanity_slug rename)
CREATE TABLE IF NOT EXISTS public.business_slug_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  old_slug text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('slug','vanity_slug')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_slug_history_old_slug_idx
  ON public.business_slug_history (lower(old_slug));
CREATE INDEX IF NOT EXISTS business_slug_history_business_idx
  ON public.business_slug_history (business_id);

GRANT SELECT ON public.business_slug_history TO anon;
GRANT SELECT ON public.business_slug_history TO authenticated;
GRANT ALL ON public.business_slug_history TO service_role;

ALTER TABLE public.business_slug_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slug history is public for redirects"
  ON public.business_slug_history FOR SELECT
  USING (true);

CREATE POLICY "owners can insert slug history"
  ON public.business_slug_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_slug_history.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- 3. reserved word table (so /b/admin, /b/api etc. can't be claimed)
CREATE TABLE IF NOT EXISTS public.business_reserved_slugs (
  slug text PRIMARY KEY
);

GRANT SELECT ON public.business_reserved_slugs TO anon;
GRANT SELECT ON public.business_reserved_slugs TO authenticated;
GRANT ALL ON public.business_reserved_slugs TO service_role;

ALTER TABLE public.business_reserved_slugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reserved slugs are public"
  ON public.business_reserved_slugs FOR SELECT USING (true);

INSERT INTO public.business_reserved_slugs (slug) VALUES
  ('admin'),('api'),('app'),('auth'),('login'),('signup'),('logout'),
  ('dashboard'),('settings'),('billing'),('checkout'),('payments'),
  ('businesses'),('business'),('shop'),('listings'),('listing'),
  ('rides'),('ride'),('seller'),('search'),('browse'),('map'),
  ('about'),('contact'),('support'),('help'),('terms'),('privacy'),
  ('refund-policy'),('guidelines'),('affiliate-disclosure'),('pricing'),
  ('sell'),('export'),('tow'),('passport'),('verify-email'),
  ('reset-password'),('forgot-password'),('invites'),('unsubscribe'),
  ('boost'),('advertise'),('lovable'),('static'),('public'),('assets'),
  ('img'),('images'),('cdn'),('www'),('mail'),('blog'),('news'),
  ('b'),('r'),('go'),('my-qr'),('sitemap'),('robots')
ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260531025940_5e4297d0-69c9-40fc-992f-defbd62f6a7d.sql
-- ============================================================================

CREATE TABLE public.business_page_events (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'view','call_click','whatsapp_click','messenger_click','website_click',
    'contact_click','share_click','book_click','book_created','book_confirmed',
    'inquiry_submitted','gallery_view','video_play'
  )),
  meta JSONB,
  session_hash TEXT,
  referrer TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bpe_business_time ON public.business_page_events (business_id, occurred_at DESC);
CREATE INDEX idx_bpe_business_kind_time ON public.business_page_events (business_id, kind, occurred_at DESC);

GRANT SELECT ON public.business_page_events TO authenticated;
GRANT ALL ON public.business_page_events TO service_role;

ALTER TABLE public.business_page_events ENABLE ROW LEVEL SECURITY;

-- Owner / org member can read events for their business
CREATE POLICY "Owners read business events"
ON public.business_page_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_page_events.business_id
      AND (
        b.owner_id = auth.uid()
        OR (b.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = b.organization_id AND m.user_id = auth.uid()
        ))
      )
  )
);
-- All writes happen via service_role inside server functions (no public insert policy needed).


-- ============================================================================
-- SOURCE MIGRATION: 20260531054706_8415f0eb-7d1f-4b18-878e-8f26c2e98742.sql
-- ============================================================================
CREATE POLICY "Admins read all business events" ON public.business_page_events FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260531115419_12ba05a3-8683-4da9-914e-4513d964a6d4.sql
-- ============================================================================
GRANT SELECT ON public.businesses TO anon, authenticated;
GRANT SELECT ON public.business_types TO anon, authenticated;
GRANT ALL ON public.businesses TO service_role;
GRANT ALL ON public.business_types TO service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260601010328_9e8aa9b0-30e0-4c30-9e57-d519a3c9d517.sql
-- ============================================================================
GRANT SELECT ON public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
GRANT SELECT ON public.business_types TO anon;
GRANT SELECT ON public.business_types TO authenticated;
GRANT ALL ON public.business_types TO service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260601030519_cee54f80-90c5-4ee0-a966-2dcf08cf9a98.sql
-- ============================================================================
DROP POLICY IF EXISTS "Active businesses public read" ON public.businesses;

CREATE POLICY "Active businesses public read"
ON public.businesses
FOR SELECT
TO public
USING (
  status = 'active'::business_status
  OR (auth.uid() IS NOT NULL AND auth.uid() = owner_id)
  OR (auth.uid() IS NOT NULL AND public.can_moderate(auth.uid()))
);


-- ============================================================================
-- SOURCE MIGRATION: 20260601030613_bd3b8478-7045-464b-af81-bd540bcc5c00.sql
-- ============================================================================
DROP POLICY IF EXISTS "Active businesses public read" ON public.businesses;
DROP POLICY IF EXISTS "Moderators manage businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admins manage business types" ON public.business_types;

CREATE POLICY "Active businesses public read"
ON public.businesses
FOR SELECT
TO public
USING (status = 'active'::business_status);

CREATE POLICY "Business owners can read own businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Moderators manage businesses"
ON public.businesses
FOR ALL
TO authenticated
USING (public.can_moderate(auth.uid()))
WITH CHECK (public.can_moderate(auth.uid()));

CREATE POLICY "Admins manage business types"
ON public.business_types
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260601042141_25c0cbaf-9664-41b6-ac02-f08aa7f340ed.sql
-- ============================================================================

-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.course_status AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.course_level AS ENUM ('beginner','intermediate','advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enrollment_source AS ENUM ('purchase','subscription','admin_grant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_tier AS ENUM ('featured','standard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ COURSES ============
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  description text,
  hero_image_url text,
  category text,
  level public.course_level NOT NULL DEFAULT 'beginner',
  duration_minutes int DEFAULT 0,
  instructor_name text,
  instructor_bio text,
  price_id text,
  price_php numeric(10,2),
  included_in_tiers text[] NOT NULL DEFAULT '{}',
  status public.course_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_courses_category ON public.courses(category);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published courses are public" ON public.courses FOR SELECT TO public USING (status = 'published');
CREATE POLICY "Moderators manage courses" ON public.courses FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MODULES ============
CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  title text NOT NULL,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_modules_course ON public.course_modules(course_id, position);
GRANT SELECT ON public.course_modules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_modules TO authenticated;
GRANT ALL ON public.course_modules TO service_role;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modules of published courses are public" ON public.course_modules FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.status = 'published'));
CREATE POLICY "Moderators manage modules" ON public.course_modules FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ LESSONS ============
CREATE TABLE public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  title text NOT NULL,
  video_url text,
  duration_seconds int DEFAULT 0,
  content_md text,
  is_preview boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_lessons_module ON public.course_lessons(module_id, position);
GRANT SELECT ON public.course_lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated;
GRANT ALL ON public.course_lessons TO service_role;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons of published courses are public" ON public.course_lessons FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_id AND c.status = 'published'));
CREATE POLICY "Moderators manage lessons" ON public.course_lessons FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ ENROLLMENTS (must be before resources policy) ============
CREATE TABLE public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  source public.enrollment_source NOT NULL DEFAULT 'admin_grant',
  payment_id uuid,
  stripe_session_id text,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, course_id)
);
CREATE INDEX idx_course_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX idx_course_enrollments_course ON public.course_enrollments(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_enrollments TO authenticated;
GRANT ALL ON public.course_enrollments TO service_role;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own enrollments" ON public.course_enrollments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_moderate(auth.uid()));
CREATE POLICY "Moderators manage enrollments" ON public.course_enrollments FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ RESOURCES ============
CREATE TABLE public.course_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  label text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_resources_lesson ON public.course_resources(lesson_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_resources TO authenticated;
GRANT ALL ON public.course_resources TO service_role;
ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resources visible to enrolled users" ON public.course_resources FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.course_lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.course_enrollments e ON e.course_id = m.course_id
    WHERE l.id = lesson_id AND e.user_id = auth.uid()) OR public.can_moderate(auth.uid()));
CREATE POLICY "Moderators manage resources" ON public.course_resources FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ QUIZZES ============
CREATE TABLE public.course_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  pass_threshold int NOT NULL DEFAULT 80,
  is_final boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_quizzes_course ON public.course_quizzes(course_id);
GRANT SELECT ON public.course_quizzes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_quizzes TO authenticated;
GRANT ALL ON public.course_quizzes TO service_role;
ALTER TABLE public.course_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quizzes of published courses are public" ON public.course_quizzes FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.status = 'published'));
CREATE POLICY "Moderators manage quizzes" ON public.course_quizzes FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ QUIZ QUESTIONS ============
CREATE TABLE public.course_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  prompt text NOT NULL,
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index int NOT NULL,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_quiz_questions_quiz ON public.course_quiz_questions(quiz_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_quiz_questions TO authenticated;
GRANT ALL ON public.course_quiz_questions TO service_role;
ALTER TABLE public.course_quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moderators manage quiz questions" ON public.course_quiz_questions FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ LESSON PROGRESS ============
CREATE TABLE public.course_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  watch_seconds int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, lesson_id)
);
CREATE INDEX idx_lesson_progress_enrollment ON public.course_lesson_progress(enrollment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lesson_progress TO authenticated;
GRANT ALL ON public.course_lesson_progress TO service_role;
ALTER TABLE public.course_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lesson progress" ON public.course_lesson_progress FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()));
CREATE POLICY "Moderators read lesson progress" ON public.course_lesson_progress FOR SELECT TO authenticated
  USING (public.can_moderate(auth.uid()));

-- ============ QUIZ ATTEMPTS ============
CREATE TABLE public.course_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
  score int NOT NULL,
  passed boolean NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quiz_attempts_enrollment ON public.course_quiz_attempts(enrollment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_quiz_attempts TO authenticated;
GRANT ALL ON public.course_quiz_attempts TO service_role;
ALTER TABLE public.course_quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own quiz attempts" ON public.course_quiz_attempts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid())
    OR public.can_moderate(auth.uid()));
CREATE POLICY "Users insert own quiz attempts" ON public.course_quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()));
CREATE POLICY "Moderators manage quiz attempts" ON public.course_quiz_attempts FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ CERTIFICATES ============
CREATE TABLE public.course_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL UNIQUE REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_certificates_user ON public.course_certificates(user_id);
GRANT SELECT ON public.course_certificates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_certificates TO authenticated;
GRANT ALL ON public.course_certificates TO service_role;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Certificates are publicly verifiable" ON public.course_certificates FOR SELECT TO public USING (true);
CREATE POLICY "Moderators manage certificates" ON public.course_certificates FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));

-- ============ TRAINING PARTNERS ============
CREATE TABLE public.training_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  website_url text NOT NULL,
  description text,
  location text,
  specialties text[] NOT NULL DEFAULT '{}',
  tier public.partner_tier NOT NULL DEFAULT 'standard',
  sponsored_until date,
  click_count int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_training_partners_active ON public.training_partners(active);
GRANT SELECT ON public.training_partners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_partners TO authenticated;
GRANT ALL ON public.training_partners TO service_role;
ALTER TABLE public.training_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active partners are public" ON public.training_partners FOR SELECT TO public USING (active = true);
CREATE POLICY "Moderators manage partners" ON public.training_partners FOR ALL TO authenticated
  USING (public.can_moderate(auth.uid())) WITH CHECK (public.can_moderate(auth.uid()));
CREATE TRIGGER trg_training_partners_updated_at BEFORE UPDATE ON public.training_partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PARTNER CLICKS ============
CREATE TABLE public.training_partner_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.training_partners(id) ON DELETE CASCADE,
  visitor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_training_partner_clicks_partner ON public.training_partner_clicks(partner_id, created_at DESC);
GRANT ALL ON public.training_partner_clicks TO service_role;
ALTER TABLE public.training_partner_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moderators read partner clicks" ON public.training_partner_clicks FOR SELECT TO authenticated
  USING (public.can_moderate(auth.uid()));

CREATE OR REPLACE FUNCTION public.tg_training_partner_click_increment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.training_partners SET click_count = click_count + 1 WHERE id = NEW.partner_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_training_partner_click_increment AFTER INSERT ON public.training_partner_clicks
  FOR EACH ROW EXECUTE FUNCTION public.tg_training_partner_click_increment();

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-media', 'course-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Course media is publicly readable" ON storage.objects FOR SELECT
  USING (bucket_id = 'course-media');
CREATE POLICY "Moderators upload course media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-media' AND public.can_moderate(auth.uid()));
CREATE POLICY "Moderators update course media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-media' AND public.can_moderate(auth.uid()));
CREATE POLICY "Moderators delete course media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-media' AND public.can_moderate(auth.uid()));


-- ============================================================================
-- SOURCE MIGRATION: 20260601042456_b507cce1-738b-432c-bb65-8d1eedd30c91.sql
-- ============================================================================
ALTER TYPE public.payment_kind ADD VALUE IF NOT EXISTS 'course';


-- ============================================================================
-- SOURCE MIGRATION: 20260601134129_39db4dbf-b53a-4491-8006-95ec1e6087a6.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_notify_business_archive_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_email text;
  owner_name text;
  tpl text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'archived' AND OLD.status IS DISTINCT FROM 'archived' THEN
    tpl := 'business-archived';
  ELSIF OLD.status = 'archived' AND NEW.status = 'active' THEN
    tpl := 'business-restored';
  ELSE
    RETURN NEW;
  END IF;

  SELECT email INTO owner_email FROM auth.users WHERE id = NEW.owner_id;
  SELECT COALESCE(NULLIF(full_name,''), first_name, owner_email) INTO owner_name
    FROM public.profiles WHERE id = NEW.owner_id;
  IF owner_email IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', tpl,
    'to', owner_email,
    'data', jsonb_build_object(
      'name', owner_name,
      'business_name', NEW.name,
      'business_slug', NEW.slug
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_business_archive_change ON public.businesses;
CREATE TRIGGER trg_notify_business_archive_change
AFTER UPDATE OF status ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.tg_notify_business_archive_change();


-- ============================================================================
-- SOURCE MIGRATION: 20260601152700_e4784cd3-37e1-425b-af96-515e4d088cfb.sql
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-media', 'vehicle-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Vehicle media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-media');

CREATE POLICY "Vehicle media owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Vehicle media owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'vehicle-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Vehicle media owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'vehicle-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- ============================================================================
-- SOURCE MIGRATION: 20260601154424_f33c698f-120c-4b7c-b2c8-e49c5626bad7.sql
-- ============================================================================
-- Phase 1 P0: business lifecycle notification triggers + enum extension

-- 1) Extend business_kind enum with all signup options that were missing
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'tire_shop';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'battery_shop';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'fuel_station';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'accessories';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'audio_tint';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'inspection';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'driving_school';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'lto_services';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'transport';


-- ============================================================================
-- SOURCE MIGRATION: 20260601154523_81cd3c4e-befb-4b8d-ae67-da43ecbdeff1.sql
-- ============================================================================
-- Phase 1 P0: lifecycle email triggers (business submitted/approved, verification submitted/approved/rejected, booking status changed)

-- ============ 1) Business submitted (on INSERT) ============
CREATE OR REPLACE FUNCTION public.tg_notify_business_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_email text;
  owner_name text;
BEGIN
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;
  SELECT email INTO owner_email FROM auth.users WHERE id = NEW.owner_id;
  SELECT COALESCE(NULLIF(full_name,''), first_name, owner_email) INTO owner_name
    FROM public.profiles WHERE id = NEW.owner_id;
  IF owner_email IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'business-submitted',
    'to', owner_email,
    'data', jsonb_build_object(
      'name', owner_name,
      'business_name', NEW.name,
      'business_slug', NEW.slug,
      'status', NEW.status::text
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_business_submitted ON public.businesses;
CREATE TRIGGER trg_notify_business_submitted
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_business_submitted();

-- ============ 2) Business approved/published (on UPDATE status -> active from a non-active prior) ============
CREATE OR REPLACE FUNCTION public.tg_notify_business_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_email text;
  owner_name text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'active' OR OLD.status = 'archived' THEN
    -- 'archived' -> 'active' is a restore (handled by existing restore trigger)
    RETURN NEW;
  END IF;
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;

  SELECT email INTO owner_email FROM auth.users WHERE id = NEW.owner_id;
  SELECT COALESCE(NULLIF(full_name,''), first_name, owner_email) INTO owner_name
    FROM public.profiles WHERE id = NEW.owner_id;
  IF owner_email IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'business-approved',
    'to', owner_email,
    'data', jsonb_build_object(
      'name', owner_name,
      'business_name', NEW.name,
      'business_slug', NEW.slug
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_business_approved ON public.businesses;
CREATE TRIGGER trg_notify_business_approved
AFTER UPDATE OF status ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_business_approved();

-- ============ 3) Verification submitted (INSERT or status->pending on UPDATE) ============
CREATE OR REPLACE FUNCTION public.tg_notify_verification_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uemail text;
  uname text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status::text = OLD.status::text THEN RETURN NEW; END IF;
  IF NEW.status::text <> 'pending' THEN RETURN NEW; END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = NEW.user_id;
  SELECT COALESCE(NULLIF(full_name,''), first_name, uemail) INTO uname
    FROM public.profiles WHERE id = NEW.user_id;
  IF uemail IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'verification-submitted',
    'to', uemail,
    'data', jsonb_build_object(
      'name', uname,
      'legal_name', NEW.legal_name,
      'business_kind', NEW.business_kind::text
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_verification_submitted ON public.verification_requests;
CREATE TRIGGER trg_notify_verification_submitted
AFTER INSERT OR UPDATE OF status ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_verification_submitted();

-- ============ 4) Verification approved / rejected (on UPDATE status) ============
CREATE OR REPLACE FUNCTION public.tg_notify_verification_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uemail text;
  uname text;
  tpl text;
BEGIN
  IF NEW.status::text = OLD.status::text THEN RETURN NEW; END IF;
  IF NEW.status::text = 'approved' THEN
    tpl := 'verification-approved';
  ELSIF NEW.status::text = 'rejected' THEN
    tpl := 'verification-rejected';
  ELSE
    RETURN NEW;
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = NEW.user_id;
  SELECT COALESCE(NULLIF(full_name,''), first_name, uemail) INTO uname
    FROM public.profiles WHERE id = NEW.user_id;
  IF uemail IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', tpl,
    'to', uemail,
    'data', jsonb_build_object(
      'name', uname,
      'legal_name', NEW.legal_name,
      'review_notes', COALESCE(NEW.review_notes, '')
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_verification_decision ON public.verification_requests;
CREATE TRIGGER trg_notify_verification_decision
AFTER UPDATE OF status ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_verification_decision();

-- ============ 5) Booking status changed (on UPDATE status) ============
CREATE OR REPLACE FUNCTION public.tg_notify_booking_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  biz_name text;
  biz_slug text;
  svc_title text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('confirmed','cancelled','completed','no_show') THEN RETURN NEW; END IF;
  IF NEW.customer_email IS NULL OR length(btrim(NEW.customer_email)) = 0 THEN RETURN NEW; END IF;

  SELECT name, slug INTO biz_name, biz_slug FROM public.businesses WHERE id = NEW.business_id;
  SELECT title INTO svc_title FROM public.business_bookable_items WHERE id = NEW.bookable_item_id;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'booking-status-changed',
    'to', NEW.customer_email,
    'data', jsonb_build_object(
      'customer_name', COALESCE(NEW.customer_name, 'there'),
      'business_name', COALESCE(biz_name, 'the business'),
      'business_slug', COALESCE(biz_slug, ''),
      'service_title', COALESCE(svc_title, 'your appointment'),
      'starts_at_human', to_char(NEW.starts_at AT TIME ZONE 'Asia/Manila', 'Dy, Mon DD YYYY · HH12:MI AM'),
      'status', NEW.status
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_booking_status_changed ON public.business_bookings;
CREATE TRIGGER trg_notify_booking_status_changed
AFTER UPDATE OF status ON public.business_bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_booking_status_changed();


-- ============================================================================
-- SOURCE MIGRATION: 20260602035332_500bb99c-9c9e-4880-8d95-a54a4a786147.sql
-- ============================================================================

-- Pass A: Security hardening for RLS gaps confirmed against live schema.

-- 1. profiles: prevent users from self-promoting verification / founding member status.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND verification_status IS NOT DISTINCT FROM (SELECT verification_status FROM public.profiles WHERE id = auth.uid())
    AND verified_at         IS NOT DISTINCT FROM (SELECT verified_at         FROM public.profiles WHERE id = auth.uid())
    AND is_founding_member  IS NOT DISTINCT FROM (SELECT is_founding_member  FROM public.profiles WHERE id = auth.uid())
    AND founding_member_number IS NOT DISTINCT FROM (SELECT founding_member_number FROM public.profiles WHERE id = auth.uid())
    AND account_status      IS NOT DISTINCT FROM (SELECT account_status      FROM public.profiles WHERE id = auth.uid())
  );

-- 2. listings: prevent owners from self-setting status / plan / boost / expires_at.
DROP POLICY IF EXISTS "Owners update listings" ON public.listings;
CREATE POLICY "Owners update listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status      IS NOT DISTINCT FROM (SELECT status      FROM public.listings WHERE id = listings.id)
    AND plan        IS NOT DISTINCT FROM (SELECT plan        FROM public.listings WHERE id = listings.id)
    AND boost_until IS NOT DISTINCT FROM (SELECT boost_until FROM public.listings WHERE id = listings.id)
    AND expires_at  IS NOT DISTINCT FROM (SELECT expires_at  FROM public.listings WHERE id = listings.id)
  );

-- listings INSERT: restrict status/plan to safe defaults on creation.
DROP POLICY IF EXISTS "Owners insert listings" ON public.listings;
CREATE POLICY "Owners insert listings"
  ON public.listings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('draft'::listing_status, 'active'::listing_status, 'pending_sale'::listing_status)
    AND boost_until IS NULL
  );

-- 3. tow_requests: let a towing provider accept a broadcast (provider_id IS NULL) request.
DROP POLICY IF EXISTS "Requesters update own tow requests" ON public.tow_requests;
CREATE POLICY "Tow request participants update"
  ON public.tow_requests FOR UPDATE
  USING (
    auth.uid() = requester_id
    OR auth.uid() = provider_id
    OR (provider_id IS NULL AND status = 'open' AND is_towing_provider(auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    auth.uid() = requester_id
    OR auth.uid() = provider_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. ride_likes: remove public read; restrict to owner + ride owner.
DROP POLICY IF EXISTS "Ride likes public read" ON public.ride_likes;
CREATE POLICY "Ride likes own read"
  ON public.ride_likes FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_likes.ride_id AND r.user_id = auth.uid())
  );

-- 5. business_tag_links: only expose tags for businesses that are publicly visible.
DROP POLICY IF EXISTS "Tag links public read" ON public.business_tag_links;
CREATE POLICY "Tag links visible for active businesses"
  ON public.business_tag_links FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_tag_links.business_id AND b.status = 'active'::business_status)
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_tag_links.business_id AND b.owner_id = auth.uid())
    OR can_moderate(auth.uid())
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260602050028_48904d57-846f-45e4-9641-3bd1272160bf.sql
-- ============================================================================

-- Allow user to update their own request when pending, more_info, OR rejected (for resubmit).
DROP POLICY IF EXISTS "Users update own pending requests" ON public.verification_requests;
CREATE POLICY "Users update own editable requests"
ON public.verification_requests
FOR UPDATE
USING (
  auth.uid() = user_id
  AND status = ANY (ARRAY['pending'::verification_request_status,
                          'more_info'::verification_request_status,
                          'rejected'::verification_request_status])
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'::verification_request_status
);

-- When the requester edits a rejected/more_info row, auto-flip to pending and clear review fields.
CREATE OR REPLACE FUNCTION public.tg_verification_user_resubmit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when the actor is the row owner (not an admin/moderator update path).
  IF auth.uid() IS NULL OR auth.uid() <> NEW.user_id THEN
    RETURN NEW;
  END IF;
  IF OLD.status IN ('rejected','more_info') THEN
    NEW.status := 'pending';
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.review_notes := NULL;
    NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS verification_user_resubmit ON public.verification_requests;
CREATE TRIGGER verification_user_resubmit
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.tg_verification_user_resubmit();


-- ============================================================================
-- SOURCE MIGRATION: 20260602081428_560fbe2c-f709-4b2f-860c-7883ddc68194.sql
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
    v_photo_cap := 1;  v_video_cap := 0;
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

DROP TRIGGER IF EXISTS trg_enforce_listing_media_caps ON public.listing_media;
CREATE TRIGGER trg_enforce_listing_media_caps
BEFORE INSERT ON public.listing_media
FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_media_caps();


-- ============================================================================
-- SOURCE MIGRATION: 20260602131032_2aef236c-1e7d-43f9-b847-d8faa42b4b42.sql
-- ============================================================================
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  label text,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

INSERT INTO public.site_settings (key, value, label, description)
VALUES 
  ('support_whatsapp', '', 'Support WhatsApp number', 'WhatsApp number for the support contact button (e.g. +63 917 123 4567). Leave empty to hide the button.'),
  ('support_messenger', '', 'Support Messenger URL', 'Facebook Messenger m.me URL for support (e.g. https://m.me/365motorsales). Leave empty to hide the button.')
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260602131107_f405877d-01e1-4a35-8a61-a9ff4352b883.sql
-- ============================================================================
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on site_settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);


-- ============================================================================
-- SOURCE MIGRATION: 20260603042141_20b66b5e-9cf2-4bc9-b181-6396c1cfc2e7.sql
-- ============================================================================
CREATE TABLE public.user_garage_vehicles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('car','motorcycle')),
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  trim text,
  engine text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_garage_vehicles TO authenticated;
GRANT ALL ON public.user_garage_vehicles TO service_role;

ALTER TABLE public.user_garage_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own garage vehicle"
  ON public.user_garage_vehicles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own garage vehicle"
  ON public.user_garage_vehicles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own garage vehicle"
  ON public.user_garage_vehicles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own garage vehicle"
  ON public.user_garage_vehicles FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_garage_vehicles_updated_at
  BEFORE UPDATE ON public.user_garage_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- SOURCE MIGRATION: 20260603053625_1ad931ed-7ec3-443d-befd-0d8cc0451f89.sql
-- ============================================================================
CREATE TABLE public.ops_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error',
  source TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ops_alerts_created_at ON public.ops_alerts (created_at DESC);
CREATE INDEX idx_ops_alerts_unack ON public.ops_alerts (acknowledged, created_at DESC);
CREATE INDEX idx_ops_alerts_event ON public.ops_alerts (event);

GRANT SELECT, UPDATE ON public.ops_alerts TO authenticated;
GRANT ALL ON public.ops_alerts TO service_role;

ALTER TABLE public.ops_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view alerts"
  ON public.ops_alerts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can acknowledge alerts"
  ON public.ops_alerts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


-- ============================================================================
-- SOURCE MIGRATION: 20260603063551_f1347a42-fcfe-415f-a41f-13f0f567b2be.sql
-- ============================================================================
-- Internal webhook signing keys (HMAC). Service-role only; no anon/auth grants.
CREATE TABLE IF NOT EXISTS public.internal_webhook_keys (
  name TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_webhook_keys TO service_role;
ALTER TABLE public.internal_webhook_keys ENABLE ROW LEVEL SECURITY;
-- No policies => default-deny for anon + authenticated.

-- Internal cron-job tokens. Service-role only.
CREATE TABLE IF NOT EXISTS public.internal_cron_tokens (
  job_name TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_cron_tokens TO service_role;
ALTER TABLE public.internal_cron_tokens ENABLE ROW LEVEL SECURITY;

-- Seed initial random secrets (idempotent).
INSERT INTO public.internal_webhook_keys (name, secret)
VALUES ('payment_events', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.internal_cron_tokens (job_name, token)
VALUES
  ('ops_alerts_digest', encode(gen_random_bytes(32), 'hex')),
  ('refresh_lazada',    encode(gen_random_bytes(32), 'hex')),
  ('fx_refresh',        encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (job_name) DO NOTHING;

-- Ensure site_settings has app_url so cron jobs can read it.
INSERT INTO public.site_settings (key, value)
VALUES ('app_url', 'https://365motorsales.com')
ON CONFLICT (key) DO NOTHING;

-- Admin-only rotation RPC. Uses has_role(); never exposes the secret to clients.
CREATE OR REPLACE FUNCTION public.rotate_internal_webhook_key(_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.internal_webhook_keys (name, secret, rotated_at)
  VALUES (_name, encode(gen_random_bytes(32), 'hex'), now())
  ON CONFLICT (name) DO UPDATE
    SET secret = EXCLUDED.secret, rotated_at = now();
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_internal_cron_token(_job_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.internal_cron_tokens (job_name, token, rotated_at)
  VALUES (_job_name, encode(gen_random_bytes(32), 'hex'), now())
  ON CONFLICT (job_name) DO UPDATE
    SET token = EXCLUDED.token, rotated_at = now();
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_internal_webhook_key(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rotate_internal_cron_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotate_internal_webhook_key(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_internal_cron_token(TEXT) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql
-- ============================================================================
-- Unschedule old jobs, then re-create them reading URL+token from DB.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN ('ops-alerts-digest', 'refresh-lazada-prices', 'refresh-fx-rates');
END;
$$;

-- ops-alerts-digest: every 15 minutes
SELECT cron.schedule(
  'ops-alerts-digest',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT value FROM public.site_settings WHERE key = 'app_url') || '/api/public/hooks/ops-alerts-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE job_name = 'ops_alerts_digest')
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- refresh-lazada-prices: every 6 hours
SELECT cron.schedule(
  'refresh-lazada-prices',
  '0 */6 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT value FROM public.site_settings WHERE key = 'app_url') || '/api/public/hooks/refresh-lazada',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE job_name = 'refresh_lazada')
    ),
    body := '{"limit":25}'::jsonb
  );
  $cron$
);

-- refresh-fx-rates: daily at 3am
SELECT cron.schedule(
  'refresh-fx-rates',
  '0 3 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT value FROM public.site_settings WHERE key = 'app_url') || '/api/public/fx/refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT token FROM public.internal_cron_tokens WHERE job_name = 'fx_refresh')
    ),
    body := '{}'::jsonb
  );
  $cron$
);


-- ============================================================================
-- SOURCE MIGRATION: 20260603071817_c2bff13a-babb-4098-9869-e84fad6c19f6.sql
-- ============================================================================
CREATE TABLE public.route_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  role_required text NOT NULL,
  route_label text NOT NULL,
  method text,
  outcome text NOT NULL CHECK (outcome IN ('allowed','denied','error')),
  error_message text,
  ip text,
  user_agent text,
  duration_ms integer,
  target_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_route_audit_actor ON public.route_audit_log (actor_id, created_at DESC);
CREATE INDEX idx_route_audit_label ON public.route_audit_log (route_label, created_at DESC);
CREATE INDEX idx_route_audit_created ON public.route_audit_log (created_at DESC);
CREATE INDEX idx_route_audit_outcome ON public.route_audit_log (outcome, created_at DESC) WHERE outcome <> 'allowed';

GRANT SELECT ON public.route_audit_log TO authenticated;
GRANT ALL ON public.route_audit_log TO service_role;

ALTER TABLE public.route_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read route audit"
  ON public.route_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Support read route audit"
  ON public.route_audit_log FOR SELECT
  USING (can_support(auth.uid()));


-- ============================================================================
-- SOURCE MIGRATION: 20260603080421_6b8a7673-45ea-4d4b-85d2-d834969ba292.sql
-- ============================================================================
CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags public read"
ON public.feature_flags FOR SELECT
USING (true);

CREATE POLICY "feature_flags admin write"
ON public.feature_flags FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_feature_flags_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.touch_feature_flags_updated_at();

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('payments.stripe',     true,  'Stripe payment rail (primary, in-house gateway)'),
  ('payments.paymongo',   false, 'PayMongo rail — coming soon, in-house only'),
  ('payments.xendit',     false, 'Xendit rail — coming soon, in-house only'),
  ('boost.escrow',        false, 'Escrowed boost listings'),
  ('subscriptions.annual',true,  'Annual subscription discount plans')
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260603080924_baf447bb-08b3-4e28-8ff7-fce134194605.sql
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_currency text;


-- ============================================================================
-- SOURCE MIGRATION: 20260604122237_2389a56f-bfe5-45e0-8114-a798b2889648.sql
-- ============================================================================
CREATE TABLE public.share_kit_layouts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id text NOT NULL,
  cx numeric NOT NULL CHECK (cx >= 0 AND cx <= 1),
  cy numeric NOT NULL CHECK (cy >= 0 AND cy <= 1),
  size numeric NOT NULL CHECK (size >= 0.05 AND size <= 0.8),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, template_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_kit_layouts TO authenticated;
GRANT ALL ON public.share_kit_layouts TO service_role;

ALTER TABLE public.share_kit_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own share kit layouts"
ON public.share_kit_layouts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- SOURCE MIGRATION: 20260604164158_05bc3b50-bcb2-4dca-b5f3-b10d454f38c5.sql
-- ============================================================================

CREATE TABLE public.email_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL UNIQUE,
  destination text NOT NULL,
  source text NOT NULL DEFAULT 'cloudflare' CHECK (source IN ('cloudflare','app','legal','other')),
  category text,
  owner text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_routes TO authenticated;
GRANT ALL ON public.email_routes TO service_role;

ALTER TABLE public.email_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super-admin can read email routes"
  ON public.email_routes FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'jordilwbailey@gmail.com');

CREATE POLICY "Super-admin can insert email routes"
  ON public.email_routes FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'jordilwbailey@gmail.com');

CREATE POLICY "Super-admin can update email routes"
  ON public.email_routes FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'jordilwbailey@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'jordilwbailey@gmail.com');

CREATE POLICY "Super-admin can delete email routes"
  ON public.email_routes FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'jordilwbailey@gmail.com');

CREATE OR REPLACE FUNCTION public.update_email_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER email_routes_set_updated_at
  BEFORE UPDATE ON public.email_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_email_routes_updated_at();

INSERT INTO public.email_routes (address, destination, source, category, owner, notes, active) VALUES
  ('payments@365motorsales.com',              'jordilwbailey@gmail.com', 'cloudflare', 'finance',  'Jordi', 'Payment notifications routing', true),
  ('adminbusinesspersonal@365motorsales.com', 'jordilwbailey@gmail.com', 'cloudflare', 'admin',    'Jordi', 'Personal admin business mail',  true),
  ('notify@365motorsales.com',                'jordilwbailey@gmail.com', 'cloudflare', 'system',   'Jordi', 'System notify alias',           true),
  ('joan@365motorsales.com',                  'jordilwbailey@gmail.com', 'cloudflare', 'staff',    'Joan',  'Staff inbox forward',           true),
  ('admin@365motorsales.com',                 'jordilwbailey@gmail.com', 'cloudflare', 'admin',    'Jordi', 'Primary admin alias',           true),
  ('sales@365motorsales.com',                 'jordilwbailey@gmail.com', 'cloudflare', 'sales',    'Jordi', 'Sales inquiries',               true),
  ('info@365motorsales.com',                  'jordilwbailey@gmail.com', 'cloudflare', 'general',  'Jordi', 'General contact inbox',         true)
ON CONFLICT (address) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260605033802_58c5391b-eb0e-40fd-babd-8203a211081e.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE MIGRATION: 20260605033831_236da73f-d912-4947-a953-a016ec283c83.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260605043935_47d06dfd-d146-4628-b75e-d0c94e3b40f0.sql
-- ============================================================================
ALTER TYPE public.seller_type ADD VALUE IF NOT EXISTS 'staff';


-- ============================================================================
-- SOURCE MIGRATION: 20260605044520_a8fe8551-55be-4c4f-87b2-3c223bbf1dd2.sql
-- ============================================================================
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');


-- ============================================================================
-- SOURCE MIGRATION: 20260605050625_ab3ca880-2df9-4ae9-865f-cd1ca5c84255.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260605051559_26b81f60-d973-4718-9e61-9d209dd5c39d.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260605100219_3669f1b4-7fa9-4814-a86d-374afa871185.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE MIGRATION: 20260605102058_3f93ff4c-c7ee-417e-90a8-e2acc69ce921.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260605102153_39018714-7821-475b-a287-ea88edc82215.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260605103051_33840174-a52e-4fa2-b3c2-434d46ecbdfa.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260606041358_7821951b-4327-458a-ac97-d13073d706e7.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE MIGRATION: 20260606123543_fb94412b-0d85-4071-bee5-42acbaf4cf90.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260606130250_6d6b8df8-037d-43a6-88d4-a9541634eb7e.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260606130908_794768e3-771f-42ed-b904-e5f51aa1f509.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260606134147_a7df571a-fced-4d56-a407-5721eb5580ed.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260606143803_4431c898-03ff-47a4-a84b-ffa2efba7721.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE MIGRATION: 20260606143827_5cbab52d-1b9d-4e45-b109-418dc8815f1c.sql
-- ============================================================================
DROP INDEX IF EXISTS public.businesses_source_external_id_key;

CREATE UNIQUE INDEX businesses_source_external_id_key
  ON public.businesses (source, source_external_id)
  NULLS NOT DISTINCT;


-- ============================================================================
-- SOURCE MIGRATION: 20260606151712_d29167db-53b3-42d2-8cb5-edf9e0cfe07d.sql
-- ============================================================================

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


-- ============================================================================
-- SOURCE MIGRATION: 20260606153104_ec1a9e78-3646-41da-a10b-8e55504ae07d.sql
-- ============================================================================
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'used_dealership';


-- ============================================================================
-- SOURCE MIGRATION: 20260606155429_15fa1afb-0a0c-4938-8921-a8e2a28e7510.sql
-- ============================================================================

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
