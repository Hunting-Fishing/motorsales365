
CREATE OR REPLACE FUNCTION public.tg_notify_chat_thread_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title text;
  v_preview text;
  v_sender_name text;
BEGIN
  SELECT title INTO v_title FROM public.chat_threads WHERE id = NEW.thread_id;
  SELECT COALESCE(business_name, full_name, 'Someone') INTO v_sender_name
  FROM public.public_profiles WHERE id = NEW.sender_id;

  IF NEW.body IS NOT NULL AND length(NEW.body) > 0 THEN
    v_preview := left(NEW.body, 140);
  ELSIF NEW.attachment_type = 'image' THEN v_preview := 'sent a photo';
  ELSIF NEW.attachment_type = 'video' THEN v_preview := 'sent a video';
  ELSIF NEW.attachment_type = 'gif' THEN v_preview := 'sent a GIF';
  ELSE v_preview := 'sent a message';
  END IF;

  INSERT INTO public.user_notifications (user_id, category, title, body, link_url, entity_type, entity_id, metadata)
  SELECT
    m.user_id,
    'chat_message',
    COALESCE(v_title, 'Group chat'),
    v_sender_name || ': ' || v_preview,
    '/dashboard/messages?thread=' || NEW.thread_id::text,
    'chat_thread',
    NEW.thread_id,
    jsonb_build_object('thread_id', NEW.thread_id, 'sender_id', NEW.sender_id)
  FROM public.chat_thread_members m
  WHERE m.thread_id = NEW.thread_id
    AND m.user_id <> NEW.sender_id
    AND m.status = 'active';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_chat(p_title text, p_member_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_thread_id uuid;
  v_member uuid;
  v_clean text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_clean := btrim(coalesce(p_title, ''));
  IF v_clean = '' THEN RAISE EXCEPTION 'Title is required'; END IF;

  INSERT INTO public.chat_threads (title, created_by) VALUES (v_clean, v_uid)
  RETURNING id INTO v_thread_id;

  INSERT INTO public.chat_thread_members (thread_id, user_id, invited_by, status)
  VALUES (v_thread_id, v_uid, v_uid, 'active');

  IF p_member_ids IS NOT NULL THEN
    FOREACH v_member IN ARRAY p_member_ids LOOP
      IF v_member IS NOT NULL AND v_member <> v_uid THEN
        INSERT INTO public.chat_thread_members (thread_id, user_id, invited_by, status)
        VALUES (v_thread_id, v_member, v_uid, 'invited')
        ON CONFLICT DO NOTHING;

        INSERT INTO public.user_notifications (user_id, category, title, body, link_url, entity_type, entity_id, metadata)
        VALUES (
          v_member, 'chat_invite',
          'You were invited to a group chat', v_clean,
          '/dashboard/messages?thread=' || v_thread_id::text,
          'chat_thread', v_thread_id,
          jsonb_build_object('thread_id', v_thread_id, 'invited_by', v_uid)
        );
      END IF;
    END LOOP;
  END IF;
  RETURN v_thread_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_to_thread(p_thread_id uuid, p_user_ids uuid[])
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_title text;
  v_member uuid;
  v_added int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_active_thread_member(p_thread_id, v_uid) THEN
    RAISE EXCEPTION 'Not a member of this thread';
  END IF;
  SELECT title INTO v_title FROM public.chat_threads WHERE id = p_thread_id;
  IF p_user_ids IS NULL THEN RETURN 0; END IF;

  FOREACH v_member IN ARRAY p_user_ids LOOP
    IF v_member IS NOT NULL AND v_member <> v_uid THEN
      INSERT INTO public.chat_thread_members (thread_id, user_id, invited_by, status)
      VALUES (p_thread_id, v_member, v_uid, 'invited')
      ON CONFLICT (thread_id, user_id) DO NOTHING;
      IF FOUND THEN
        v_added := v_added + 1;
        INSERT INTO public.user_notifications (user_id, category, title, body, link_url, entity_type, entity_id, metadata)
        VALUES (
          v_member, 'chat_invite',
          'You were invited to a group chat', v_title,
          '/dashboard/messages?thread=' || p_thread_id::text,
          'chat_thread', p_thread_id,
          jsonb_build_object('thread_id', p_thread_id, 'invited_by', v_uid)
        );
      END IF;
    END IF;
  END LOOP;
  RETURN v_added;
END;
$$;
