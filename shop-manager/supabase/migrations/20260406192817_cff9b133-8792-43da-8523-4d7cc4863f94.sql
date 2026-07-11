
CREATE TABLE public.welding_line_item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'plus',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welding_line_item_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "welding_line_item_categories_shop_isolation"
  ON public.welding_line_item_categories FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE TRIGGER update_welding_line_item_categories_updated_at
  BEFORE UPDATE ON public.welding_line_item_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
