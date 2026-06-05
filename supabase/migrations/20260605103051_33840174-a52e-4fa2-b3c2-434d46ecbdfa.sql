
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
