
-- 1. Columns on payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS review_state text NOT NULL DEFAULT 'awaiting_review',
  ADD COLUMN IF NOT EXISTS review_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_started_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_review_state_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_review_state_check
  CHECK (review_state IN ('awaiting_review','in_review','approved','rejected','not_applicable'));

-- Backfill existing rows: terminal statuses get review_state set; non-manual payments are n/a.
UPDATE public.payments
   SET review_state = CASE
     WHEN status = 'paid' AND method IS NOT NULL THEN 'approved'
     WHEN status = 'failed' AND method IS NOT NULL THEN 'rejected'
     WHEN method IS NULL THEN 'not_applicable'
     ELSE 'awaiting_review'
   END
 WHERE review_state = 'awaiting_review';

CREATE INDEX IF NOT EXISTS idx_payments_review_state ON public.payments(review_state, created_at DESC);

-- 2. Audit table
CREATE TABLE IF NOT EXISTS public.payment_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id),
  from_state text,
  to_state text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_review_events TO authenticated;
GRANT ALL ON public.payment_review_events TO service_role;

ALTER TABLE public.payment_review_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage payment review events" ON public.payment_review_events;
CREATE POLICY "Admins manage payment review events"
  ON public.payment_review_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Owners view own payment review events" ON public.payment_review_events;
CREATE POLICY "Owners view own payment review events"
  ON public.payment_review_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.id = payment_review_events.payment_id AND p.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_payment_review_events_payment ON public.payment_review_events(payment_id, created_at DESC);

-- 3. Trigger to auto-audit review_state transitions
CREATE OR REPLACE FUNCTION public.tg_payment_review_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.review_state IS DISTINCT FROM OLD.review_state THEN
    INSERT INTO public.payment_review_events(payment_id, actor_id, from_state, to_state, note)
    VALUES (
      NEW.id,
      auth.uid(),
      OLD.review_state,
      NEW.review_state,
      COALESCE(NEW.review_notes, NEW.rejection_reason)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS payments_review_audit ON public.payments;
CREATE TRIGGER payments_review_audit
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_payment_review_audit();
