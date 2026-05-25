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
