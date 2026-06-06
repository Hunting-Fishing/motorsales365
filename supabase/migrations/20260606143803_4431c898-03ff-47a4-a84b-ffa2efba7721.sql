-- Clean up any existing duplicates before adding the constraint
DELETE FROM public.businesses a
USING public.businesses b
WHERE a.ctid < b.ctid
  AND a.source IS NOT NULL
  AND a.source_external_id IS NOT NULL
  AND a.source = b.source
  AND a.source_external_id = b.source_external_id;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_source_external_id_key
  ON public.businesses (source, source_external_id)
  WHERE source IS NOT NULL AND source_external_id IS NOT NULL;