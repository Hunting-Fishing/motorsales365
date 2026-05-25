
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
