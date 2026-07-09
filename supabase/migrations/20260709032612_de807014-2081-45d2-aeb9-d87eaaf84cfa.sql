
CREATE OR REPLACE FUNCTION public.notify_network_inquiry_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz_name text;
  biz_slug text;
BEGIN
  SELECT name, slug INTO biz_name, biz_slug FROM public.businesses WHERE id = NEW.business_id;

  INSERT INTO public.user_notifications
    (user_id, category, title, body, link_url, entity_type, entity_id, metadata)
  SELECT
    s.user_id,
    'network_inquiry',
    'New parts request: ' || NEW.part_name,
    coalesce(NEW.contact_name, 'A customer') ||
      ' requested ' || NEW.quantity || ' × ' || NEW.part_name ||
      coalesce(' (SKU ' || NEW.sku || ')', ''),
    '/dashboard/business/' || NEW.business_id::text || '/inventory',
    'network_part_inquiry',
    NEW.id,
    jsonb_build_object(
      'business_id', NEW.business_id,
      'business_name', biz_name,
      'status', NEW.status
    )
  FROM public.business_staff s
  WHERE s.business_id = NEW.business_id
    AND s.active
    AND s.role IN ('owner','manager');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_npi_notify_created ON public.network_part_inquiries;
CREATE TRIGGER trg_npi_notify_created
  AFTER INSERT ON public.network_part_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.notify_network_inquiry_created();


CREATE OR REPLACE FUNCTION public.notify_network_inquiry_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz_name text;
  status_label text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.requester_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO biz_name FROM public.businesses WHERE id = NEW.business_id;
  status_label := initcap(NEW.status);

  INSERT INTO public.user_notifications
    (user_id, category, title, body, link_url, entity_type, entity_id, metadata)
  VALUES (
    NEW.requester_user_id,
    'network_inquiry',
    status_label || ': ' || NEW.part_name,
    coalesce(biz_name, 'The shop') ||
      ' marked your request for ' || NEW.part_name || ' as ' || NEW.status ||
      coalesce('. ' || NEW.response_note, '') ||
      coalesce('. ' || NEW.fulfilled_message, ''),
    '/parts/my-requests',
    'network_part_inquiry',
    NEW.id,
    jsonb_build_object(
      'business_id', NEW.business_id,
      'business_name', biz_name,
      'status', NEW.status,
      'fulfilled_price', NEW.fulfilled_price,
      'fulfilled_eta', NEW.fulfilled_eta
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_npi_notify_status ON public.network_part_inquiries;
CREATE TRIGGER trg_npi_notify_status
  AFTER UPDATE ON public.network_part_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.notify_network_inquiry_status_change();
