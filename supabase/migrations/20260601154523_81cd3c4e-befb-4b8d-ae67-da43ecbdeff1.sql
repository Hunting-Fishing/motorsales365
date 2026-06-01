-- Phase 1 P0: lifecycle email triggers (business submitted/approved, verification submitted/approved/rejected, booking status changed)

-- ============ 1) Business submitted (on INSERT) ============
CREATE OR REPLACE FUNCTION public.tg_notify_business_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_email text;
  owner_name text;
BEGIN
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;
  SELECT email INTO owner_email FROM auth.users WHERE id = NEW.owner_id;
  SELECT COALESCE(NULLIF(full_name,''), first_name, owner_email) INTO owner_name
    FROM public.profiles WHERE id = NEW.owner_id;
  IF owner_email IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'business-submitted',
    'to', owner_email,
    'data', jsonb_build_object(
      'name', owner_name,
      'business_name', NEW.name,
      'business_slug', NEW.slug,
      'status', NEW.status::text
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_business_submitted ON public.businesses;
CREATE TRIGGER trg_notify_business_submitted
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_business_submitted();

-- ============ 2) Business approved/published (on UPDATE status -> active from a non-active prior) ============
CREATE OR REPLACE FUNCTION public.tg_notify_business_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_email text;
  owner_name text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'active' OR OLD.status = 'archived' THEN
    -- 'archived' -> 'active' is a restore (handled by existing restore trigger)
    RETURN NEW;
  END IF;
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;

  SELECT email INTO owner_email FROM auth.users WHERE id = NEW.owner_id;
  SELECT COALESCE(NULLIF(full_name,''), first_name, owner_email) INTO owner_name
    FROM public.profiles WHERE id = NEW.owner_id;
  IF owner_email IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'business-approved',
    'to', owner_email,
    'data', jsonb_build_object(
      'name', owner_name,
      'business_name', NEW.name,
      'business_slug', NEW.slug
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_business_approved ON public.businesses;
CREATE TRIGGER trg_notify_business_approved
AFTER UPDATE OF status ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_business_approved();

-- ============ 3) Verification submitted (INSERT or status->pending on UPDATE) ============
CREATE OR REPLACE FUNCTION public.tg_notify_verification_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uemail text;
  uname text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status::text = OLD.status::text THEN RETURN NEW; END IF;
  IF NEW.status::text <> 'pending' THEN RETURN NEW; END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = NEW.user_id;
  SELECT COALESCE(NULLIF(full_name,''), first_name, uemail) INTO uname
    FROM public.profiles WHERE id = NEW.user_id;
  IF uemail IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'verification-submitted',
    'to', uemail,
    'data', jsonb_build_object(
      'name', uname,
      'legal_name', NEW.legal_name,
      'business_kind', NEW.business_kind::text
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_verification_submitted ON public.verification_requests;
CREATE TRIGGER trg_notify_verification_submitted
AFTER INSERT OR UPDATE OF status ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_verification_submitted();

-- ============ 4) Verification approved / rejected (on UPDATE status) ============
CREATE OR REPLACE FUNCTION public.tg_notify_verification_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uemail text;
  uname text;
  tpl text;
BEGIN
  IF NEW.status::text = OLD.status::text THEN RETURN NEW; END IF;
  IF NEW.status::text = 'approved' THEN
    tpl := 'verification-approved';
  ELSIF NEW.status::text = 'rejected' THEN
    tpl := 'verification-rejected';
  ELSE
    RETURN NEW;
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = NEW.user_id;
  SELECT COALESCE(NULLIF(full_name,''), first_name, uemail) INTO uname
    FROM public.profiles WHERE id = NEW.user_id;
  IF uemail IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', tpl,
    'to', uemail,
    'data', jsonb_build_object(
      'name', uname,
      'legal_name', NEW.legal_name,
      'review_notes', COALESCE(NEW.review_notes, '')
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_verification_decision ON public.verification_requests;
CREATE TRIGGER trg_notify_verification_decision
AFTER UPDATE OF status ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_verification_decision();

-- ============ 5) Booking status changed (on UPDATE status) ============
CREATE OR REPLACE FUNCTION public.tg_notify_booking_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  biz_name text;
  biz_slug text;
  svc_title text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('confirmed','cancelled','completed','no_show') THEN RETURN NEW; END IF;
  IF NEW.customer_email IS NULL OR length(btrim(NEW.customer_email)) = 0 THEN RETURN NEW; END IF;

  SELECT name, slug INTO biz_name, biz_slug FROM public.businesses WHERE id = NEW.business_id;
  SELECT title INTO svc_title FROM public.business_bookable_items WHERE id = NEW.bookable_item_id;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', 'booking-status-changed',
    'to', NEW.customer_email,
    'data', jsonb_build_object(
      'customer_name', COALESCE(NEW.customer_name, 'there'),
      'business_name', COALESCE(biz_name, 'the business'),
      'business_slug', COALESCE(biz_slug, ''),
      'service_title', COALESCE(svc_title, 'your appointment'),
      'starts_at_human', to_char(NEW.starts_at AT TIME ZONE 'Asia/Manila', 'Dy, Mon DD YYYY · HH12:MI AM'),
      'status', NEW.status
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_booking_status_changed ON public.business_bookings;
CREATE TRIGGER trg_notify_booking_status_changed
AFTER UPDATE OF status ON public.business_bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_booking_status_changed();
