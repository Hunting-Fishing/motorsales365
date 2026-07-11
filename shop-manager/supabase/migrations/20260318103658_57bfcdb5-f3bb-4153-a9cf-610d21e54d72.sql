-- Add missing fields to pt_exercises
ALTER TABLE pt_exercises ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE pt_exercises ADD COLUMN IF NOT EXISTS common_mistakes TEXT;
ALTER TABLE pt_exercises ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE pt_exercises ADD COLUMN IF NOT EXISTS alternatives TEXT;

-- Create storage bucket for progress photos
INSERT INTO storage.buckets (id, name, public) VALUES ('pt-progress-photos', 'pt-progress-photos', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies (without IF NOT EXISTS)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_photos_insert' AND tablename = 'objects') THEN
    CREATE POLICY "pt_photos_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pt-progress-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_photos_select' AND tablename = 'objects') THEN
    CREATE POLICY "pt_photos_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'pt-progress-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_photos_delete' AND tablename = 'objects') THEN
    CREATE POLICY "pt_photos_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pt-progress-photos');
  END IF;
END $$;