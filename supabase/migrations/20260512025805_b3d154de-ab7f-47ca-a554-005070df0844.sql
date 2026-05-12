-- 1. Length / format checks via BEFORE INSERT/UPDATE trigger on ad_inquiries
CREATE OR REPLACE FUNCTION public.validate_ad_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.contact_name := btrim(NEW.contact_name);
  NEW.email := lower(btrim(NEW.email));
  IF NEW.company IS NOT NULL THEN NEW.company := btrim(NEW.company); END IF;
  IF NEW.phone IS NOT NULL THEN NEW.phone := btrim(NEW.phone); END IF;
  IF NEW.budget_range IS NOT NULL THEN NEW.budget_range := btrim(NEW.budget_range); END IF;
  NEW.message := btrim(NEW.message);

  IF char_length(NEW.contact_name) < 1 OR char_length(NEW.contact_name) > 100 THEN
    RAISE EXCEPTION 'contact_name must be 1-100 characters';
  END IF;
  IF NEW.company IS NOT NULL AND char_length(NEW.company) > 120 THEN
    RAISE EXCEPTION 'company must be at most 120 characters';
  END IF;
  IF char_length(NEW.email) > 255 OR NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'email is invalid';
  END IF;
  IF NEW.phone IS NOT NULL AND char_length(NEW.phone) > 30 THEN
    RAISE EXCEPTION 'phone must be at most 30 characters';
  END IF;
  IF NEW.budget_range IS NOT NULL AND char_length(NEW.budget_range) > 60 THEN
    RAISE EXCEPTION 'budget_range must be at most 60 characters';
  END IF;
  IF char_length(NEW.message) < 10 OR char_length(NEW.message) > 2000 THEN
    RAISE EXCEPTION 'message must be 10-2000 characters';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_ad_inquiry ON public.ad_inquiries;
CREATE TRIGGER trg_validate_ad_inquiry
BEFORE INSERT OR UPDATE OF contact_name, email, company, phone, budget_range, message ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.validate_ad_inquiry();

-- 2. Status transition trigger
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
    (old_s = 'new'       AND new_s IN ('in_review','spam')) OR
    (old_s = 'in_review' AND new_s IN ('quoted','lost','spam')) OR
    (old_s = 'quoted'    AND new_s IN ('won','lost'))
  ) THEN
    RAISE EXCEPTION 'Invalid ad inquiry status transition: % -> %', old_s, new_s;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ad_inquiry_status ON public.ad_inquiries;
CREATE TRIGGER trg_ad_inquiry_status
BEFORE UPDATE OF status ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.enforce_ad_inquiry_status_transitions();

-- 3. Enqueue confirmation + staff notice on new inquiry
CREATE OR REPLACE FUNCTION public.on_ad_inquiry_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Advertiser confirmation
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'ad-inquiry-received',
    'to', NEW.email,
    'data', jsonb_build_object(
      'contact_name', NEW.contact_name,
      'placement', NEW.placement::text,
      'inquiry_id', NEW.id
    )
  ));
  -- Staff notice
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'ad-inquiry-staff-notice',
    'to', 'partners@365motorsales.ph',
    'data', jsonb_build_object(
      'contact_name', NEW.contact_name,
      'company', NEW.company,
      'email', NEW.email,
      'phone', NEW.phone,
      'placement', NEW.placement::text,
      'budget_range', NEW.budget_range,
      'start_date', NEW.start_date::text,
      'message', NEW.message,
      'inquiry_id', NEW.id
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ad_inquiry_created ON public.ad_inquiries;
CREATE TRIGGER trg_ad_inquiry_created
AFTER INSERT ON public.ad_inquiries
FOR EACH ROW EXECUTE FUNCTION public.on_ad_inquiry_created();

-- 4. Enqueue staff reply email on ad_inquiry_messages insert (from_staff = true)
CREATE OR REPLACE FUNCTION public.on_ad_inquiry_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.ad_inquiries%ROWTYPE;
BEGIN
  IF NEW.from_staff IS NOT TRUE THEN RETURN NEW; END IF;
  SELECT * INTO rec FROM public.ad_inquiries WHERE id = NEW.inquiry_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'ad-inquiry-reply',
    'to', rec.email,
    'data', jsonb_build_object(
      'contact_name', rec.contact_name,
      'sender_name', NEW.sender_name,
      'body', NEW.body,
      'inquiry_id', rec.id
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ad_inquiry_reply ON public.ad_inquiry_messages;
CREATE TRIGGER trg_ad_inquiry_reply
AFTER INSERT ON public.ad_inquiry_messages
FOR EACH ROW EXECUTE FUNCTION public.on_ad_inquiry_reply();