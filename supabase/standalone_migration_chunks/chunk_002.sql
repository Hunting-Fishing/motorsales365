-- 365 standalone migration package | chunk_002.sql | 68 source migrations
-- Byte-for-byte concatenation of supabase/migrations. No SQL modified.

-- ===== BEGIN SOURCE MIGRATION: 20260522104711_7af12507-0ffa-4809-b770-7c0d2419c318.sql =====

-- 1. Remove the weekly free-listing cap
DROP TRIGGER IF EXISTS trg_enforce_free_listing_quota ON public.listings;

-- 2. Add export availability to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS export_available boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_listings_export_available ON public.listings(export_available) WHERE export_available = true;

-- 3. Business Trial plan
INSERT INTO public.subscription_plans (name, price_php, listings_per_month, max_photos_per_listing, active, sort_order)
SELECT 'Business Trial', 0, NULL, 30, true, 5
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'Business Trial');

-- 4. Auto-grant trial
CREATE OR REPLACE FUNCTION public.grant_business_trial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  trial_plan_id uuid;
  business_kinds text[] := ARRAY['dealer','repair_shop','insurance'];
BEGIN
  IF NEW.business_kind IS NULL OR NEW.business_kind::text <> ANY(business_kinds) THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id AND status = 'active') THEN RETURN NEW; END IF;
  SELECT id INTO trial_plan_id FROM public.subscription_plans WHERE name = 'Business Trial' LIMIT 1;
  IF trial_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, complimentary, current_period_end, notes)
    VALUES (NEW.id, trial_plan_id, 'active', true, now() + interval '6 months', 'Auto-granted 6-month business trial')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_grant_business_trial ON public.profiles;
CREATE TRIGGER trg_grant_business_trial
AFTER INSERT OR UPDATE OF business_kind, verification_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_business_trial();

-- 5. Types (idempotent)
DO $$ BEGIN
  CREATE TYPE ad_placement AS ENUM ('home_carousel','browse_top','rides_top','listing_sidebar','export_top');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ad_status AS ENUM ('draft','scheduled','active','paused','ended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE export_inquiry_status AS ENUM ('new','qualified','quoted','won','lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Advertisements
CREATE TABLE IF NOT EXISTS public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  advertiser_name text,
  advertiser_email text,
  image_url text NOT NULL,
  target_url text NOT NULL,
  placement ad_placement NOT NULL,
  caption text,
  starts_at timestamptz,
  ends_at timestamptz,
  priority int NOT NULL DEFAULT 0,
  status ad_status NOT NULL DEFAULT 'draft',
  impressions_count int NOT NULL DEFAULT 0,
  clicks_count int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advertisements_active_placement ON public.advertisements(placement, priority DESC) WHERE status = 'active';

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.advertisements;
CREATE POLICY "Anyone can view active ads" ON public.advertisements FOR SELECT
  USING (status = 'active' AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
DROP POLICY IF EXISTS "Ad managers can view all" ON public.advertisements;
CREATE POLICY "Ad managers can view all" ON public.advertisements FOR SELECT TO authenticated
  USING (public.can_manage_ads(auth.uid()));
DROP POLICY IF EXISTS "Ad managers can insert" ON public.advertisements;
CREATE POLICY "Ad managers can insert" ON public.advertisements FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_ads(auth.uid()));
DROP POLICY IF EXISTS "Ad managers can update" ON public.advertisements;
CREATE POLICY "Ad managers can update" ON public.advertisements FOR UPDATE TO authenticated
  USING (public.can_manage_ads(auth.uid()));
DROP POLICY IF EXISTS "Ad managers can delete" ON public.advertisements;
CREATE POLICY "Ad managers can delete" ON public.advertisements FOR DELETE TO authenticated
  USING (public.can_manage_ads(auth.uid()));

DROP TRIGGER IF EXISTS trg_advertisements_updated_at ON public.advertisements;
CREATE TRIGGER trg_advertisements_updated_at BEFORE UPDATE ON public.advertisements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Ad events
CREATE TABLE IF NOT EXISTS public.ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('impression','click')),
  visitor_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_events_ad_id_created_at ON public.ad_events(ad_id, created_at DESC);

ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can record ad events" ON public.ad_events;
CREATE POLICY "Anyone can record ad events" ON public.ad_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Ad managers view events" ON public.ad_events;
CREATE POLICY "Ad managers view events" ON public.ad_events FOR SELECT TO authenticated
  USING (public.can_manage_ads(auth.uid()));

CREATE OR REPLACE FUNCTION public.ad_events_increment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.event_type = 'impression' THEN
    UPDATE public.advertisements SET impressions_count = impressions_count + 1 WHERE id = NEW.ad_id;
  ELSIF NEW.event_type = 'click' THEN
    UPDATE public.advertisements SET clicks_count = clicks_count + 1 WHERE id = NEW.ad_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ad_events_increment ON public.ad_events;
CREATE TRIGGER trg_ad_events_increment AFTER INSERT ON public.ad_events
FOR EACH ROW EXECUTE FUNCTION public.ad_events_increment();

-- 8. Export inquiries
CREATE TABLE IF NOT EXISTS public.export_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_phone text,
  country text NOT NULL,
  destination_port text,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  vehicle_interest text,
  budget_usd numeric,
  message text NOT NULL,
  status export_inquiry_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_notes text,
  submitter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_export_inquiries_status ON public.export_inquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_inquiries_listing ON public.export_inquiries(listing_id);

ALTER TABLE public.export_inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit export inquiry" ON public.export_inquiries;
CREATE POLICY "Anyone can submit export inquiry" ON public.export_inquiries FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Staff can view export inquiries" ON public.export_inquiries;
CREATE POLICY "Staff can view export inquiries" ON public.export_inquiries FOR SELECT TO authenticated
  USING (public.can_support(auth.uid()));
DROP POLICY IF EXISTS "Staff can update export inquiries" ON public.export_inquiries;
CREATE POLICY "Staff can update export inquiries" ON public.export_inquiries FOR UPDATE TO authenticated
  USING (public.can_support(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete export inquiries" ON public.export_inquiries;
CREATE POLICY "Admins can delete export inquiries" ON public.export_inquiries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_export_inquiries_updated_at ON public.export_inquiries;
CREATE TRIGGER trg_export_inquiries_updated_at BEFORE UPDATE ON public.export_inquiries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-media','ad-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Ad media public read" ON storage.objects;
CREATE POLICY "Ad media public read" ON storage.objects FOR SELECT USING (bucket_id = 'ad-media');
DROP POLICY IF EXISTS "Ad managers can upload ad media" ON storage.objects;
CREATE POLICY "Ad managers can upload ad media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ad-media' AND public.can_manage_ads(auth.uid()));
DROP POLICY IF EXISTS "Ad managers can update ad media" ON storage.objects;
CREATE POLICY "Ad managers can update ad media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ad-media' AND public.can_manage_ads(auth.uid()));
DROP POLICY IF EXISTS "Ad managers can delete ad media" ON storage.objects;
CREATE POLICY "Ad managers can delete ad media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ad-media' AND public.can_manage_ads(auth.uid()));

-- ===== END SOURCE MIGRATION: 20260522104711_7af12507-0ffa-4809-b770-7c0d2419c318.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260522104828_c3809a3b-82da-4574-a337-d01968648c9b.sql =====

ALTER TYPE ad_placement ADD VALUE IF NOT EXISTS 'home_carousel';
ALTER TYPE ad_placement ADD VALUE IF NOT EXISTS 'browse_top';
ALTER TYPE ad_placement ADD VALUE IF NOT EXISTS 'rides_top';
ALTER TYPE ad_placement ADD VALUE IF NOT EXISTS 'export_top';

-- ===== END SOURCE MIGRATION: 20260522104828_c3809a3b-82da-4574-a337-d01968648c9b.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260522111105_2c76877e-25cd-41b5-aed4-03377ce2bb42.sql =====

-- Extend ad_placement enum
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'shop_top';
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'shop_sidebar';

-- can_manage_shop helper
CREATE OR REPLACE FUNCTION public.can_manage_shop(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','advertising','sales')
  )
$$;

-- Affiliate networks
CREATE TABLE public.affiliate_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tag_param text,
  tag_value text,
  deeplink_template text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_networks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active networks public read" ON public.affiliate_networks FOR SELECT USING (active = true OR public.can_manage_shop(auth.uid()));
CREATE POLICY "Shop managers manage networks" ON public.affiliate_networks FOR ALL USING (public.can_manage_shop(auth.uid())) WITH CHECK (public.can_manage_shop(auth.uid()));

-- Shop categories
CREATE TABLE public.shop_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active categories public read" ON public.shop_categories FOR SELECT USING (active = true OR public.can_manage_shop(auth.uid()));
CREATE POLICY "Shop managers manage categories" ON public.shop_categories FOR ALL USING (public.can_manage_shop(auth.uid())) WITH CHECK (public.can_manage_shop(auth.uid()));

-- Shop products
CREATE TABLE public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  brand text,
  image_url text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  category_id uuid REFERENCES public.shop_categories(id) ON DELETE SET NULL,
  price_php numeric,
  currency text NOT NULL DEFAULT 'PHP',
  tags text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  click_count int NOT NULL DEFAULT 0,
  view_count int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_products_category ON public.shop_products(category_id);
CREATE INDEX idx_shop_products_active ON public.shop_products(active) WHERE active = true;
CREATE INDEX idx_shop_products_featured ON public.shop_products(featured) WHERE featured = true;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products public read" ON public.shop_products FOR SELECT USING (active = true OR public.can_manage_shop(auth.uid()));
CREATE POLICY "Shop managers manage products" ON public.shop_products FOR ALL USING (public.can_manage_shop(auth.uid())) WITH CHECK (public.can_manage_shop(auth.uid()));

CREATE TRIGGER shop_products_updated_at BEFORE UPDATE ON public.shop_products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER affiliate_networks_updated_at BEFORE UPDATE ON public.affiliate_networks FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Shop product links (per network)
CREATE TABLE public.shop_product_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  network_id uuid NOT NULL REFERENCES public.affiliate_networks(id) ON DELETE CASCADE,
  url text NOT NULL,
  sku text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, network_id)
);
CREATE INDEX idx_shop_product_links_product ON public.shop_product_links(product_id);
ALTER TABLE public.shop_product_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product links public read" ON public.shop_product_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.shop_products p WHERE p.id = product_id AND (p.active = true OR public.can_manage_shop(auth.uid())))
);
CREATE POLICY "Shop managers manage links" ON public.shop_product_links FOR ALL USING (public.can_manage_shop(auth.uid())) WITH CHECK (public.can_manage_shop(auth.uid()));

-- Shop clicks
CREATE TABLE public.shop_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  network_id uuid REFERENCES public.affiliate_networks(id) ON DELETE SET NULL,
  visitor_id uuid,
  user_id uuid,
  referrer text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_clicks_product_date ON public.shop_clicks(product_id, created_at DESC);
ALTER TABLE public.shop_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record shop clicks" ON public.shop_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Shop managers view clicks" ON public.shop_clicks FOR SELECT USING (public.can_manage_shop(auth.uid()));

-- Increment click_count trigger
CREATE OR REPLACE FUNCTION public.tg_shop_click_increment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.shop_products SET click_count = click_count + 1 WHERE id = NEW.product_id;
  RETURN NEW;
END $$;
CREATE TRIGGER shop_clicks_increment AFTER INSERT ON public.shop_clicks FOR EACH ROW EXECUTE FUNCTION public.tg_shop_click_increment();

-- Seed networks
INSERT INTO public.affiliate_networks (slug, name, tag_param, tag_value, sort_order) VALUES
  ('shopee', 'Shopee PH', 'af_siteid', '', 1),
  ('lazada', 'Lazada PH', 'sub_aff_id', '', 2),
  ('aliexpress', 'AliExpress', 'aff_fcid', '', 3),
  ('tiktok_shop', 'TikTok Shop PH', null, null, 4),
  ('amazon', 'Amazon', 'tag', '', 5),
  ('generic', 'Direct / Other', null, null, 99)
ON CONFLICT (slug) DO NOTHING;

-- Seed categories
INSERT INTO public.shop_categories (slug, name, icon, sort_order) VALUES
  ('detailing', 'Car Detailing', 'sparkles', 1),
  ('tools', 'Mechanic Tools', 'wrench', 2),
  ('parts', 'Parts & Spares', 'cog', 3),
  ('electronics', 'Electronics', 'cpu', 4),
  ('accessories', 'Accessories', 'sticker', 5),
  ('tires-wheels', 'Tires & Wheels', 'circle-dot', 6),
  ('lubricants', 'Lubricants & Fluids', 'droplet', 7),
  ('safety', 'Safety & Recovery', 'shield', 8)
ON CONFLICT (slug) DO NOTHING;

-- ===== END SOURCE MIGRATION: 20260522111105_2c76877e-25cd-41b5-aed4-03377ce2bb42.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260522114743_f950325b-850b-45ed-a26c-13ea8a733ae4.sql =====

-- Add universal_fit flag to products
ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS universal_fit boolean NOT NULL DEFAULT false;

-- Fitment table: a product fits a (make, model, year-range) combo.
-- Nulls mean "any" at that level (e.g. make=Toyota, model=null => fits any Toyota).
CREATE TABLE IF NOT EXISTS public.shop_product_fitment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'car' CHECK (category IN ('car','motorcycle')),
  make text,
  model text,
  year_start int,
  year_end int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fitment_product ON public.shop_product_fitment(product_id);
CREATE INDEX IF NOT EXISTS idx_fitment_make_model ON public.shop_product_fitment(make, model);

ALTER TABLE public.shop_product_fitment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fitment is publicly readable"
  ON public.shop_product_fitment FOR SELECT
  USING (true);

CREATE POLICY "Shop managers can insert fitment"
  ON public.shop_product_fitment FOR INSERT
  WITH CHECK (public.can_manage_shop(auth.uid()));

CREATE POLICY "Shop managers can update fitment"
  ON public.shop_product_fitment FOR UPDATE
  USING (public.can_manage_shop(auth.uid()));

CREATE POLICY "Shop managers can delete fitment"
  ON public.shop_product_fitment FOR DELETE
  USING (public.can_manage_shop(auth.uid()));

-- ===== END SOURCE MIGRATION: 20260522114743_f950325b-850b-45ed-a26c-13ea8a733ae4.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260522154030_bd6a15a5-99ea-4f5e-a39f-93c3e1980ef9.sql =====

CREATE TABLE public.ride_service_log_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id uuid NOT NULL REFERENCES public.ride_service_log(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_ride_service_log_photos_log_id ON public.ride_service_log_photos(log_id, sort_order);

ALTER TABLE public.ride_service_log_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service log photos public read"
ON public.ride_service_log_photos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.ride_service_log s
  JOIN public.rides r ON r.id = s.ride_id
  WHERE s.id = ride_service_log_photos.log_id
    AND (r.status = 'published'::ride_status OR r.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Owners manage service log photos"
ON public.ride_service_log_photos FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.ride_service_log s
  JOIN public.rides r ON r.id = s.ride_id
  WHERE s.id = ride_service_log_photos.log_id AND r.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ride_service_log s
  JOIN public.rides r ON r.id = s.ride_id
  WHERE s.id = ride_service_log_photos.log_id AND r.user_id = auth.uid()
));

CREATE POLICY "Admins manage service log photos"
ON public.ride_service_log_photos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.enforce_service_log_photo_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.ride_service_log_photos WHERE log_id = NEW.log_id) >= 100 THEN
    RAISE EXCEPTION 'A service log entry can have at most 100 photos';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_service_log_photo_limit
BEFORE INSERT ON public.ride_service_log_photos
FOR EACH ROW EXECUTE FUNCTION public.enforce_service_log_photo_limit();

-- ===== END SOURCE MIGRATION: 20260522154030_bd6a15a5-99ea-4f5e-a39f-93c3e1980ef9.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260522154420_43b47bf7-cd96-4923-9329-2ae7dadfbef3.sql =====

CREATE OR REPLACE FUNCTION public.enforce_service_log_photo_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.ride_service_log_photos WHERE log_id = NEW.log_id) >= 20 THEN
    RAISE EXCEPTION 'A service log entry can have at most 20 photos';
  END IF;
  RETURN NEW;
END;
$$;

-- ===== END SOURCE MIGRATION: 20260522154420_43b47bf7-cd96-4923-9329-2ae7dadfbef3.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260523101642_b10e46d3-8424-4a6c-b124-908ca9b23ea6.sql =====

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS price_label text,
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_source_external_id_unique
  ON public.businesses (source, source_external_id)
  WHERE source_external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS businesses_lat_lng_idx
  ON public.businesses (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- ===== END SOURCE MIGRATION: 20260523101642_b10e46d3-8424-4a6c-b124-908ca9b23ea6.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260524133901_0b73cc17-e47e-4d09-a47b-be80c742536d.sql =====
CREATE TABLE public.shop_favorites (
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX idx_shop_favorites_user ON public.shop_favorites(user_id, created_at DESC);

ALTER TABLE public.shop_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own shop favorites"
ON public.shop_favorites
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read shop favorites"
ON public.shop_favorites
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
-- ===== END SOURCE MIGRATION: 20260524133901_0b73cc17-e47e-4d09-a47b-be80c742536d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260525021220_1704181b-8d1c-446c-9098-3b6bf1b4497b.sql =====

-- 1. Drop the over-broad public SELECT policy on profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- 2. Add an own-row SELECT policy so users can still read their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 3. Create a SECURITY DEFINER public view exposing only non-sensitive fields.
--    Postgres views run as the view owner by default, which lets anon/auth
--    clients read these safe columns without exposing phone numbers or
--    Facebook verification codes through the underlying table.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT
  id,
  full_name,
  avatar_url,
  seller_type,
  business_name,
  business_logo_url,
  business_address,
  business_region,
  business_province,
  business_city,
  business_barangay,
  business_lat,
  business_lng,
  business_hours,
  business_kind,
  verification_status,
  verified_at,
  fb_profile_url,
  fb_profile_id,
  fb_verified_at,
  is_founding_member,
  founding_member_number,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ===== END SOURCE MIGRATION: 20260525021220_1704181b-8d1c-446c-9098-3b6bf1b4497b.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260525110546_bcdd53df-2d19-4f55-bc0e-4b364fa2db0a.sql =====

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

-- ===== END SOURCE MIGRATION: 20260525110546_bcdd53df-2d19-4f55-bc0e-4b364fa2db0a.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260525122358_a9ae8cc8-acf8-4ce2-b2fd-52154331f6c3.sql =====
-- Add missing business kinds used by the directory ladder
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'financing';
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'trucking';

-- ===== END SOURCE MIGRATION: 20260525122358_a9ae8cc8-acf8-4ce2-b2fd-52154331f6c3.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260525122506_288550cc-cdd5-4c54-8926-9990a6df896a.sql =====
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

-- ===== END SOURCE MIGRATION: 20260525122506_288550cc-cdd5-4c54-8926-9990a6df896a.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260525125312_004fb4cf-07b7-4034-ab89-43e5c7e6becf.sql =====
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

-- ===== END SOURCE MIGRATION: 20260525125312_004fb4cf-07b7-4034-ab89-43e5c7e6becf.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260525131427_be1ff2ed-4252-4891-8033-514954cadfc8.sql =====

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

-- ===== END SOURCE MIGRATION: 20260525131427_be1ff2ed-4252-4891-8033-514954cadfc8.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260525154337_8148e969-e07c-4e8c-b8bc-2f4a19c2e1d3.sql =====

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

-- ===== END SOURCE MIGRATION: 20260525154337_8148e969-e07c-4e8c-b8bc-2f4a19c2e1d3.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260525155935_31efaded-ef49-43e7-945b-f213f41edda7.sql =====

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

-- ===== END SOURCE MIGRATION: 20260525155935_31efaded-ef49-43e7-945b-f213f41edda7.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260525162719_50c7215e-4c67-42cb-8aec-b68ec5ca7ef6.sql =====
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
-- ===== END SOURCE MIGRATION: 20260525162719_50c7215e-4c67-42cb-8aec-b68ec5ca7ef6.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260526073719_11c435e8-6844-44c8-941a-e0d57931962c.sql =====

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

-- ===== END SOURCE MIGRATION: 20260526073719_11c435e8-6844-44c8-941a-e0d57931962c.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260526123921_c0881eba-e524-4c6d-a54b-2a3052863d99.sql =====

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

-- ===== END SOURCE MIGRATION: 20260526123921_c0881eba-e524-4c6d-a54b-2a3052863d99.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260526123959_95b81751-3a57-42d8-9821-6efa63d98c4f.sql =====

DROP POLICY IF EXISTS "Ad media public read" ON storage.objects;
DROP POLICY IF EXISTS "Ride media public read" ON storage.objects;

CREATE POLICY "Ad media public read by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-media' AND name IS NOT NULL);

CREATE POLICY "Ride media public read by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ride-media' AND name IS NOT NULL);

-- ===== END SOURCE MIGRATION: 20260526123959_95b81751-3a57-42d8-9821-6efa63d98c4f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260526124041_f83db816-5a47-437d-9f74-32008ea6a86f.sql =====

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

-- ===== END SOURCE MIGRATION: 20260526124041_f83db816-5a47-437d-9f74-32008ea6a86f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260526135703_84f307b7-e94c-43dc-aeb6-bc64b7791a18.sql =====
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
-- ===== END SOURCE MIGRATION: 20260526135703_84f307b7-e94c-43dc-aeb6-bc64b7791a18.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260526140147_f6f966b7-0fc5-46c2-b4d8-118c389b2900.sql =====
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
-- ===== END SOURCE MIGRATION: 20260526140147_f6f966b7-0fc5-46c2-b4d8-118c389b2900.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260526140452_0eba8686-52b8-4d7e-9f8f-8dd9c386dc54.sql =====
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
-- ===== END SOURCE MIGRATION: 20260526140452_0eba8686-52b8-4d7e-9f8f-8dd9c386dc54.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260527060550_8c0bf854-44a1-4ab0-9de9-e3653c175773.sql =====
ALTER TABLE public.shop_product_fitment ADD COLUMN IF NOT EXISTS engine TEXT;
CREATE INDEX IF NOT EXISTS idx_fitment_engine ON public.shop_product_fitment(engine);
-- ===== END SOURCE MIGRATION: 20260527060550_8c0bf854-44a1-4ab0-9de9-e3653c175773.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260527070514_22098064-ab1d-4a26-ba5b-52e8ed15dc7f.sql =====

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

-- ===== END SOURCE MIGRATION: 20260527070514_22098064-ab1d-4a26-ba5b-52e8ed15dc7f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260527072653_b3f8801f-5bc6-40e2-8261-1a600dde648f.sql =====

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

-- ===== END SOURCE MIGRATION: 20260527072653_b3f8801f-5bc6-40e2-8261-1a600dde648f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260527074406_6c863d0d-b51d-40f8-8049-5ece6a07a207.sql =====

UPDATE public.shop_departments SET hero_image_url = '/departments/performance-parts.jpg' WHERE slug = 'performance-parts';
UPDATE public.shop_departments SET hero_image_url = '/departments/maintenance-fluids.jpg' WHERE slug = 'maintenance-fluids';
UPDATE public.shop_departments SET hero_image_url = '/departments/repair-replacement.jpg' WHERE slug = 'repair-replacement';
UPDATE public.shop_departments SET hero_image_url = '/departments/wheels-tires-brakes.jpg' WHERE slug = 'wheels-tires-brakes';
UPDATE public.shop_departments SET hero_image_url = '/departments/interior-exterior.jpg' WHERE slug = 'interior-exterior';
UPDATE public.shop_departments SET hero_image_url = '/departments/tools-garage.jpg' WHERE slug = 'tools-garage';
UPDATE public.shop_departments SET hero_image_url = '/departments/electronics-lighting.jpg' WHERE slug = 'electronics-lighting';
UPDATE public.shop_departments SET hero_image_url = '/departments/specialty.jpg' WHERE slug = 'specialty';

-- ===== END SOURCE MIGRATION: 20260527074406_6c863d0d-b51d-40f8-8049-5ece6a07a207.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260527101926_98d7c403-0beb-4d30-b432-0fce0c2c409a.sql =====
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
-- ===== END SOURCE MIGRATION: 20260527101926_98d7c403-0beb-4d30-b432-0fce0c2c409a.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260527114114_35fc4d77-e5e1-45f9-b94b-b96a0abe025d.sql =====

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

-- ===== END SOURCE MIGRATION: 20260527114114_35fc4d77-e5e1-45f9-b94b-b96a0abe025d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260528054733_ad81c4de-65fb-49d4-8b17-b0273d9d9216.sql =====

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

-- ===== END SOURCE MIGRATION: 20260528054733_ad81c4de-65fb-49d4-8b17-b0273d9d9216.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260529001000_96012e17-51ea-4a35-8f29-fff7b08d7b61.sql =====
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
-- ===== END SOURCE MIGRATION: 20260529001000_96012e17-51ea-4a35-8f29-fff7b08d7b61.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260529091647_234cb316-296e-4d77-9bda-5af7a3528cf1.sql =====
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
-- ===== END SOURCE MIGRATION: 20260529091647_234cb316-296e-4d77-9bda-5af7a3528cf1.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260529103420_2638953d-9d10-4fb6-a50b-b469e593a1ec.sql =====

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

-- ===== END SOURCE MIGRATION: 20260529103420_2638953d-9d10-4fb6-a50b-b469e593a1ec.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260529110857_5046e165-5e9b-4dd8-b643-3deffd0a340e.sql =====

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

-- ===== END SOURCE MIGRATION: 20260529110857_5046e165-5e9b-4dd8-b643-3deffd0a340e.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260529110941_ec4ca8a5-b78c-4254-b9f4-315a9b19ef9b.sql =====

-- Remove the unconfirmed goldcity4u@icloud.com signup that has been showing in admin
UPDATE public.businesses SET owner_id = NULL WHERE owner_id = 'e3b80d24-34d7-4a36-85cb-a89826e2c8da';
DELETE FROM auth.users WHERE id = 'e3b80d24-34d7-4a36-85cb-a89826e2c8da' AND email_confirmed_at IS NULL;

-- ===== END SOURCE MIGRATION: 20260529110941_ec4ca8a5-b78c-4254-b9f4-315a9b19ef9b.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260529114303_62e11c44-56f1-4552-828e-cc9e2d3c3fe5.sql =====

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

-- ===== END SOURCE MIGRATION: 20260529114303_62e11c44-56f1-4552-828e-cc9e2d3c3fe5.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260529115629_f7974081-5d14-4967-8e7b-e8303c363ad0.sql =====
DROP POLICY IF EXISTS "Owners update own businesses" ON public.businesses;
CREATE POLICY "Owners update own businesses" ON public.businesses
FOR UPDATE TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);
-- ===== END SOURCE MIGRATION: 20260529115629_f7974081-5d14-4967-8e7b-e8303c363ad0.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260529120807_a6d7b5c5-c7ca-4a03-b7a7-025a7aca5ec9.sql =====
ALTER TABLE public.business_services
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS price_php numeric(12,2),
  ADD COLUMN IF NOT EXISTS sale_price_php numeric(12,2),
  ADD COLUMN IF NOT EXISTS catalog_key text;

CREATE INDEX IF NOT EXISTS idx_business_services_catalog_key ON public.business_services (catalog_key) WHERE catalog_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_services_category ON public.business_services (category) WHERE category IS NOT NULL;
-- ===== END SOURCE MIGRATION: 20260529120807_a6d7b5c5-c7ca-4a03-b7a7-025a7aca5ec9.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260530131847_36e4ac3c-8ab5-4310-ae44-f419fb7b3997.sql =====

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

-- ===== END SOURCE MIGRATION: 20260530131847_36e4ac3c-8ab5-4310-ae44-f419fb7b3997.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260530160305_f8c16c63-0b0a-4b7c-bdd8-4f305066be96.sql =====

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

-- ===== END SOURCE MIGRATION: 20260530160305_f8c16c63-0b0a-4b7c-bdd8-4f305066be96.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260531024844_848819ff-499d-4421-8227-559670575ed9.sql =====

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

-- ===== END SOURCE MIGRATION: 20260531024844_848819ff-499d-4421-8227-559670575ed9.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260531025940_5e4297d0-69c9-40fc-992f-defbd62f6a7d.sql =====

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

-- ===== END SOURCE MIGRATION: 20260531025940_5e4297d0-69c9-40fc-992f-defbd62f6a7d.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260531054706_8415f0eb-7d1f-4b18-878e-8f26c2e98742.sql =====
CREATE POLICY "Admins read all business events" ON public.business_page_events FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
-- ===== END SOURCE MIGRATION: 20260531054706_8415f0eb-7d1f-4b18-878e-8f26c2e98742.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260531115419_12ba05a3-8683-4da9-914e-4513d964a6d4.sql =====
GRANT SELECT ON public.businesses TO anon, authenticated;
GRANT SELECT ON public.business_types TO anon, authenticated;
GRANT ALL ON public.businesses TO service_role;
GRANT ALL ON public.business_types TO service_role;
-- ===== END SOURCE MIGRATION: 20260531115419_12ba05a3-8683-4da9-914e-4513d964a6d4.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260601010328_9e8aa9b0-30e0-4c30-9e57-d519a3c9d517.sql =====
GRANT SELECT ON public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
GRANT SELECT ON public.business_types TO anon;
GRANT SELECT ON public.business_types TO authenticated;
GRANT ALL ON public.business_types TO service_role;
-- ===== END SOURCE MIGRATION: 20260601010328_9e8aa9b0-30e0-4c30-9e57-d519a3c9d517.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260601030519_cee54f80-90c5-4ee0-a966-2dcf08cf9a98.sql =====
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
-- ===== END SOURCE MIGRATION: 20260601030519_cee54f80-90c5-4ee0-a966-2dcf08cf9a98.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260601030613_bd3b8478-7045-464b-af81-bd540bcc5c00.sql =====
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
-- ===== END SOURCE MIGRATION: 20260601030613_bd3b8478-7045-464b-af81-bd540bcc5c00.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260601042141_25c0cbaf-9664-41b6-ac02-f08aa7f340ed.sql =====

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

-- ===== END SOURCE MIGRATION: 20260601042141_25c0cbaf-9664-41b6-ac02-f08aa7f340ed.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260601042456_b507cce1-738b-432c-bb65-8d1eedd30c91.sql =====
ALTER TYPE public.payment_kind ADD VALUE IF NOT EXISTS 'course';
-- ===== END SOURCE MIGRATION: 20260601042456_b507cce1-738b-432c-bb65-8d1eedd30c91.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260601134129_39db4dbf-b53a-4491-8006-95ec1e6087a6.sql =====
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
-- ===== END SOURCE MIGRATION: 20260601134129_39db4dbf-b53a-4491-8006-95ec1e6087a6.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260601152700_e4784cd3-37e1-425b-af96-515e4d088cfb.sql =====

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

-- ===== END SOURCE MIGRATION: 20260601152700_e4784cd3-37e1-425b-af96-515e4d088cfb.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260601154424_f33c698f-120c-4b7c-b2c8-e49c5626bad7.sql =====
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

-- ===== END SOURCE MIGRATION: 20260601154424_f33c698f-120c-4b7c-b2c8-e49c5626bad7.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260601154523_81cd3c4e-befb-4b8d-ae67-da43ecbdeff1.sql =====
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

-- ===== END SOURCE MIGRATION: 20260601154523_81cd3c4e-befb-4b8d-ae67-da43ecbdeff1.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260602035332_500bb99c-9c9e-4880-8d95-a54a4a786147.sql =====

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

-- ===== END SOURCE MIGRATION: 20260602035332_500bb99c-9c9e-4880-8d95-a54a4a786147.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260602050028_48904d57-846f-45e4-9641-3bd1272160bf.sql =====

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

-- ===== END SOURCE MIGRATION: 20260602050028_48904d57-846f-45e4-9641-3bd1272160bf.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260602081428_560fbe2c-f709-4b2f-860c-7883ddc68194.sql =====

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

-- ===== END SOURCE MIGRATION: 20260602081428_560fbe2c-f709-4b2f-860c-7883ddc68194.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260602131032_2aef236c-1e7d-43f9-b847-d8faa42b4b42.sql =====
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
-- ===== END SOURCE MIGRATION: 20260602131032_2aef236c-1e7d-43f9-b847-d8faa42b4b42.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260602131107_f405877d-01e1-4a35-8a61-a9ff4352b883.sql =====
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on site_settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);
-- ===== END SOURCE MIGRATION: 20260602131107_f405877d-01e1-4a35-8a61-a9ff4352b883.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260603042141_20b66b5e-9cf2-4bc9-b181-6396c1cfc2e7.sql =====
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
-- ===== END SOURCE MIGRATION: 20260603042141_20b66b5e-9cf2-4bc9-b181-6396c1cfc2e7.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260603053625_1ad931ed-7ec3-443d-befd-0d8cc0451f89.sql =====
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
-- ===== END SOURCE MIGRATION: 20260603053625_1ad931ed-7ec3-443d-befd-0d8cc0451f89.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260603063551_f1347a42-fcfe-415f-a41f-13f0f567b2be.sql =====
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
-- ===== END SOURCE MIGRATION: 20260603063551_f1347a42-fcfe-415f-a41f-13f0f567b2be.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql =====
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
-- ===== END SOURCE MIGRATION: 20260603063905_a1f01f8e-1b53-4ea1-8e67-d48ee3811914.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260603071817_c2bff13a-babb-4098-9869-e84fad6c19f6.sql =====
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

-- ===== END SOURCE MIGRATION: 20260603071817_c2bff13a-babb-4098-9869-e84fad6c19f6.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260603080421_6b8a7673-45ea-4d4b-85d2-d834969ba292.sql =====
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
-- ===== END SOURCE MIGRATION: 20260603080421_6b8a7673-45ea-4d4b-85d2-d834969ba292.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260603080924_baf447bb-08b3-4e28-8ff7-fce134194605.sql =====
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_currency text;
-- ===== END SOURCE MIGRATION: 20260603080924_baf447bb-08b3-4e28-8ff7-fce134194605.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260604122237_2389a56f-bfe5-45e0-8114-a798b2889648.sql =====
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

-- ===== END SOURCE MIGRATION: 20260604122237_2389a56f-bfe5-45e0-8114-a798b2889648.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260604164158_05bc3b50-bcb2-4dca-b5f3-b10d454f38c5.sql =====

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

-- ===== END SOURCE MIGRATION: 20260604164158_05bc3b50-bcb2-4dca-b5f3-b10d454f38c5.sql =====

