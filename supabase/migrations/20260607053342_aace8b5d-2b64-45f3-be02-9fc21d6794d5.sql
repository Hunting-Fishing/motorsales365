
-- 1) Allow direct approve/reject from a brand-new inquiry
CREATE OR REPLACE FUNCTION public.enforce_ad_inquiry_status_transitions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    (old_s = 'quoted'    AND new_s IN ('won','lost'))
  ) THEN
    RAISE EXCEPTION 'Invalid ad inquiry status transition: % -> %', old_s, new_s;
  END IF;
  RETURN NEW;
END $function$;

-- 2) Email the sponsor when a decision is made
CREATE OR REPLACE FUNCTION public.tg_notify_ad_inquiry_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'inquiry_id', NEW.id
    )
  ));
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_notify_ad_inquiry_decision ON public.ad_inquiries;
CREATE TRIGGER trg_notify_ad_inquiry_decision
AFTER UPDATE OF status ON public.ad_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.tg_notify_ad_inquiry_decision();
