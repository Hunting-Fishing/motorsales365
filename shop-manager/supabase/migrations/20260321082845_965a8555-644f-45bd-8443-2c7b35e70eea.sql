-- Create nt_hydration_logs table
CREATE TABLE IF NOT EXISTS public.nt_hydration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  amount_ml integer NOT NULL DEFAULT 250,
  source text NOT NULL DEFAULT 'water',
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nt_hydration_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_hydration_logs' AND policyname = 'nt_hydration_logs_shop_isolation') THEN
    CREATE POLICY nt_hydration_logs_shop_isolation ON public.nt_hydration_logs
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- Add photo_url to nt_food_logs if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nt_food_logs' AND column_name = 'photo_url') THEN
    ALTER TABLE public.nt_food_logs ADD COLUMN photo_url text;
  END IF;
END $$;

-- Create meal-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-photos', 'meal-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for meal-photos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'meal_photos_upload') THEN
    CREATE POLICY meal_photos_upload ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'meal-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'meal_photos_select') THEN
    CREATE POLICY meal_photos_select ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'meal-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'meal_photos_public_select') THEN
    CREATE POLICY meal_photos_public_select ON storage.objects
      FOR SELECT TO anon
      USING (bucket_id = 'meal-photos');
  END IF;
END $$;