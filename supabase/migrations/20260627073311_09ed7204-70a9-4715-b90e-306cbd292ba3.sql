
ALTER TABLE public.parts_supplier_applications
  ADD COLUMN IF NOT EXISTS storefront_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS storefront_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS storefront_blurb TEXT,
  ADD COLUMN IF NOT EXISTS storefront_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS storefront_categories TEXT[];

-- Public read of published partner storefronts only
DROP POLICY IF EXISTS "public read published storefronts" ON public.parts_supplier_applications;
CREATE POLICY "public read published storefronts"
  ON public.parts_supplier_applications
  FOR SELECT
  TO anon, authenticated
  USING (storefront_published = true AND storefront_slug IS NOT NULL);

GRANT SELECT ON public.parts_supplier_applications TO anon;
