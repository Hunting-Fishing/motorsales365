
-- 1) Extend businesses with seeding + claim metadata
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS claim_state text NOT NULL DEFAULT 'owned'
    CHECK (claim_state IN ('owned','unclaimed','claim_pending')),
  ADD COLUMN IF NOT EXISTS import_metadata jsonb,
  ADD COLUMN IF NOT EXISTS attribution text,
  ADD COLUMN IF NOT EXISTS removal_requested_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_businesses_claim_state
  ON public.businesses(claim_state) WHERE claim_state <> 'owned';

-- 2) Claim requests table
CREATE TABLE IF NOT EXISTS public.business_claim_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  claimant_user_id uuid NOT NULL,
  contact_method text NOT NULL CHECK (contact_method IN ('email','phone','document','social')),
  contact_value text,
  evidence_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','auto_approved')),
  reviewer_user_id uuid,
  reviewer_notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.business_claim_requests TO authenticated;
GRANT ALL ON public.business_claim_requests TO service_role;

ALTER TABLE public.business_claim_requests ENABLE ROW LEVEL SECURITY;

-- Claimant: insert only for self, only for unclaimed businesses
CREATE POLICY "Users submit own claim"
  ON public.business_claim_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    claimant_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.claim_state IN ('unclaimed','claim_pending')
        AND b.owner_id IS NULL
    )
  );

-- Claimant + staff can read
CREATE POLICY "Users read own claims"
  ON public.business_claim_requests
  FOR SELECT TO authenticated
  USING (claimant_user_id = auth.uid() OR public.can_moderate(auth.uid()));

-- Staff updates (decision)
CREATE POLICY "Staff update claims"
  ON public.business_claim_requests
  FOR UPDATE TO authenticated
  USING (public.can_moderate(auth.uid()))
  WITH CHECK (public.can_moderate(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_bcr_business ON public.business_claim_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_bcr_claimant ON public.business_claim_requests(claimant_user_id);
CREATE INDEX IF NOT EXISTS idx_bcr_status ON public.business_claim_requests(status);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_bcr_touch ON public.business_claim_requests;
CREATE TRIGGER trg_bcr_touch
  BEFORE UPDATE ON public.business_claim_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Tighten owner update policy: protect claim_state / owner_id / source fields
-- The existing field-freeze policy on listings (status/plan/boost_until/expires_at)
-- has its own protection. For businesses, owners can update most fields but NOT
-- ownership / sourcing / claim machinery. Add a check trigger to enforce this.

CREATE OR REPLACE FUNCTION public.guard_business_owner_update()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Service role / staff bypass
  IF (auth.uid() IS NULL) OR public.can_moderate(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.claim_state IS DISTINCT FROM OLD.claim_state
     OR NEW.source IS DISTINCT FROM OLD.source
     OR NEW.source_external_id IS DISTINCT FROM OLD.source_external_id
     OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.featured IS DISTINCT FROM OLD.featured
     OR NEW.featured_until IS DISTINCT FROM OLD.featured_until
     OR NEW.status IS DISTINCT FROM OLD.status
  THEN
    RAISE EXCEPTION 'Cannot modify protected business fields';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_business_owner_update ON public.businesses;
CREATE TRIGGER trg_guard_business_owner_update
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.guard_business_owner_update();

-- 4) Helper: approve a claim (server-side, SECURITY DEFINER, used by server fns)
CREATE OR REPLACE FUNCTION public.approve_business_claim(_claim_id uuid, _auto boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_bid uuid; v_uid uuid;
BEGIN
  SELECT business_id, claimant_user_id INTO v_bid, v_uid
    FROM public.business_claim_requests WHERE id = _claim_id;
  IF v_bid IS NULL THEN RAISE EXCEPTION 'Claim not found'; END IF;

  UPDATE public.businesses
     SET owner_id = v_uid,
         claim_state = 'owned',
         updated_at = now()
   WHERE id = v_bid AND owner_id IS NULL;

  UPDATE public.business_claim_requests
     SET status = CASE WHEN _auto THEN 'auto_approved' ELSE 'approved' END,
         decided_at = now()
   WHERE id = _claim_id;

  -- Reject sibling pending claims for the same business
  UPDATE public.business_claim_requests
     SET status = 'rejected',
         reviewer_notes = COALESCE(reviewer_notes,'') || E'\nAuto-rejected: another claim approved.',
         decided_at = now()
   WHERE business_id = v_bid AND id <> _claim_id AND status = 'pending';
END $$;

REVOKE ALL ON FUNCTION public.approve_business_claim(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_business_claim(uuid, boolean) TO service_role;
