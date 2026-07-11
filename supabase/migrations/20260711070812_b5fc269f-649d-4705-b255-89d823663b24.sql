-- Notify listing owner when a new message arrives, like Messenger.
CREATE OR REPLACE FUNCTION public.tg_notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
  v_sender_name TEXT;
  v_listing_title TEXT;
BEGIN
  SELECT COALESCE(business_name, full_name, 'Someone')
    INTO v_sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  SELECT title INTO v_listing_title
    FROM public.listings WHERE id = NEW.listing_id;

  v_title := COALESCE(v_sender_name, 'New message') || ' sent you a message';
  v_body  := CASE
    WHEN v_listing_title IS NOT NULL THEN 'Re: ' || v_listing_title || E'\n' || LEFT(NEW.body, 140)
    ELSE LEFT(NEW.body, 200)
  END;

  INSERT INTO public.user_notifications
    (user_id, title, body, link_url, entity_type, entity_id)
  VALUES
    (NEW.recipient_id, v_title, v_body,
     '/dashboard/messages',
     'message', NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_message_recipient ON public.messages;
CREATE TRIGGER trg_notify_message_recipient
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_message_recipient();
