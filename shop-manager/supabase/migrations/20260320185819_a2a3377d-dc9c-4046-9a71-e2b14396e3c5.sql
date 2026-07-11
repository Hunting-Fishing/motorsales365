-- Add education and affiliate columns to pt_supplements
ALTER TABLE public.pt_supplements 
  ADD COLUMN IF NOT EXISTS amazon_asin text,
  ADD COLUMN IF NOT EXISTS best_time_to_take text,
  ADD COLUMN IF NOT EXISTS take_with text[],
  ADD COLUMN IF NOT EXISTS avoid_with text[],
  ADD COLUMN IF NOT EXISTS food_sources text[],
  ADD COLUMN IF NOT EXISTS deficiency_signs text[],
  ADD COLUMN IF NOT EXISTS health_guide text;

-- Create pt_shop_affiliate_settings
CREATE TABLE IF NOT EXISTS public.pt_shop_affiliate_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  amazon_associate_tag text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(shop_id)
);

ALTER TABLE public.pt_shop_affiliate_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shop_affiliate_settings_select' AND tablename = 'pt_shop_affiliate_settings') THEN
    CREATE POLICY shop_affiliate_settings_select ON public.pt_shop_affiliate_settings FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shop_affiliate_settings_insert' AND tablename = 'pt_shop_affiliate_settings') THEN
    CREATE POLICY shop_affiliate_settings_insert ON public.pt_shop_affiliate_settings FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shop_affiliate_settings_update' AND tablename = 'pt_shop_affiliate_settings') THEN
    CREATE POLICY shop_affiliate_settings_update ON public.pt_shop_affiliate_settings FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;