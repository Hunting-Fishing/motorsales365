DROP INDEX IF EXISTS public.businesses_source_external_id_key;

CREATE UNIQUE INDEX businesses_source_external_id_key
  ON public.businesses (source, source_external_id)
  NULLS NOT DISTINCT;