
-- Add columns to pt_supplement_brands
ALTER TABLE public.pt_supplement_brands 
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'supplements',
  ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);

-- Add columns to pt_supplements
ALTER TABLE public.pt_supplements
  ADD COLUMN IF NOT EXISTS nutrition_facts jsonb,
  ADD COLUMN IF NOT EXISTS serving_size text,
  ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'supplement';

-- RLS for pt_supplement_brands (allow reading all, insert/update scoped)
ALTER TABLE public.pt_supplement_brands ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read brands' AND tablename = 'pt_supplement_brands') THEN
    CREATE POLICY "Anyone can read brands" ON public.pt_supplement_brands FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Shop owners can insert brands' AND tablename = 'pt_supplement_brands') THEN
    CREATE POLICY "Shop owners can insert brands" ON public.pt_supplement_brands FOR INSERT TO authenticated WITH CHECK (shop_id IS NULL OR shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Shop owners can update brands' AND tablename = 'pt_supplement_brands') THEN
    CREATE POLICY "Shop owners can update brands" ON public.pt_supplement_brands FOR UPDATE TO authenticated USING (shop_id IS NULL OR shop_id = public.get_current_user_shop_id());
  END IF;
END $$;
