CREATE OR REPLACE FUNCTION public.tg_notify_business_archive_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_email text;
  owner_name text;
  tpl text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'archived' AND OLD.status IS DISTINCT FROM 'archived' THEN
    tpl := 'business-archived';
  ELSIF OLD.status = 'archived' AND NEW.status = 'active' THEN
    tpl := 'business-restored';
  ELSE
    RETURN NEW;
  END IF;

  SELECT email INTO owner_email FROM auth.users WHERE id = NEW.owner_id;
  SELECT COALESCE(NULLIF(full_name,''), first_name, owner_email) INTO owner_name
    FROM public.profiles WHERE id = NEW.owner_id;
  IF owner_email IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'template', tpl,
    'to', owner_email,
    'data', jsonb_build_object(
      'name', owner_name,
      'business_name', NEW.name,
      'business_slug', NEW.slug
    )
  ));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_business_archive_change ON public.businesses;
CREATE TRIGGER trg_notify_business_archive_change
AFTER UPDATE OF status ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.tg_notify_business_archive_change();