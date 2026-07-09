
-- Migrate legacy status values to the new workflow vocabulary
ALTER TABLE public.network_part_inquiries DROP CONSTRAINT IF EXISTS network_part_inquiries_status_check;

UPDATE public.network_part_inquiries
SET status = 'pending'
WHERE status IN ('new','contacted');

ALTER TABLE public.network_part_inquiries
  ALTER COLUMN status SET DEFAULT 'pending',
  ADD CONSTRAINT network_part_inquiries_status_check
    CHECK (status IN ('pending','accepted','rejected','fulfilled','closed'));

-- Response tracking columns
ALTER TABLE public.network_part_inquiries
  ADD COLUMN IF NOT EXISTS response_note text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Auto-stamp responded_at/responded_by when status changes away from pending
CREATE OR REPLACE FUNCTION public.stamp_network_inquiry_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending' THEN
    IF NEW.responded_at IS NULL OR NEW.responded_at = OLD.responded_at THEN
      NEW.responded_at := now();
    END IF;
    IF NEW.responded_by IS NULL THEN
      NEW.responded_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_npi_stamp_response ON public.network_part_inquiries;
CREATE TRIGGER trg_npi_stamp_response
  BEFORE UPDATE ON public.network_part_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.stamp_network_inquiry_response();

CREATE INDEX IF NOT EXISTS npi_status_idx
  ON public.network_part_inquiries(business_id, status, created_at DESC);
