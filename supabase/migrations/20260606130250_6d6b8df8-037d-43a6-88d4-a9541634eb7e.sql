
CREATE TABLE public.business_claim_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.business_claim_requests(id) ON DELETE CASCADE,
  uploader_user_id UUID NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('facebook_ownership','google_business','business_license','utility_bill','id_document','website_proof','other')),
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_bce_claim ON public.business_claim_evidence(claim_id);
CREATE INDEX idx_bce_uploader ON public.business_claim_evidence(uploader_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_claim_evidence TO authenticated;
GRANT ALL ON public.business_claim_evidence TO service_role;

ALTER TABLE public.business_claim_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own claim evidence"
  ON public.business_claim_evidence FOR SELECT TO authenticated
  USING (uploader_user_id = auth.uid() OR public.can_moderate(auth.uid()));

CREATE POLICY "Users insert own claim evidence"
  ON public.business_claim_evidence FOR INSERT TO authenticated
  WITH CHECK (
    uploader_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.business_claim_requests c
      WHERE c.id = claim_id AND c.claimant_user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete own claim evidence"
  ON public.business_claim_evidence FOR DELETE TO authenticated
  USING (uploader_user_id = auth.uid() OR public.can_moderate(auth.uid()));

-- Storage RLS for the claim-evidence bucket. Path convention: {user_id}/{claim_id}/{filename}
CREATE POLICY "Claim evidence upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'claim-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Claim evidence read own or mod"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'claim-evidence'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.can_moderate(auth.uid()))
  );

CREATE POLICY "Claim evidence delete own or mod"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'claim-evidence'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.can_moderate(auth.uid()))
  );
