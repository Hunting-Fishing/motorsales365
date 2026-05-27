
ALTER TABLE public.shop_product_links
  ADD COLUMN IF NOT EXISTS price_php numeric,
  ADD COLUMN IF NOT EXISTS sale_price_php numeric,
  ADD COLUMN IF NOT EXISTS in_stock boolean;

CREATE TABLE IF NOT EXISTS public.shop_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  network_id uuid REFERENCES public.affiliate_networks(id) ON DELETE SET NULL,
  price_php numeric,
  sale_price_php numeric,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_price_history_product_time
  ON public.shop_price_history (product_id, captured_at DESC);

GRANT SELECT ON public.shop_price_history TO anon, authenticated;
GRANT ALL ON public.shop_price_history TO service_role;

ALTER TABLE public.shop_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price history public read"
  ON public.shop_price_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_products p
      WHERE p.id = shop_price_history.product_id
        AND (p.active = true OR public.can_manage_shop(auth.uid()))
    )
  );

CREATE POLICY "Shop managers manage price history"
  ON public.shop_price_history
  USING (public.can_manage_shop(auth.uid()))
  WITH CHECK (public.can_manage_shop(auth.uid()));
