
ALTER TABLE public.reports
  ALTER COLUMN listing_id DROP NOT NULL,
  ALTER COLUMN reporter_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'listing'
    CHECK (target_type IN ('listing','business','seller','other')),
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS evidence_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reporter_name text,
  ADD COLUMN IF NOT EXISTS reporter_email text,
  ADD COLUMN IF NOT EXISTS reporter_phone text;

CREATE INDEX IF NOT EXISTS reports_business_id_idx ON public.reports(business_id);
CREATE INDEX IF NOT EXISTS reports_target_type_idx ON public.reports(target_type);

DROP POLICY IF EXISTS "Users create reports" ON public.reports;
CREATE POLICY "Anyone can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    (reporter_id IS NULL AND auth.uid() IS NULL)
    OR reporter_id = auth.uid()
  );

GRANT INSERT ON public.reports TO anon;

-- Storage policies for report-evidence bucket
CREATE POLICY "Anyone can upload report evidence"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'report-evidence');

CREATE POLICY "Moderators read report evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-evidence' AND public.can_support(auth.uid()));
