ALTER TABLE public.shop_product_fitment ADD COLUMN IF NOT EXISTS engine TEXT;
CREATE INDEX IF NOT EXISTS idx_fitment_engine ON public.shop_product_fitment(engine);