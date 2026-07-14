
ALTER TABLE public.feature_screenshots
  ADD COLUMN IF NOT EXISTS storage_path TEXT;
