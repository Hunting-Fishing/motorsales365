
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS resolution text CHECK (resolution IN ('accepted','dismissed')),
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS signals jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS reports_resolution_idx ON public.reports(resolution);

ALTER TABLE public.listing_media
  ADD COLUMN IF NOT EXISTS phash text,
  ADD COLUMN IF NOT EXISTS file_sha256 text;

CREATE INDEX IF NOT EXISTS listing_media_phash_idx ON public.listing_media(phash) WHERE phash IS NOT NULL;
CREATE INDEX IF NOT EXISTS listing_media_sha_idx ON public.listing_media(file_sha256) WHERE file_sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS listing_media_storage_path_idx ON public.listing_media(storage_path) WHERE storage_path IS NOT NULL;
