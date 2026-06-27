
-- AFFILIATE LINKS (admin-managed deep-link templates per supplier)
CREATE TABLE public.affiliate_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'PH',
  logo_url TEXT,
  url_template TEXT NOT NULL,
  affiliate_id_env TEXT,
  network TEXT,
  commission_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  priority INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.affiliate_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.affiliate_links TO authenticated;
GRANT ALL ON public.affiliate_links TO service_role;

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read active links"
  ON public.affiliate_links FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage links"
  ON public.affiliate_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_affiliate_links_updated_at
  BEFORE UPDATE ON public.affiliate_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AFFILIATE CLICKS (per-click log)
CREATE TABLE public.affiliate_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_slug TEXT NOT NULL,
  query TEXT,
  listing_id UUID,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_clicks_supplier ON public.affiliate_clicks(supplier_slug, created_at DESC);
CREATE INDEX idx_affiliate_clicks_listing ON public.affiliate_clicks(listing_id) WHERE listing_id IS NOT NULL;

GRANT INSERT ON public.affiliate_clicks TO anon, authenticated;
GRANT SELECT ON public.affiliate_clicks TO authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can log a click"
  ON public.affiliate_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admins read all clicks"
  ON public.affiliate_clicks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed starter templates (all inactive until you add affiliate IDs)
INSERT INTO public.affiliate_links (supplier_slug, label, region, url_template, affiliate_id_env, network, commission_note, priority) VALUES
  ('shopee-ph', 'Shopee PH', 'PH', 'https://shopee.ph/search?keyword={QUERY}', 'SHOPEE_AFFILIATE_ID', 'Involve Asia', 'PH affiliate via Involve Asia. ~3-8% varies by category.', 10),
  ('lazada-ph', 'Lazada PH', 'PH', 'https://www.lazada.com.ph/catalog/?q={QUERY}', 'LAZADA_AFFILIATE_ID', 'Involve Asia', 'PH affiliate via Involve Asia or direct.', 20),
  ('ebay-motors', 'eBay Motors', 'GLOBAL', 'https://www.ebay.com/sch/i.html?_nkw={QUERY}&_sacat=6000', 'EBAY_PARTNER_ID', 'eBay Partner Network', 'Generous commissions on car parts category.', 30),
  ('amazon', 'Amazon', 'GLOBAL', 'https://www.amazon.com/s?k={QUERY}&i=automotive', 'AMAZON_ASSOCIATE_TAG', 'Amazon Associates', 'Requires 3 sales in 180 days to keep account.', 40),
  ('rockauto', 'RockAuto', 'GLOBAL', 'https://www.rockauto.com/en/catalog/{QUERY}', NULL, 'Direct', 'Apply via RockAuto Customer Service for affiliate.', 50),
  ('amayama', 'Amayama (JDM OEM)', 'GLOBAL', 'https://www.amayama.com/en/search?q={QUERY}', NULL, 'Direct', 'Email partnerships@amayama.com for affiliate terms.', 60),
  ('partsouq', 'PartSouq (OEM by VIN)', 'GLOBAL', 'https://partsouq.com/en/search/all?q={QUERY}', NULL, 'Direct', 'Currently no public affiliate program; lead-gen only.', 70),
  ('megazip', 'Megazip (JDM OEM)', 'GLOBAL', 'https://www.megazip.net/search?q={QUERY}', NULL, 'Direct', 'Direct partnership required.', 80);
