ALTER TABLE public.business_services
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS price_php numeric(12,2),
  ADD COLUMN IF NOT EXISTS sale_price_php numeric(12,2),
  ADD COLUMN IF NOT EXISTS catalog_key text;

CREATE INDEX IF NOT EXISTS idx_business_services_catalog_key ON public.business_services (catalog_key) WHERE catalog_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_services_category ON public.business_services (category) WHERE category IS NOT NULL;