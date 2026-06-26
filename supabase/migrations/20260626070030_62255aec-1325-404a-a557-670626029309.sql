
CREATE TABLE public.parts_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  website TEXT,
  signup_url TEXT,
  api_docs_url TEXT,
  region TEXT NOT NULL DEFAULT 'global',
  category TEXT NOT NULL DEFAULT 'aftermarket',
  brands TEXT[] NOT NULL DEFAULT '{}',
  supports_api BOOLEAN NOT NULL DEFAULT false,
  supports_dropship BOOLEAN NOT NULL DEFAULT false,
  supports_wholesale BOOLEAN NOT NULL DEFAULT false,
  vin_lookup BOOLEAN NOT NULL DEFAULT false,
  signup_status TEXT NOT NULL DEFAULT 'not_started',
  api_status TEXT NOT NULL DEFAULT 'none',
  priority INTEGER NOT NULL DEFAULT 100,
  account_email TEXT,
  account_ref TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  commission_notes TEXT,
  notes TEXT,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_suppliers TO authenticated;
GRANT ALL ON public.parts_suppliers TO service_role;

ALTER TABLE public.parts_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage parts suppliers"
  ON public.parts_suppliers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_parts_suppliers_updated
BEFORE UPDATE ON public.parts_suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with curated supplier directory (PH, SEA, JDM, EU, US, global aftermarket + OEM)
INSERT INTO public.parts_suppliers
  (name, slug, website, signup_url, api_docs_url, region, category, brands, supports_api, supports_dropship, supports_wholesale, vin_lookup, priority, is_recommended, notes)
VALUES
  -- Philippines
  ('Autohub Group', 'autohub-ph', 'https://autohubgroup.com', 'https://autohubgroup.com/contact', NULL, 'PH', 'oem_dealer', ARRAY['Honda','Mini','BMW','Volvo','Lotus'], false, false, true, false, 10, true, 'Major PH dealer network — wholesale OEM relationship.'),
  ('Toyota Motor Philippines', 'toyota-ph', 'https://toyota.com.ph', 'https://toyota.com.ph/contact-us', NULL, 'PH', 'oem_dealer', ARRAY['Toyota','Lexus'], false, false, true, true, 10, true, 'OEM parts dept per dealer; pursue national parts manager contact.'),
  ('Honda Cars Philippines', 'honda-ph', 'https://hondaphil.com', 'https://hondaphil.com/contact', NULL, 'PH', 'oem_dealer', ARRAY['Honda'], false, false, true, true, 15, true, 'OEM parts via authorized dealers.'),
  ('Mitsubishi Motors Philippines', 'mmpc-ph', 'https://mitsubishi-motors.com.ph', 'https://mitsubishi-motors.com.ph/contact', NULL, 'PH', 'oem_dealer', ARRAY['Mitsubishi'], false, false, true, true, 15, false, NULL),
  ('Nissan Philippines', 'nissan-ph', 'https://nissan.ph', 'https://nissan.ph/contact-us', NULL, 'PH', 'oem_dealer', ARRAY['Nissan'], false, false, true, true, 20, false, NULL),
  ('Ford Philippines', 'ford-ph', 'https://ford.com.ph', 'https://ford.com.ph/contact', NULL, 'PH', 'oem_dealer', ARRAY['Ford'], false, false, true, true, 20, false, NULL),
  ('Isuzu Philippines', 'isuzu-ph', 'https://isuzuphil.com', 'https://isuzuphil.com/contact-us', NULL, 'PH', 'oem_dealer', ARRAY['Isuzu'], false, false, true, true, 25, false, NULL),
  ('Hyundai Asia Resources', 'hyundai-ph', 'https://hyundai.ph', 'https://hyundai.ph/contact', NULL, 'PH', 'oem_dealer', ARRAY['Hyundai'], false, false, true, true, 25, false, NULL),
  ('Suzuki Philippines', 'suzuki-ph', 'https://suzuki.com.ph', 'https://suzuki.com.ph/contact-us', NULL, 'PH', 'oem_dealer', ARRAY['Suzuki'], false, false, true, true, 25, false, NULL),
  ('Banawe Parts District', 'banawe-ph', NULL, NULL, NULL, 'PH', 'parts_shop', ARRAY['Toyota','Honda','Mitsubishi','Nissan','Isuzu','Mazda','Ford'], false, false, true, false, 5, true, 'Aggregator: dozens of independent PH shops. Build relationships in person.'),
  ('Tabangao / Bangkal surplus row', 'bangkal-ph', NULL, NULL, NULL, 'PH', 'junkyard', ARRAY['Toyota','Honda','Nissan','Mitsubishi'], false, false, true, false, 5, true, 'Used JDM/PH surplus body parts and engines.'),
  ('Carmudi Philippines Parts', 'carmudi-ph', 'https://www.carmudi.com.ph', 'https://www.carmudi.com.ph', NULL, 'PH', 'online', ARRAY[]::text[], false, false, false, false, 60, false, NULL),
  ('Lazada PH (auto sellers)', 'lazada-ph', 'https://www.lazada.com.ph', 'https://open.lazada.com', 'https://open.lazada.com/doc/doc.htm', 'PH', 'online', ARRAY[]::text[], true, true, true, false, 30, true, 'Open Platform API for affiliate/dropship.'),
  ('Shopee PH (auto sellers)', 'shopee-ph', 'https://shopee.ph', 'https://open.shopee.com', 'https://open.shopee.com/documents', 'PH', 'online', ARRAY[]::text[], true, true, true, false, 30, true, 'Open Platform API; large PH parts seller base.'),

  -- JDM / Japan
  ('Amayama Trading', 'amayama', 'https://www.amayama.com', 'https://www.amayama.com/en/contacts', NULL, 'JP', 'oem_distributor', ARRAY['Toyota','Honda','Nissan','Mitsubishi','Subaru','Mazda','Lexus','Suzuki','Daihatsu','Hino'], false, true, true, true, 10, true, 'Genuine JDM OEM with worldwide shipping. No public API; ask for partner feed.'),
  ('Nengun Performance', 'nengun', 'https://www.nengun.com', 'https://www.nengun.com/contact', NULL, 'JP', 'aftermarket', ARRAY['HKS','TRD','Nismo','Mugen','Tomei','Cusco','Spoon'], false, true, true, false, 20, true, 'JDM performance / tuning parts.'),
  ('Megazip', 'megazip', 'https://www.megazip.net', 'https://www.megazip.net', NULL, 'JP', 'oem_distributor', ARRAY['Toyota','Honda','Nissan','Subaru','Mitsubishi','Mazda','Daihatsu','Suzuki','Isuzu','Hino'], false, true, false, true, 25, true, 'OEM catalog by VIN — Japan and US/EU brands.'),
  ('PartSouq', 'partsouq', 'https://partsouq.com', 'https://partsouq.com/en/auth/signin', NULL, 'AE', 'oem_distributor', ARRAY['Toyota','Lexus','Honda','Nissan','Mitsubishi','Mazda','Subaru','Hyundai','Kia','BMW','Mercedes','Audi','VW','Ford','GM'], false, true, true, true, 5, true, 'Reference catalog UX we want to match. No public API; partner inquiry.'),
  ('Impex Japan', 'impex-jp', 'https://www.impex-japan.com', 'https://www.impex-japan.com/contact', NULL, 'JP', 'oem_distributor', ARRAY['Toyota','Honda','Nissan','Mitsubishi','Subaru','Mazda'], false, true, true, true, 30, false, 'JDM OEM with export.'),

  -- US
  ('RockAuto', 'rockauto', 'https://www.rockauto.com', 'https://www.rockauto.com', NULL, 'US', 'aftermarket', ARRAY[]::text[], false, true, true, false, 25, true, 'Massive aftermarket catalog. No public API; affiliate/wholesale via inquiry.'),
  ('Parts Authority', 'parts-authority', 'https://www.partsauthority.com', 'https://www.partsauthority.com/wholesale', 'https://www.partsauthority.com/api', 'US', 'aftermarket', ARRAY[]::text[], true, true, true, true, 20, true, 'Wholesale + API for resellers.'),
  ('WORLDPAC', 'worldpac', 'https://www.worldpac.com', 'https://www.worldpac.com/contact', NULL, 'US', 'oem_distributor', ARRAY['BMW','Mercedes','Audi','VW','Volvo','Lexus','Toyota','Honda'], true, true, true, true, 15, true, 'OEM/import parts — speedDIAL API for wholesale partners.'),
  ('Turn 14 Distribution', 'turn14', 'https://www.turn14.com', 'https://www.turn14.com/dealer/apply', 'https://www.turn14.com/api', 'US', 'aftermarket', ARRAY[]::text[], true, true, true, false, 20, true, 'Performance/aftermarket; dealer API.'),
  ('Keystone Automotive', 'keystone', 'https://www.ekeystone.com', 'https://www.ekeystone.com/become-customer', NULL, 'US', 'aftermarket', ARRAY[]::text[], true, true, true, false, 25, false, 'eKeystone API for jobbers.'),
  ('PartsTech', 'partstech', 'https://www.partstech.com', 'https://www.partstech.com/sign-up', 'https://developer.partstech.com', 'US', 'aggregator', ARRAY[]::text[], true, true, true, true, 15, true, 'Aggregator API across many US suppliers — single integration covers many.'),
  ('Nexpart (WHI)', 'nexpart', 'https://www.nexpart.com', 'https://www.nexpart.com', NULL, 'US', 'aggregator', ARRAY[]::text[], true, true, true, true, 25, false, 'WHI/Snap-on B2B catalog.'),
  ('eBay Motors', 'ebay-motors', 'https://www.ebay.com/motors', 'https://developer.ebay.com', 'https://developer.ebay.com/api-docs/static/finding-overview.html', 'US', 'online', ARRAY[]::text[], true, true, false, true, 30, true, 'Finding/Browse API — global supply with VIN/fitment filters.'),
  ('Amazon PA-API', 'amazon-paapi', 'https://www.amazon.com', 'https://affiliate-program.amazon.com', 'https://webservices.amazon.com/paapi5/documentation/', 'US', 'online', ARRAY[]::text[], true, false, false, false, 35, true, 'Affiliate API for parts listings.'),

  -- EU
  ('Tecdoc / TecAlliance', 'tecdoc', 'https://www.tecalliance.net', 'https://www.tecalliance.net/en/contact/', 'https://webservice.tecalliance.services', 'EU', 'aggregator', ARRAY[]::text[], true, true, true, true, 10, true, 'Industry-standard parts catalog data — license required.'),
  ('Autodoc PRO', 'autodoc', 'https://www.autodoc.co.uk', 'https://www.autodoc-pro.com', NULL, 'EU', 'aftermarket', ARRAY[]::text[], false, true, true, true, 25, false, 'EU aftermarket; PRO program for wholesale.'),
  ('GSF Car Parts', 'gsf', 'https://www.gsfcarparts.com', 'https://www.gsfcarparts.com/trade', NULL, 'EU', 'aftermarket', ARRAY[]::text[], false, true, true, true, 40, false, NULL),

  -- SEA / regional
  ('Boodmo (IN, expanding SEA)', 'boodmo', 'https://boodmo.com', 'https://boodmo.com', NULL, 'IN', 'aftermarket', ARRAY[]::text[], false, true, false, true, 35, false, 'India OEM/aftermarket marketplace.'),
  ('Carousell PH', 'carousell-ph', 'https://www.carousell.ph', 'https://api.carousell.com', NULL, 'PH', 'online', ARRAY[]::text[], false, false, false, false, 45, false, 'Used parts listings.'),

  -- Global / China
  ('AliExpress / Cainiao', 'aliexpress', 'https://www.aliexpress.com', 'https://portals.aliexpress.com', 'https://developers.aliexpress.com', 'CN', 'aftermarket', ARRAY[]::text[], true, true, true, false, 30, true, 'Affiliate API + dropship; large aftermarket pool.'),
  ('1688 (Alibaba domestic)', '1688', 'https://www.1688.com', 'https://open.1688.com', 'https://open.1688.com/doc', 'CN', 'wholesale', ARRAY[]::text[], true, false, true, false, 40, false, 'Wholesale sourcing — Mandarin-only.'),
  ('Replicate / Pakistani aftermarket aggregators', 'pk-aftermarket', NULL, NULL, NULL, 'PK', 'aftermarket', ARRAY['Toyota','Honda','Suzuki'], false, true, true, false, 70, false, 'Body panel / trim suppliers worth scouting.');
