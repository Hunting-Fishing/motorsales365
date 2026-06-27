
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
