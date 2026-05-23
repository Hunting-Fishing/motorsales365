
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS price_label text,
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_source_external_id_unique
  ON public.businesses (source, source_external_id)
  WHERE source_external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS businesses_lat_lng_idx
  ON public.businesses (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;
