
-- Allow user to update their own request when pending, more_info, OR rejected (for resubmit).
DROP POLICY IF EXISTS "Users update own pending requests" ON public.verification_requests;
CREATE POLICY "Users update own editable requests"
ON public.verification_requests
FOR UPDATE
USING (
  auth.uid() = user_id
  AND status = ANY (ARRAY['pending'::verification_request_status,
                          'more_info'::verification_request_status,
                          'rejected'::verification_request_status])
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'::verification_request_status
);

-- When the requester edits a rejected/more_info row, auto-flip to pending and clear review fields.
CREATE OR REPLACE FUNCTION public.tg_verification_user_resubmit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when the actor is the row owner (not an admin/moderator update path).
  IF auth.uid() IS NULL OR auth.uid() <> NEW.user_id THEN
    RETURN NEW;
  END IF;
  IF OLD.status IN ('rejected','more_info') THEN
    NEW.status := 'pending';
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.review_notes := NULL;
    NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS verification_user_resubmit ON public.verification_requests;
CREATE TRIGGER verification_user_resubmit
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.tg_verification_user_resubmit();
