-- Extend messages with attachments
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_thumb_url text,
  ADD COLUMN IF NOT EXISTS attachment_meta jsonb,
  ADD COLUMN IF NOT EXISTS attachment_path text;

-- Allow empty body when attachment present: relax NOT NULL if it was set
ALTER TABLE public.messages ALTER COLUMN body DROP NOT NULL;

-- Mark a conversation unread (most recent inbound message)
CREATE OR REPLACE FUNCTION public.mark_conversation_unread(
  p_listing_id uuid,
  p_other_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT id INTO v_id
  FROM public.messages
  WHERE listing_id = p_listing_id
    AND recipient_id = v_uid
    AND sender_id = p_other_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE public.messages SET read_at = NULL WHERE id = v_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_unread(uuid, uuid) TO authenticated;

-- Update notify trigger to describe attachment when body is empty
CREATE OR REPLACE FUNCTION public.tg_notify_message_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
  v_preview TEXT;
  v_sender_name TEXT;
  v_listing_title TEXT;
BEGIN
  SELECT COALESCE(business_name, full_name, 'Someone')
    INTO v_sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  SELECT title INTO v_listing_title
    FROM public.listings WHERE id = NEW.listing_id;

  v_preview := CASE
    WHEN COALESCE(NEW.body, '') <> '' THEN LEFT(NEW.body, 140)
    WHEN NEW.attachment_type = 'image' THEN '📷 Sent a photo'
    WHEN NEW.attachment_type = 'video' THEN '🎬 Sent a video'
    WHEN NEW.attachment_type = 'gif'   THEN 'Sent a GIF'
    ELSE 'Sent an attachment'
  END;

  v_title := COALESCE(v_sender_name, 'New message') || ' sent you a message';
  v_body  := CASE
    WHEN v_listing_title IS NOT NULL THEN 'Re: ' || v_listing_title || E'\n' || v_preview
    ELSE v_preview
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

-- Storage RLS for message-media (private bucket)
-- Path convention: {auth.uid()}/{uuid}.{ext}
CREATE POLICY "message-media: upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "message-media: read own uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "message-media: read as recipient"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-media'
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.attachment_path = storage.objects.name
        AND m.recipient_id = auth.uid()
    )
  );

CREATE POLICY "message-media: delete own uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'message-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );