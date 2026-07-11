
-- 1. Tables
CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_thread_members (
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','left')),
  last_read_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_thread_members TO authenticated;
GRANT ALL ON public.chat_thread_members TO service_role;
ALTER TABLE public.chat_thread_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  attachment_url text,
  attachment_type text CHECK (attachment_type IN ('image','video','gif')),
  attachment_thumb_url text,
  attachment_path text,
  attachment_meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_thread_messages TO authenticated;
GRANT ALL ON public.chat_thread_messages TO service_role;
ALTER TABLE public.chat_thread_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chat_thread_messages_thread ON public.chat_thread_messages(thread_id, created_at);
CREATE INDEX idx_chat_thread_members_user ON public.chat_thread_members(user_id, status);

-- 2. Helper (SECURITY DEFINER to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_thread_member(_thread uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_thread_members
    WHERE thread_id = _thread AND user_id = _user AND status IN ('active','invited')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_thread_member(_thread uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_thread_members
    WHERE thread_id = _thread AND user_id = _user AND status = 'active'
  );
$$;

-- 3. Policies
CREATE POLICY "Members view threads" ON public.chat_threads
  FOR SELECT TO authenticated
  USING (public.is_thread_member(id, auth.uid()));

CREATE POLICY "Anyone can create threads" ON public.chat_threads
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator can update thread" ON public.chat_threads
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Members see member rows" ON public.chat_thread_members
  FOR SELECT TO authenticated
  USING (public.is_thread_member(thread_id, auth.uid()));

CREATE POLICY "Active members can invite" ON public.chat_thread_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_thread_member(thread_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.created_by = auth.uid())
  );

CREATE POLICY "User can update own membership" ON public.chat_thread_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members view thread messages" ON public.chat_thread_messages
  FOR SELECT TO authenticated
  USING (public.is_thread_member(thread_id, auth.uid()));

CREATE POLICY "Active members can send" ON public.chat_thread_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_active_thread_member(thread_id, auth.uid()));

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_touch_chat_thread()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.chat_threads SET updated_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_touch_chat_thread_on_message
AFTER INSERT ON public.chat_thread_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_chat_thread();

-- 5. Notification trigger for group messages
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

  INSERT INTO public.user_notifications (user_id, type, title, body, url, metadata)
  SELECT
    m.user_id,
    'chat_message',
    COALESCE(v_title, 'Group chat'),
    v_sender_name || ': ' || v_preview,
    '/dashboard/messages?thread=' || NEW.thread_id::text,
    jsonb_build_object('thread_id', NEW.thread_id, 'sender_id', NEW.sender_id)
  FROM public.chat_thread_members m
  WHERE m.thread_id = NEW.thread_id
    AND m.user_id <> NEW.sender_id
    AND m.status = 'active';

  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_chat_thread_message
AFTER INSERT ON public.chat_thread_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_chat_thread_message();

-- 6. RPCs
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

        INSERT INTO public.user_notifications (user_id, type, title, body, url, metadata)
        VALUES (
          v_member,
          'chat_invite',
          'You were invited to a group chat',
          v_clean,
          '/dashboard/messages?thread=' || v_thread_id::text,
          jsonb_build_object('thread_id', v_thread_id, 'invited_by', v_uid)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN v_thread_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_group_chat(text, uuid[]) TO authenticated;

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
        INSERT INTO public.user_notifications (user_id, type, title, body, url, metadata)
        VALUES (
          v_member,
          'chat_invite',
          'You were invited to a group chat',
          v_title,
          '/dashboard/messages?thread=' || p_thread_id::text,
          jsonb_build_object('thread_id', p_thread_id, 'invited_by', v_uid)
        );
      END IF;
    END IF;
  END LOOP;
  RETURN v_added;
END;
$$;
GRANT EXECUTE ON FUNCTION public.invite_to_thread(uuid, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_thread_invite(p_thread_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_accept THEN
    UPDATE public.chat_thread_members
      SET status = 'active', joined_at = now()
      WHERE thread_id = p_thread_id AND user_id = v_uid AND status = 'invited';
  ELSE
    UPDATE public.chat_thread_members
      SET status = 'left'
      WHERE thread_id = p_thread_id AND user_id = v_uid;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.respond_to_thread_invite(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_thread(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.chat_thread_members
    SET status = 'left'
    WHERE thread_id = p_thread_id AND user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.leave_thread(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_thread_read(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.chat_thread_members
    SET last_read_at = now()
    WHERE thread_id = p_thread_id AND user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_thread_read(uuid) TO authenticated;
