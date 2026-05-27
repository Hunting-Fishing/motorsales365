
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
