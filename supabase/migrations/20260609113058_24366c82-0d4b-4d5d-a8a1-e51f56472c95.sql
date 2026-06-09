
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
