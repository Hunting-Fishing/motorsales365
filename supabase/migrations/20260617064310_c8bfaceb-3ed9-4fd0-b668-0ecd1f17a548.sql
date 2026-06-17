
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

CREATE TABLE IF NOT EXISTS public.business_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, slug)
);

GRANT SELECT ON public.business_brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_brands TO authenticated;
GRANT ALL ON public.business_brands TO service_role;

ALTER TABLE public.business_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business brands"
  ON public.business_brands FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert brands"
  ON public.business_brands FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_brands.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can update brands"
  ON public.business_brands FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_brands.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can delete brands"
  ON public.business_brands FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_brands.business_id AND b.owner_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_business_brands_business_sort
  ON public.business_brands (business_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_business_brands_slug
  ON public.business_brands (slug);
