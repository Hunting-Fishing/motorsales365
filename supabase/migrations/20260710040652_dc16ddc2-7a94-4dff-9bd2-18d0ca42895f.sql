CREATE TABLE public.vin_decode_cache (
  vin text PRIMARY KEY,
  result jsonb NOT NULL,
  source text NOT NULL,
  decoded_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vin_decode_cache TO authenticated;
GRANT ALL ON public.vin_decode_cache TO service_role;

ALTER TABLE public.vin_decode_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read VIN cache"
  ON public.vin_decode_cache
  FOR SELECT
  TO authenticated
  USING (true);