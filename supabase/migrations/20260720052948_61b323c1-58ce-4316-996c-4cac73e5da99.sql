
-- 1) Shop Manager plans (per business kind × tier)
CREATE TABLE public.shop_manager_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_kind text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('free','starter','pro','enterprise')),
  name text NOT NULL,
  blurb text,
  base_price_php numeric(10,2) NOT NULL DEFAULT 0,
  yearly_discount_pct numeric(5,2) NOT NULL DEFAULT 16.67, -- ~2 months free
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_ceiling integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_kind, tier)
);

GRANT SELECT ON public.shop_manager_plans TO anon, authenticated;
GRANT ALL ON public.shop_manager_plans TO service_role;
ALTER TABLE public.shop_manager_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.shop_manager_plans FOR SELECT
  USING (active = true);

-- 2) Regional PPP pricing table
CREATE TABLE public.shop_manager_regional_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  ppp_multiplier numeric(6,3) NOT NULL DEFAULT 1.0,
  currency text NOT NULL DEFAULT 'PHP',
  currency_symbol text NOT NULL DEFAULT '₱',
  fx_to_php numeric(12,6) NOT NULL DEFAULT 1.0, -- 1 unit of local currency = X PHP
  price_ends_in text NOT NULL DEFAULT '9', -- snap suffix
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_manager_regional_pricing TO anon, authenticated;
GRANT ALL ON public.shop_manager_regional_pricing TO service_role;
ALTER TABLE public.shop_manager_regional_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active regional pricing"
  ON public.shop_manager_regional_pricing FOR SELECT
  USING (active = true);

-- 3) Shop Manager subscriptions (per business)
CREATE TABLE public.shop_manager_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  business_id uuid NOT NULL,
  plan_id uuid REFERENCES public.shop_manager_plans(id),
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','starter','pro','enterprise')),
  status text NOT NULL DEFAULT 'active',
  interval text NOT NULL DEFAULT 'month' CHECK (interval IN ('month','year')),
  country_code text,
  effective_price_local numeric(12,2),
  effective_currency text,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  auto_upgrade boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);

GRANT SELECT ON public.shop_manager_subscriptions TO authenticated;
GRANT ALL ON public.shop_manager_subscriptions TO service_role;
ALTER TABLE public.shop_manager_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or member can view sub"
  ON public.shop_manager_subscriptions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = shop_manager_subscriptions.business_id AND b.owner_id = auth.uid()
    )
  );

-- 4) Fair-use AI usage counter (monthly)
CREATE TABLE public.shop_manager_ai_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  month_key text NOT NULL, -- 'YYYY-MM'
  calls_used integer NOT NULL DEFAULT 0,
  last_call_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, month_key)
);

GRANT SELECT ON public.shop_manager_ai_usage TO authenticated;
GRANT ALL ON public.shop_manager_ai_usage TO service_role;
ALTER TABLE public.shop_manager_ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own AI usage"
  ON public.shop_manager_ai_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = shop_manager_ai_usage.business_id AND b.owner_id = auth.uid()
    )
  );

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.shop_manager_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER sm_plans_touch BEFORE UPDATE ON public.shop_manager_plans
  FOR EACH ROW EXECUTE FUNCTION public.shop_manager_touch_updated_at();
CREATE TRIGGER sm_regional_touch BEFORE UPDATE ON public.shop_manager_regional_pricing
  FOR EACH ROW EXECUTE FUNCTION public.shop_manager_touch_updated_at();
CREATE TRIGGER sm_subs_touch BEFORE UPDATE ON public.shop_manager_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.shop_manager_touch_updated_at();
CREATE TRIGGER sm_ai_usage_touch BEFORE UPDATE ON public.shop_manager_ai_usage
  FOR EACH ROW EXECUTE FUNCTION public.shop_manager_touch_updated_at();

-- 5) Seed default 4-tier ladder for a set of business kinds.
-- Callers override per-kind via admin console; this is the sensible default.
INSERT INTO public.shop_manager_plans (business_kind, tier, name, blurb, base_price_php, features, limits, ai_ceiling, sort_order)
SELECT bk.kind, t.tier, t.name, t.blurb, t.price, t.features::jsonb, t.limits::jsonb, t.ai_ceiling, t.sort_order
FROM (VALUES
  ('repair_shop'), ('fuel_station'), ('dealership'), ('parts_retailer'),
  ('tow_service'), ('service_shop'), ('detailer'), ('rental'),
  ('inspection_center'), ('accessories'), ('default')
) AS bk(kind)
CROSS JOIN (VALUES
  ('free', 'Free', 'For solo shops getting started', 0,
    '{"custom_domain":false,"ai_translate":false,"ai_doc_check":false,"ai_dvi":false,"ai_smart_search":false,"white_label":false,"priority_support":false,"custom_reports":false,"gl_drilldown":false,"multi_location":false}',
    '{"inventory_skus":100,"invoices_per_month":25,"team_seats":1,"locations":1,"listings":5,"network_sharing":"none"}',
    0, 1),
  ('starter', 'Starter', 'For growing single-shop businesses', 499,
    '{"custom_domain":false,"ai_translate":true,"ai_doc_check":true,"ai_dvi":false,"ai_smart_search":true,"white_label":false,"priority_support":false,"custom_reports":false,"gl_drilldown":false,"multi_location":false}',
    '{"inventory_skus":1000,"invoices_per_month":250,"team_seats":3,"locations":1,"listings":25,"network_sharing":"read"}',
    500, 2),
  ('pro', 'Pro', 'For established shops that need everything', 1499,
    '{"custom_domain":true,"ai_translate":true,"ai_doc_check":true,"ai_dvi":true,"ai_smart_search":true,"white_label":false,"priority_support":true,"custom_reports":false,"gl_drilldown":true,"multi_location":true}',
    '{"inventory_skus":10000,"invoices_per_month":2500,"team_seats":10,"locations":3,"listings":100,"network_sharing":"read_write"}',
    5000, 3),
  ('enterprise', 'Enterprise', 'Multi-branch and franchise operations', 4999,
    '{"custom_domain":true,"ai_translate":true,"ai_doc_check":true,"ai_dvi":true,"ai_smart_search":true,"white_label":true,"priority_support":true,"custom_reports":true,"gl_drilldown":true,"multi_location":true}',
    '{"inventory_skus":null,"invoices_per_month":null,"team_seats":null,"locations":null,"listings":null,"network_sharing":"priority"}',
    50000, 4)
) AS t(tier, name, blurb, price, features, limits, ai_ceiling, sort_order);

-- 6) Seed regional pricing (PPP multipliers). PH = base.
INSERT INTO public.shop_manager_regional_pricing (country_code, country_name, ppp_multiplier, currency, currency_symbol, fx_to_php) VALUES
  ('PH', 'Philippines', 1.000, 'PHP', '₱', 1.0),
  ('ID', 'Indonesia',   0.900, 'IDR', 'Rp', 0.0036),
  ('VN', 'Vietnam',     0.950, 'VND', '₫', 0.0023),
  ('TH', 'Thailand',    1.100, 'THB', '฿', 1.60),
  ('MY', 'Malaysia',    1.200, 'MYR', 'RM', 12.5),
  ('SG', 'Singapore',   2.000, 'SGD', 'S$', 42.0),
  ('JP', 'Japan',       2.200, 'JPY', '¥', 0.37),
  ('KR', 'South Korea', 1.800, 'KRW', '₩', 0.042),
  ('AU', 'Australia',   2.600, 'AUD', 'A$', 37.0),
  ('NZ', 'New Zealand', 2.400, 'NZD', 'NZ$', 34.0),
  ('US', 'United States', 3.000, 'USD', '$', 57.0),
  ('CA', 'Canada',      2.800, 'CAD', 'C$', 42.0),
  ('GB', 'United Kingdom', 2.700, 'GBP', '£', 72.0),
  ('EU', 'Eurozone',    2.500, 'EUR', '€', 62.0),
  ('MX', 'Mexico',      1.200, 'MXN', '$', 3.1),
  ('BR', 'Brazil',      1.300, 'BRL', 'R$', 11.0),
  ('AR', 'Argentina',   1.500, 'ARS', '$', 0.06),
  ('IN', 'India',       0.700, 'INR', '₹', 0.68),
  ('CN', 'China',       1.400, 'CNY', '¥', 7.9),
  ('AE', 'UAE',         2.500, 'AED', 'AED', 15.5),
  ('ZA', 'South Africa', 1.100, 'ZAR', 'R', 3.2),
  ('NG', 'Nigeria',     0.800, 'NGN', '₦', 0.037);
