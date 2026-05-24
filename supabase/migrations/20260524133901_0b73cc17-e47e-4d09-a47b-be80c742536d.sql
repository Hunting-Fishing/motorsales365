CREATE TABLE public.shop_favorites (
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX idx_shop_favorites_user ON public.shop_favorites(user_id, created_at DESC);

ALTER TABLE public.shop_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own shop favorites"
ON public.shop_favorites
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read shop favorites"
ON public.shop_favorites
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));