
ALTER TABLE public.business_claim_requests
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'claim';

DO $$ BEGIN
  ALTER TABLE public.business_claim_requests
    ADD CONSTRAINT business_claim_requests_kind_check CHECK (kind IN ('claim','transfer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_bcr_kind_status
  ON public.business_claim_requests (kind, status);

DROP POLICY IF EXISTS "Users submit own claim" ON public.business_claim_requests;

CREATE POLICY "Users submit own claim" ON public.business_claim_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    claimant_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_claim_requests.business_id
        AND (
          (business_claim_requests.kind = 'claim'
            AND b.claim_state IN ('unclaimed','claim_pending')
            AND b.owner_id IS NULL)
          OR
          (business_claim_requests.kind = 'transfer'
            AND b.owner_id IS NOT NULL
            AND b.owner_id <> auth.uid())
        )
    )
  );
