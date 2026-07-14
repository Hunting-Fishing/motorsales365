
CREATE TABLE IF NOT EXISTS public.feature_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id TEXT NOT NULL,
  route TEXT NOT NULL,
  url TEXT NOT NULL,
  viewport TEXT NOT NULL DEFAULT 'desktop',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by TEXT,
  notes TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  sha256 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_screenshots_feature_captured_idx
  ON public.feature_screenshots (feature_id, captured_at DESC);

GRANT SELECT ON public.feature_screenshots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feature_screenshots TO authenticated;
GRANT ALL ON public.feature_screenshots TO service_role;

ALTER TABLE public.feature_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_screenshots public read"
  ON public.feature_screenshots FOR SELECT
  USING (true);

CREATE POLICY "feature_screenshots admin insert"
  ON public.feature_screenshots FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "feature_screenshots admin update"
  ON public.feature_screenshots FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "feature_screenshots admin delete"
  ON public.feature_screenshots FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for feature-screenshots bucket
CREATE POLICY "feature-screenshots public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'feature-screenshots');

CREATE POLICY "feature-screenshots admin write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'feature-screenshots' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "feature-screenshots admin update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'feature-screenshots' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "feature-screenshots admin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'feature-screenshots' AND public.has_role(auth.uid(), 'admin'));
