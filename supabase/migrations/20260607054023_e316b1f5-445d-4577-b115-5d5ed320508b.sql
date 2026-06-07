
-- 1. Schema additions
ALTER TABLE public.ad_inquiries
  ADD COLUMN IF NOT EXISTS last_rejection_reason text;

ALTER TABLE public.ad_inquiry_audit
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Allow sponsors to read their own audit trail
GRANT SELECT ON public.ad_inquiry_audit TO authenticated;

DROP POLICY IF EXISTS "Submitter reads own audit" ON public.ad_inquiry_audit;
CREATE POLICY "Submitter reads own audit"
ON public.ad_inquiry_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ad_inquiries i
    WHERE i.id = ad_inquiry_audit.inquiry_id
      AND (
        i.submitter_user_id = auth.uid()
        OR lower(i.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
  )
);

-- 3. Expanded audit trigger with semantic actions + edited field tracking
CREATE OR REPLACE FUNCTION public.tg_audit_ad_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_name text;
  changed_fields text[] := ARRAY[]::text[];
  meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, to_value)
      VALUES (NEW.id, NEW.submitter_user_id, 'created', NEW.status::text);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      action_name := CASE
        WHEN NEW.status::text = 'won' THEN 'approved'
        WHEN NEW.status::text = 'lost' THEN 'rejected'
        WHEN OLD.status::text = 'lost' AND NEW.status::text = 'new' THEN 'resubmitted'
        ELSE 'status_changed'
      END;
      meta := '{}'::jsonb;
      IF action_name = 'rejected' AND NEW.last_rejection_reason IS NOT NULL THEN
        meta := jsonb_build_object('reason', NEW.last_rejection_reason);
      END IF;
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value, metadata)
        VALUES (NEW.id, auth.uid(), action_name, OLD.status::text, NEW.status::text, meta);
    END IF;

    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, from_value, to_value)
        VALUES (NEW.id, auth.uid(), 'assigned',
                COALESCE(OLD.assigned_to::text,''), COALESCE(NEW.assigned_to::text,''));
    END IF;

    IF COALESCE(NEW.internal_notes,'') IS DISTINCT FROM COALESCE(OLD.internal_notes,'') THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action)
        VALUES (NEW.id, auth.uid(), 'notes_updated');
    END IF;

    -- Track sponsor edits to user-visible fields
    IF NEW.contact_name IS DISTINCT FROM OLD.contact_name THEN changed_fields := changed_fields || 'contact_name'; END IF;
    IF COALESCE(NEW.company,'') IS DISTINCT FROM COALESCE(OLD.company,'') THEN changed_fields := changed_fields || 'company'; END IF;
    IF COALESCE(NEW.phone,'') IS DISTINCT FROM COALESCE(OLD.phone,'') THEN changed_fields := changed_fields || 'phone'; END IF;
    IF NEW.placement IS DISTINCT FROM OLD.placement THEN changed_fields := changed_fields || 'placement'; END IF;
    IF COALESCE(NEW.budget_range,'') IS DISTINCT FROM COALESCE(OLD.budget_range,'') THEN changed_fields := changed_fields || 'budget_range'; END IF;
    IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN changed_fields := changed_fields || 'start_date'; END IF;
    IF NEW.message IS DISTINCT FROM OLD.message THEN changed_fields := changed_fields || 'message'; END IF;

    IF array_length(changed_fields, 1) > 0 THEN
      INSERT INTO public.ad_inquiry_audit(inquiry_id, actor_id, action, metadata)
        VALUES (NEW.id, auth.uid(), 'edited',
                jsonb_build_object('fields', to_jsonb(changed_fields)));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Lock down last_rejection_reason from non-admin updates
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
  NEW.last_rejection_reason := OLD.last_rejection_reason;
  RETURN NEW;
END
$$;

-- 5. Include reason in rejection email payload
CREATE OR REPLACE FUNCTION public.tg_notify_ad_inquiry_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tpl text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status::text = 'won' THEN
    tpl := 'ad-inquiry-approved';
  ELSIF NEW.status::text = 'lost' THEN
    tpl := 'ad-inquiry-rejected';
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.email IS NULL OR length(btrim(NEW.email)) = 0 THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', tpl,
    'to', NEW.email,
    'data', jsonb_build_object(
      'contact_name', NEW.contact_name,
      'company', COALESCE(NEW.company, ''),
      'placement', NEW.placement::text,
      'inquiry_id', NEW.id,
      'reason', COALESCE(NEW.last_rejection_reason, '')
    )
  ));
  RETURN NEW;
END
$$;
