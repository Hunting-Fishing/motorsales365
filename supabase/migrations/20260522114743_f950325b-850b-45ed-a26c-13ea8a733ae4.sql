
-- Add universal_fit flag to products
ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS universal_fit boolean NOT NULL DEFAULT false;

-- Fitment table: a product fits a (make, model, year-range) combo.
-- Nulls mean "any" at that level (e.g. make=Toyota, model=null => fits any Toyota).
CREATE TABLE IF NOT EXISTS public.shop_product_fitment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'car' CHECK (category IN ('car','motorcycle')),
  make text,
  model text,
  year_start int,
  year_end int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fitment_product ON public.shop_product_fitment(product_id);
CREATE INDEX IF NOT EXISTS idx_fitment_make_model ON public.shop_product_fitment(make, model);

ALTER TABLE public.shop_product_fitment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fitment is publicly readable"
  ON public.shop_product_fitment FOR SELECT
  USING (true);

CREATE POLICY "Shop managers can insert fitment"
  ON public.shop_product_fitment FOR INSERT
  WITH CHECK (public.can_manage_shop(auth.uid()));

CREATE POLICY "Shop managers can update fitment"
  ON public.shop_product_fitment FOR UPDATE
  USING (public.can_manage_shop(auth.uid()));

CREATE POLICY "Shop managers can delete fitment"
  ON public.shop_product_fitment FOR DELETE
  USING (public.can_manage_shop(auth.uid()));
