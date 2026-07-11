
CREATE TABLE public.export_packaging_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, name)
);

ALTER TABLE public.export_packaging_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own shop packaging types' AND tablename = 'export_packaging_types') THEN
  CREATE POLICY "Users can view own shop packaging types" ON public.export_packaging_types FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own shop packaging types' AND tablename = 'export_packaging_types') THEN
  CREATE POLICY "Users can insert own shop packaging types" ON public.export_packaging_types FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own shop packaging types' AND tablename = 'export_packaging_types') THEN
  CREATE POLICY "Users can update own shop packaging types" ON public.export_packaging_types FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
END IF;
END $$;
