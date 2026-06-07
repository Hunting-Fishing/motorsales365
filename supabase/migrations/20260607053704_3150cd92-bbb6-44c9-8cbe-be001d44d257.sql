
-- Allow lost -> new transition for resubmissions
CREATE OR REPLACE FUNCTION public.enforce_ad_inquiry_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := has_role(uid, 'admin'::app_role);
  old_s text;
  new_s text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF is_admin THEN RETURN NEW; END IF;

  old_s := OLD.status::text;
  new_s := NEW.status::text;

  IF NOT (
    (old_s = 'new'       AND new_s IN ('in_review','spam','won','lost')) OR
    (old_s = 'in_review' AND new_s IN ('quoted','lost','won','spam')) OR
    (old_s = 'quoted'    AND new_s IN ('won','lost')) OR
    (old_s = 'lost'      AND new_s = 'new')
  ) THEN
    RAISE EXCEPTION 'Invalid ad inquiry status transition: % -> %', old_s, new_s;
  END IF;
  RETURN NEW;
END
$$;

-- Protect admin-only fields when a non-admin submitter edits their inquiry
CREATE OR REPLACE FUNCTION public.protect_ad_inquiry_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN NEW; END IF;
  IF can_manage_ads(uid) OR has_role(uid, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Non-admin submitter: lock down admin/system columns
  NEW.assigned_to := OLD.assigned_to;
  NEW.internal_notes := OLD.internal_notes;
  NEW.submitter_user_id := OLD.submitter_user_id;
  NEW.email := OLD.email;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_protect_ad_inquiry_admin_fields ON public.ad_inquiries;
CREATE TRIGGER trg_protect_ad_inquiry_admin_fields
BEFORE UPDATE ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.protect_ad_inquiry_admin_fields();

-- RLS: allow sponsor to update their own rejected inquiry, resetting status to new
CREATE POLICY "Submitter resubmits own rejected inquiry"
ON public.ad_inquiries
FOR UPDATE
TO authenticated
USING (
  submitter_user_id IS NOT NULL
  AND submitter_user_id = auth.uid()
  AND status = 'lost'::ad_inquiry_status
)
WITH CHECK (
  submitter_user_id = auth.uid()
  AND status = 'new'::ad_inquiry_status
);
