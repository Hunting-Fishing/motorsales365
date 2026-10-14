-- 365 standalone migration package | chunk_006.sql | 27 source migrations
-- Byte-for-byte concatenation of supabase/migrations. No SQL modified.

-- ===== BEGIN SOURCE MIGRATION: 20260711010354_064bbdf4-d81e-4437-98d9-b75c0c57afcb.sql =====

DROP FUNCTION IF EXISTS public.apply_report_action(uuid,text,text,boolean,boolean,boolean,uuid);

CREATE OR REPLACE FUNCTION public.apply_report_action(
  _report_id uuid,
  _action text,
  _note text DEFAULT NULL,
  _hide_listing boolean DEFAULT false,
  _delete_listing boolean DEFAULT false,
  _notify_poster boolean DEFAULT false,
  _reverses_action_id uuid DEFAULT NULL,
  _severity text DEFAULT 'standard'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _report public.reports%ROWTYPE;
  _listing public.listings%ROWTYPE;
  _delta int := 0;
  _accept_base int := -25;
  _listing_effect text := 'none';
  _new_status text;
  _new_resolution text;
  _action_id uuid;
  _reason_code text;
  _reason_label text;
BEGIN
  IF NOT (public.has_role(_actor,'admin') OR public.has_role(_actor,'moderator')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _report FROM public.reports WHERE id = _report_id FOR UPDATE;
  IF _report.id IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;

  IF _report.listing_id IS NOT NULL THEN
    SELECT * INTO _listing FROM public.listings WHERE id = _report.listing_id;
  END IF;

  IF _action = 'reverse' AND NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'Only admins can reverse decisions';
  END IF;

  _accept_base := CASE lower(COALESCE(_severity,'standard'))
    WHEN 'none' THEN 0
    WHEN 'minor' THEN -5
    WHEN 'moderate' THEN -15
    WHEN 'severe' THEN -50
    ELSE -25
  END;

  IF _action = 'accept' THEN
    _new_status := 'resolved'; _new_resolution := 'accepted';
    _delta := _accept_base;
    _reason_code := CASE WHEN _accept_base = 0 THEN 'report_accepted_no_penalty' ELSE 'report_accepted' END;
    _reason_label := CASE WHEN _accept_base = 0
      THEN 'Report accepted — no penalty (honest mistake)'
      ELSE 'Report accepted against you' END;
  ELSIF _action = 'dismiss' THEN
    _new_status := 'resolved'; _new_resolution := 'dismissed';
    _delta := 0; _reason_code := 'report_dismissed'; _reason_label := 'Report dismissed';
  ELSIF _action = 'reverse' THEN
    _new_status := 'open'; _new_resolution := NULL;
    IF _reverses_action_id IS NOT NULL THEN
      SELECT -score_delta INTO _delta FROM public.report_actions WHERE id = _reverses_action_id;
      _delta := COALESCE(_delta,0);
    END IF;
    _reason_code := 'decision_reversed'; _reason_label := 'Prior moderation decision reversed';
  ELSE
    _new_status := _report.status; _new_resolution := _report.resolution;
  END IF;

  IF _hide_listing AND _listing.id IS NOT NULL THEN
    UPDATE public.listings SET status = 'hidden' WHERE id = _listing.id;
    _listing_effect := 'hidden';
    _delta := _delta - 10;
  END IF;
  IF _delete_listing AND _listing.id IS NOT NULL THEN
    DELETE FROM public.listings WHERE id = _listing.id;
    _listing_effect := 'deleted';
    _delta := _delta - 30;
  END IF;
  IF _action = 'restore_listing' AND _listing.id IS NOT NULL THEN
    UPDATE public.listings SET status = 'active' WHERE id = _listing.id;
    _listing_effect := 'restored';
    _delta := _delta + 10;
  END IF;

  IF _action IN ('accept','dismiss','reverse') THEN
    UPDATE public.reports SET
      status = _new_status,
      resolution = _new_resolution,
      resolved_by = CASE WHEN _new_status='resolved' THEN _actor ELSE NULL END,
      resolved_at = CASE WHEN _new_status='resolved' THEN now() ELSE NULL END
    WHERE id = _report_id;
  END IF;

  INSERT INTO public.report_actions(
    report_id, actor_id, action, prev_status, new_status, prev_resolution, new_resolution,
    score_delta, listing_effect, notified_poster, note, reversed_by_action_id
  ) VALUES (
    _report_id, _actor, _action, _report.status, _new_status, _report.resolution, _new_resolution,
    _delta, _listing_effect, _notify_poster, _note, _reverses_action_id
  ) RETURNING id INTO _action_id;

  IF _action = 'reverse' AND _reverses_action_id IS NOT NULL THEN
    UPDATE public.report_actions SET reversed_by_action_id = _action_id WHERE id = _reverses_action_id;
  END IF;

  IF _listing.user_id IS NOT NULL AND _delta <> 0 THEN
    INSERT INTO public.trust_score_events(
      user_id, delta, reason_code, reason_label, source_type, source_id, actor_id
    ) VALUES (
      _listing.user_id, _delta, _reason_code, _reason_label, 'report', _report_id, _actor
    );
  END IF;

  RETURN _action_id;
END $$;

REVOKE ALL ON FUNCTION public.apply_report_action(uuid,text,text,boolean,boolean,boolean,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_report_action(uuid,text,text,boolean,boolean,boolean,uuid,text) TO authenticated;

-- ===== END SOURCE MIGRATION: 20260711010354_064bbdf4-d81e-4437-98d9-b75c0c57afcb.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260711011141_9f8294d9-bbfa-4fdb-a058-d364cdfed91f.sql =====

-- 1. Remove overbroad sales UPDATE on profiles and replace with a status-only RPC.
DROP POLICY IF EXISTS "Sales update account status" ON public.profiles;

CREATE OR REPLACE FUNCTION public.sales_update_account_status(
  _profile_id uuid,
  _new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'sales'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF NOT public.is_sales_assigned_user(auth.uid(), _profile_id) THEN
    RAISE EXCEPTION 'Not assigned to this customer';
  END IF;

  IF _new_status IS NULL OR length(_new_status) = 0 OR length(_new_status) > 64 THEN
    RAISE EXCEPTION 'Invalid account status';
  END IF;

  UPDATE public.profiles
     SET account_status = _new_status
   WHERE id = _profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sales_update_account_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sales_update_account_status(uuid, text) TO authenticated;

-- 2. Let DM recipients read attachments sent to them.
CREATE POLICY "Staff DM recipients can read attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff-dm-attachments'
  AND EXISTS (
    SELECT 1
      FROM public.staff_dms d
     WHERE d.attachment_path = storage.objects.name
       AND (d.sender_id = auth.uid() OR d.recipient_id = auth.uid())
  )
);

-- ===== END SOURCE MIGRATION: 20260711011141_9f8294d9-bbfa-4fdb-a058-d364cdfed91f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260711044610_4ba7cad7-f972-4860-893d-7bb76399edd4.sql =====
GRANT INSERT ON public.reports TO anon;
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
-- ===== END SOURCE MIGRATION: 20260711044610_4ba7cad7-f972-4860-893d-7bb76399edd4.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260711065141_5acf3fda-e424-43a9-ad55-be9982fe0117.sql =====

-- Checklists library
CREATE TABLE public.buyer_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  category_slug text,
  pdf_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.buyer_checklists TO anon, authenticated;
GRANT ALL ON public.buyer_checklists TO service_role;
ALTER TABLE public.buyer_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active checklists"
  ON public.buyer_checklists FOR SELECT
  USING (is_active = true);
CREATE POLICY "Admins manage checklists"
  ON public.buyer_checklists FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Items
CREATE TABLE public.buyer_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.buyer_checklists(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  label text NOT NULL,
  hint text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX buyer_checklist_items_checklist_idx ON public.buyer_checklist_items(checklist_id, position);
GRANT SELECT ON public.buyer_checklist_items TO anon, authenticated;
GRANT ALL ON public.buyer_checklist_items TO service_role;
ALTER TABLE public.buyer_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view items of active checklists"
  ON public.buyer_checklist_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.buyer_checklists c WHERE c.id = checklist_id AND c.is_active = true));
CREATE POLICY "Admins manage checklist items"
  ON public.buyer_checklist_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Per-user, per-listing progress
CREATE TABLE public.buyer_checklist_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.buyer_checklist_items(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_checklist_progress TO authenticated;
GRANT ALL ON public.buyer_checklist_progress TO service_role;
ALTER TABLE public.buyer_checklist_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own checklist progress"
  ON public.buyer_checklist_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own checklist progress"
  ON public.buyer_checklist_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own checklist progress"
  ON public.buyer_checklist_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER buyer_checklists_updated_at
  BEFORE UPDATE ON public.buyer_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: PH used-car checklist
WITH c AS (
  INSERT INTO public.buyer_checklists (slug, title, category_slug)
  VALUES ('ph-used-car', 'PH buyer document checklist — Used car', 'cars')
  RETURNING id
)
INSERT INTO public.buyer_checklist_items (checklist_id, position, label, hint)
SELECT c.id, v.position, v.label, v.hint FROM c, (VALUES
  (1, 'Original OR and CR are present', 'Ask for the latest LTO Official Receipt and Certificate of Registration.'),
  (2, 'Registered owner matches the seller''s valid ID', 'If not, ask for the open Deed of Sale chain and previous owner''s ID.'),
  (3, 'Deed of Sale is ready (notarised)', NULL),
  (4, 'Seller can show 2 valid government IDs', NULL),
  (5, 'Chassis number matches the CR and the unit', NULL),
  (6, 'Engine number matches the CR and the unit', NULL),
  (7, 'Plate / conduction sticker matches the CR', NULL),
  (8, 'No encumbrance / chattel mortgage on the CR', 'If marked ''Encumbered,'' ask for the bank''s release of mortgage.'),
  (9, 'Flood, accident, and rebuild history disclosed in writing', NULL),
  (10, 'HPG / PNP clearance done (recommended for high-value units)', 'Highway Patrol Group macro-etching confirms the unit is not stolen.')
) AS v(position, label, hint);

-- Seed: PH used-motorcycle checklist (stub, admin can extend)
WITH c AS (
  INSERT INTO public.buyer_checklists (slug, title, category_slug)
  VALUES ('ph-used-motorcycle', 'PH buyer document checklist — Motorcycle', 'motorcycles')
  RETURNING id
)
INSERT INTO public.buyer_checklist_items (checklist_id, position, label, hint)
SELECT c.id, v.position, v.label, v.hint FROM c, (VALUES
  (1, 'Original OR and CR are present', NULL),
  (2, 'Registered owner matches the seller''s valid ID', NULL),
  (3, 'Deed of Sale is ready (notarised)', NULL),
  (4, 'Chassis and engine numbers match the CR', NULL),
  (5, 'No encumbrance on the CR', NULL),
  (6, 'HPG clearance done (recommended)', NULL)
) AS v(position, label, hint);

-- ===== END SOURCE MIGRATION: 20260711065141_5acf3fda-e424-43a9-ad55-be9982fe0117.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260711065326_ef5ce8a6-5dd5-40f6-be75-52253b43e0d7.sql =====

CREATE POLICY "Anyone can read buyer guides"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'buyer-guides');

CREATE POLICY "Admins upload buyer guides"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'buyer-guides' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update buyer guides"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'buyer-guides' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete buyer guides"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'buyer-guides' AND public.has_role(auth.uid(), 'admin'));

-- ===== END SOURCE MIGRATION: 20260711065326_ef5ce8a6-5dd5-40f6-be75-52253b43e0d7.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260711070812_b5fc269f-649d-4705-b255-89d823663b24.sql =====
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

-- ===== END SOURCE MIGRATION: 20260711070812_b5fc269f-649d-4705-b255-89d823663b24.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260711072533_71165e8b-c1de-4475-94a1-9c91ae3c46e5.sql =====
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
-- ===== END SOURCE MIGRATION: 20260711072533_71165e8b-c1de-4475-94a1-9c91ae3c46e5.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260711073331_3314948d-c196-44ff-b656-7be383f5d16b.sql =====

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

-- ===== END SOURCE MIGRATION: 20260711073331_3314948d-c196-44ff-b656-7be383f5d16b.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260711073454_cea6ce68-1eda-4711-8431-5d3468395289.sql =====

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

-- ===== END SOURCE MIGRATION: 20260711073454_cea6ce68-1eda-4711-8431-5d3468395289.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260711074001_e72c5982-744f-4023-9045-99a02778d52b.sql =====
CREATE OR REPLACE FUNCTION public.mark_thread_unread(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prev timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT max(created_at) INTO v_prev
    FROM public.chat_thread_messages
    WHERE thread_id = p_thread_id
      AND sender_id <> auth.uid();
  UPDATE public.chat_thread_members
    SET last_read_at = CASE
      WHEN v_prev IS NULL THEN NULL
      ELSE v_prev - interval '1 millisecond'
    END
    WHERE thread_id = p_thread_id AND user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_thread_unread(uuid) TO authenticated;
-- ===== END SOURCE MIGRATION: 20260711074001_e72c5982-744f-4023-9045-99a02778d52b.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260712010743_2fbad4dc-269c-4aed-b5b5-c8a714d5828f.sql =====
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
  IF NEW.recipient_id IS NULL OR NEW.recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(business_name, full_name, 'Someone')
    INTO v_sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  SELECT title INTO v_listing_title
    FROM public.listings WHERE id = NEW.listing_id;

  v_title := COALESCE(v_sender_name, 'New message') || ' sent you a message';
  v_body  := CASE
    WHEN v_listing_title IS NOT NULL THEN 'Re: ' || v_listing_title || E'\n' || LEFT(COALESCE(NEW.body, ''), 140)
    ELSE LEFT(COALESCE(NEW.body, ''), 200)
  END;

  INSERT INTO public.user_notifications
    (user_id, category, title, body, link_url, entity_type, entity_id)
  VALUES
    (NEW.recipient_id, 'messages', v_title, v_body,
     '/dashboard/messages',
     'message', NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_message_recipient ON public.messages;
CREATE TRIGGER trg_notify_message_recipient
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_message_recipient();
-- ===== END SOURCE MIGRATION: 20260712010743_2fbad4dc-269c-4aed-b5b5-c8a714d5828f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260712012245_5a4e31fb-2e2d-4a6e-9504-fdf3fa8af497.sql =====

-- 1) listing_verifications: remove anon public access
DROP POLICY IF EXISTS "Public reads verification status for active listings" ON public.listing_verifications;
REVOKE SELECT ON public.listing_verifications FROM anon;

-- Safe minimal public view exposing only status (name avoids existing enum type)
CREATE OR REPLACE VIEW public.public_listing_verification_status AS
SELECT
  v.listing_id,
  v.status,
  v.created_at,
  v.updated_at
FROM public.listing_verifications v
JOIN public.listings l ON l.id = v.listing_id
WHERE l.status = 'active';

GRANT SELECT ON public.public_listing_verification_status TO anon, authenticated;

-- 2) qr_lead_captures: scope advertising role to own referral codes
DROP POLICY IF EXISTS "Advertising read all QR leads" ON public.qr_lead_captures;
CREATE POLICY "Advertising read own QR leads"
  ON public.qr_lead_captures FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'advertising'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.staff_referrals s
      WHERE s.referral_code = qr_lead_captures.referral_code
        AND s.staff_user_id = auth.uid()
    )
  );

-- 3) qr_scans: scope sales + advertising roles to own referral codes
DROP POLICY IF EXISTS "Sales read qr_scans" ON public.qr_scans;
CREATE POLICY "Sales read own qr_scans"
  ON public.qr_scans FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.staff_referrals s
      WHERE s.referral_code = qr_scans.referral_code
        AND s.staff_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Advertising read qr_scans" ON public.qr_scans;
CREATE POLICY "Advertising read own qr_scans"
  ON public.qr_scans FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'advertising'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.staff_referrals s
      WHERE s.referral_code = qr_scans.referral_code
        AND s.staff_user_id = auth.uid()
    )
  );

-- ===== END SOURCE MIGRATION: 20260712012245_5a4e31fb-2e2d-4a6e-9504-fdf3fa8af497.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260712022741_5d584347-8ea1-4cf5-97a4-c209993eeb90.sql =====
UPDATE public.businesses SET status = 'active', updated_at = now() WHERE id = '9edc71f5-940b-457d-916b-aaaf34e864de' AND status = 'archived';
-- ===== END SOURCE MIGRATION: 20260712022741_5d584347-8ea1-4cf5-97a4-c209993eeb90.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260712053445_e5ece42f-5c6d-4e45-a47e-05759dd82540.sql =====
CREATE OR REPLACE FUNCTION public.tg_notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body TEXT;
  v_preview TEXT;
  v_sender_name TEXT;
  v_listing_title TEXT;
BEGIN
  IF NEW.recipient_id IS NULL OR NEW.recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(business_name, full_name, 'Someone')
    INTO v_sender_name
    FROM public.profiles
   WHERE id = NEW.sender_id;

  SELECT title
    INTO v_listing_title
    FROM public.listings
   WHERE id = NEW.listing_id;

  v_preview := CASE
    WHEN COALESCE(NEW.body, '') <> '' THEN LEFT(NEW.body, 140)
    WHEN NEW.attachment_type = 'image' THEN '📷 Sent a photo'
    WHEN NEW.attachment_type = 'video' THEN '🎬 Sent a video'
    WHEN NEW.attachment_type = 'gif' THEN 'Sent a GIF'
    WHEN NEW.attachment_type IS NOT NULL THEN 'Sent an attachment'
    ELSE 'Sent a message'
  END;

  v_title := COALESCE(v_sender_name, 'New message') || ' sent you a message';
  v_body := CASE
    WHEN v_listing_title IS NOT NULL THEN 'Re: ' || v_listing_title || E'\n' || v_preview
    ELSE v_preview
  END;

  INSERT INTO public.user_notifications
    (user_id, category, title, body, link_url, entity_type, entity_id)
  VALUES
    (NEW.recipient_id, 'messages', v_title, v_body, '/dashboard/messages', 'message', NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_message_recipient ON public.messages;
CREATE TRIGGER trg_notify_message_recipient
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_message_recipient();
-- ===== END SOURCE MIGRATION: 20260712053445_e5ece42f-5c6d-4e45-a47e-05759dd82540.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260712053952_4bb09603-be11-47ed-aaaf-4114494cbd93.sql =====
CREATE OR REPLACE FUNCTION public.mark_message_notifications_read(p_message_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_notifications
     SET read_at = COALESCE(read_at, now())
   WHERE user_id = auth.uid()
     AND category = 'messages'
     AND entity_type = 'message'
     AND entity_id = ANY(p_message_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_message_notifications_read(uuid[]) TO authenticated;
-- ===== END SOURCE MIGRATION: 20260712053952_4bb09603-be11-47ed-aaaf-4114494cbd93.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260712054230_0cadcc14-52ad-4ffb-9294-fa2c1d058c2f.sql =====
CREATE OR REPLACE FUNCTION public.mark_message_notifications_unread(p_message_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_notifications
     SET read_at = NULL
   WHERE user_id = auth.uid()
     AND category = 'messages'
     AND entity_type = 'message'
     AND entity_id = ANY(p_message_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_message_notifications_unread(uuid[]) TO authenticated;
-- ===== END SOURCE MIGRATION: 20260712054230_0cadcc14-52ad-4ffb-9294-fa2c1d058c2f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260712062336_120321ae-5824-4df8-9d53-0e8b448e5160.sql =====

-- 1. messages: additive columns
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS starred_by uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_offer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS offer_currency text DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS offer_status text,
  ADD COLUMN IF NOT EXISTS system_kind text;

-- Full-text search index on message bodies
CREATE INDEX IF NOT EXISTS idx_messages_body_fts
  ON public.messages USING gin (to_tsvector('simple', coalesce(body, '')));

-- 2. message_thread_state
CREATE TABLE IF NOT EXISTS public.message_thread_state (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope        text NOT NULL CHECK (scope IN ('dm','group')),
  key          text NOT NULL,
  starred      boolean NOT NULL DEFAULT false,
  archived     boolean NOT NULL DEFAULT false,
  muted        boolean NOT NULL DEFAULT false,
  spam         boolean NOT NULL DEFAULT false,
  color_label  text,
  last_read_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scope, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_thread_state TO authenticated;
GRANT ALL ON public.message_thread_state TO service_role;

ALTER TABLE public.message_thread_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own thread state select" ON public.message_thread_state
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own thread state insert" ON public.message_thread_state
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own thread state update" ON public.message_thread_state
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own thread state delete" ON public.message_thread_state
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mts_user_flags
  ON public.message_thread_state (user_id, archived, spam, starred);

-- 3. quick_replies
CREATE TABLE IF NOT EXISTS public.quick_replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quick_replies TO authenticated;
GRANT ALL ON public.quick_replies TO service_role;

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own quick replies select" ON public.quick_replies
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own quick replies insert" ON public.quick_replies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own quick replies update" ON public.quick_replies
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own quick replies delete" ON public.quick_replies
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quick_replies_user ON public.quick_replies(user_id, sort_order);

CREATE OR REPLACE FUNCTION public.tg_quick_replies_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS quick_replies_touch ON public.quick_replies;
CREATE TRIGGER quick_replies_touch BEFORE UPDATE ON public.quick_replies
  FOR EACH ROW EXECUTE FUNCTION public.tg_quick_replies_touch();

-- 4. Sold / relisted auto system-message trigger
CREATE OR REPLACE FUNCTION public.tg_listing_status_system_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_body text;
  v_buyer uuid;
BEGIN
  IF NEW.status = 'sold' AND (OLD.status IS DISTINCT FROM 'sold') THEN
    v_kind := 'listing_sold';
    v_body := 'This listing was marked SOLD. Thanks!';
  ELSIF NEW.status = 'active' AND OLD.status = 'sold' THEN
    v_kind := 'listing_relisted';
    v_body := 'This listing has been relisted and is available again.';
  ELSE
    RETURN NEW;
  END IF;

  FOR v_buyer IN
    SELECT DISTINCT CASE WHEN sender_id = NEW.user_id THEN recipient_id ELSE sender_id END
    FROM public.messages
    WHERE listing_id = NEW.id
      AND (sender_id = NEW.user_id OR recipient_id = NEW.user_id)
  LOOP
    IF v_buyer IS NULL OR v_buyer = NEW.user_id THEN CONTINUE; END IF;

    INSERT INTO public.messages (sender_id, recipient_id, listing_id, body, system_kind)
    VALUES (NEW.user_id, v_buyer, NEW.id, v_body, v_kind);

    INSERT INTO public.user_notifications (user_id, category, title, body, link_url, entity_type, entity_id)
    VALUES (
      v_buyer,
      'messages',
      CASE WHEN v_kind = 'listing_sold' THEN 'Listing marked sold' ELSE 'Listing relisted' END,
      v_body,
      '/listing/' || NEW.id::text,
      'listing',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listing_status_system_message ON public.listings;
CREATE TRIGGER listing_status_system_message
  AFTER UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_listing_status_system_message();

-- ===== END SOURCE MIGRATION: 20260712062336_120321ae-5824-4df8-9d53-0e8b448e5160.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260713012516_8b3939aa-63d7-4e0d-8c85-0246b3bb8a21.sql =====
DROP POLICY IF EXISTS "Applicants and admins post messages" ON public.franchise_application_messages;

CREATE POLICY "Applicants and admins post messages"
  ON public.franchise_application_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        NOT is_internal
        AND EXISTS (
          SELECT 1 FROM public.franchise_applications a
          WHERE a.id = application_id
            AND (
              a.user_id = auth.uid()
              OR public.current_user_owns_email(a.contact_email)
            )
        )
      )
    )
  );
-- ===== END SOURCE MIGRATION: 20260713012516_8b3939aa-63d7-4e0d-8c85-0246b3bb8a21.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260713022238_540630d7-d0d4-436b-b5a0-58f9dc07811f.sql =====

-- =========================================================
-- Document Check: schema
-- =========================================================

CREATE TABLE public.doc_check_countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag_emoji TEXT NOT NULL,
  region TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  currency TEXT,
  drives_on TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doc_check_countries TO anon, authenticated;
GRANT ALL ON public.doc_check_countries TO service_role;
ALTER TABLE public.doc_check_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published countries" ON public.doc_check_countries
  FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage countries" ON public.doc_check_countries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doc_check_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.doc_check_countries(code) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('quick_guide','buying','selling','import','export','insurance','documents')),
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 100,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX doc_check_sections_country_kind_idx ON public.doc_check_sections(country_code, kind, sort_order);
GRANT SELECT ON public.doc_check_sections TO anon, authenticated;
GRANT ALL ON public.doc_check_sections TO service_role;
ALTER TABLE public.doc_check_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published sections" ON public.doc_check_sections
  FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage sections" ON public.doc_check_sections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doc_check_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.doc_check_countries(code) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description_md TEXT NOT NULL DEFAULT '',
  who_issues TEXT,
  typical_cost TEXT,
  validity TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, code)
);
GRANT SELECT ON public.doc_check_documents TO anon, authenticated;
GRANT ALL ON public.doc_check_documents TO service_role;
ALTER TABLE public.doc_check_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read documents" ON public.doc_check_documents
  FOR SELECT USING (true);
CREATE POLICY "admin manage documents" ON public.doc_check_documents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doc_check_agency_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.doc_check_countries(code) ON DELETE CASCADE,
  section_kind TEXT,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doc_check_agency_links TO anon, authenticated;
GRANT ALL ON public.doc_check_agency_links TO service_role;
ALTER TABLE public.doc_check_agency_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read agency links" ON public.doc_check_agency_links
  FOR SELECT USING (true);
CREATE POLICY "admin manage agency links" ON public.doc_check_agency_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doc_check_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  country_code TEXT,
  entity TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.doc_check_audit_log TO authenticated;
GRANT ALL ON public.doc_check_audit_log TO service_role;
ALTER TABLE public.doc_check_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit" ON public.doc_check_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert audit" ON public.doc_check_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_doc_check_countries_updated BEFORE UPDATE ON public.doc_check_countries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_doc_check_sections_updated BEFORE UPDATE ON public.doc_check_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_doc_check_documents_updated BEFORE UPDATE ON public.doc_check_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Seed: countries
-- =========================================================

INSERT INTO public.doc_check_countries (code, name, flag_emoji, region, slug, summary, currency, drives_on, sort_order, is_published) VALUES
  ('ph','Philippines','🇵🇭','Southeast Asia','ph','Vehicle transfer and registration is administered by the Land Transportation Office (LTO). Comprehensive third-party liability (CTPL) insurance is mandatory.','PHP','right', 1, true),
  ('sg','Singapore','🇸🇬','Southeast Asia','sg','Vehicles are administered by LTA. Ownership transfer, COE, and PARF rules apply.','SGD','left', 10, true),
  ('my','Malaysia','🇲🇾','Southeast Asia','my','JPJ manages registration and title transfer. Puspakom inspection is required for used-vehicle transfers.','MYR','left', 11, true),
  ('th','Thailand','🇹🇭','Southeast Asia','th','Department of Land Transport (DLT) handles vehicle transfer, CTPL (Por Ror Bor), and green book updates.','THB','left', 12, true),
  ('vn','Vietnam','🇻🇳','Southeast Asia','vn','Traffic Police handle registration transfer. Import restrictions on used vehicles are strict.','VND','right', 13, true),
  ('id','Indonesia','🇮🇩','Southeast Asia','id','SAMSAT / Korlantas Polri handle STNK/BPKB transfers and annual tax.','IDR','left', 14, true),
  ('us','United States','🇺🇸','North America','us','Vehicle title and registration are handled state-by-state via the DMV. Emissions and safety standards set by NHTSA/EPA.','USD','right', 20, true),
  ('ca','Canada','🇨🇦','North America','ca','Registration is provincial (ICBC, SAAQ, ServiceOntario, etc.). Transport Canada sets federal standards.','CAD','right', 21, true),
  ('uk','United Kingdom','🇬🇧','Europe','uk','DVLA manages V5C logbooks, MOT, and vehicle tax. Import from EU has post-Brexit VAT/duty rules.','GBP','left', 30, true),
  ('de','Germany','🇩🇪','Europe','de','Kfz-Zulassungsstelle handles registration. TÜV/DEKRA inspection required. EU-wide type approval applies.','EUR','right', 31, true),
  ('fr','France','🇫🇷','Europe','fr','ANTS online system for carte grise. Contrôle technique (CT) required every 2 years for used cars.','EUR','right', 32, true),
  ('nl','Netherlands','🇳🇱','Europe','nl','RDW manages kenteken registration. APK inspection mandatory. BPM tax on imports.','EUR','right', 33, true),
  ('es','Spain','🇪🇸','Europe','es','DGT handles transfer of ownership. ITV inspection required. Registration tax on imports.','EUR','right', 34, true),
  ('it','Italy','🇮🇹','Europe','it','Motorizzazione Civile and PRA manage title transfer. Revisione inspection every 2 years.','EUR','right', 35, true),
  ('jp','Japan','🇯🇵','East Asia','jp','Land Transport Bureau handles Shaken inspection and registration. Export deregistration for JDM exports.','JPY','left', 40, true),
  ('kr','South Korea','🇰🇷','East Asia','kr','KOROAD / MOLIT regulate vehicle transfer. Emissions and export certificates required for used exports.','KRW','right', 41, true),
  ('au','Australia','🇦🇺','Oceania','au','State-based rego (VicRoads, TfNSW, Qld TMR, etc.). Strict import rules under RAWS/SEVS.','AUD','left', 50, true),
  ('nz','New Zealand','🇳🇿','Oceania','nz','Waka Kotahi NZTA handles registration and WoF. Compliance inspection required on import.','NZD','left', 51, true);

-- =========================================================
-- Seed: Philippines full content
-- =========================================================

INSERT INTO public.doc_check_sections (country_code, kind, title, body_md, sort_order, is_published) VALUES
  ('ph','quick_guide','Quick Guide — Buying a used vehicle in the Philippines',
$MD$
This is the fast checklist buyers should complete before handing over any payment. Full details live in the sections below.

1. **Verify OR and CR match** — both documents must show the seller's name, and the plate, chassis (VIN), and engine numbers must match the vehicle in person.
2. **Confirm chassis and engine numbers** — check under the hood and on the frame. Numbers must be crisp, not restamped or ground.
3. **Ask for PNP-HPG Motor Vehicle Clearance** — required before transfer at LTO. Confirms the unit is not stolen or encumbered.
4. **Check for encumbrance** — the CR must be marked "No Encumbrance" (or the bank release must be attached if it was financed).
5. **Notarized Deed of Sale** — both parties sign in front of a notary public. Bring 2 valid government IDs each.
6. **Valid CTPL insurance** — Compulsory Third-Party Liability must be active. Buyer typically renews upon transfer.
7. **Recent Emission Test** — required to renew registration.
8. **Transfer at LTO within 30 days** — the buyer files the change of ownership at the LTO district office that has jurisdiction.
9. **Use traceable payment** — bank transfer, GCash, Maya, or manager's check. Avoid large cash.
10. **Meet in a safe, public place** — daylight, well-lit, ideally with a companion or mechanic.
$MD$, 1, true),

  ('ph','buying','Buying & transferring ownership',
$MD$
The Philippines transfers vehicle ownership through the Land Transportation Office (LTO). The buyer is responsible for filing the transfer within 30 days of the Deed of Sale.

**Required documents (buyer files these at LTO):**
- Original OR (Official Receipt) and CR (Certificate of Registration)
- Notarized Deed of Absolute Sale
- PNP-HPG Motor Vehicle Clearance (macro-etching + records check)
- Latest Emission Test Result
- CTPL insurance (Compulsory Third-Party Liability)
- Buyer and seller valid IDs (2 each)
- TIN of both parties
- Duty-paid stamp / release papers if imported

**Typical LTO transfer fees (2026):**
- Transfer fee: ₱150
- Change of ownership: ~₱50
- IT service fee, computer fee, and legal fees: ~₱169
- Total including PNP clearance and notarization: **₱1,500 – ₱3,500** depending on region

**Timeline:** 1–2 hours at LTO if papers are complete. Same-day plate release for renewals.
$MD$, 10, true),

  ('ph','selling','Selling & releasing liability',
$MD$
Once the buyer takes possession, the seller should protect themselves from future liability (traffic tickets, accidents, or unpaid registration) filed under the old owner's name.

**Seller checklist:**
- Prepare a **Notarized Deed of Sale** — keep a signed original for your records.
- Photocopy the buyer's IDs and take a photo of buyer + vehicle + plate together.
- Surrender **only photocopies** of OR/CR at signing; hand over originals only when payment clears.
- File a **"Sold" report** at your LTO district office (Report of Sale) so the vehicle is flagged as transferred if the buyer delays registration.
- Cancel your CTPL insurance or transfer it to the buyer.
- Save the transaction record for at least 3 years.
$MD$, 20, true),

  ('ph','import','Import laws',
$MD$
Philippine used-vehicle imports are heavily restricted. Only specific channels are permitted.

**Restrictions:**
- Executive Order 156 prohibits importation of used motor vehicles into the customs territory (with narrow exceptions).
- **Allowed:** returning residents (balikbayan) who owned the vehicle abroad for at least 12 months, diplomats, and vehicles imported through the Subic Bay Freeport Zone (SBFZ) or Cagayan Special Economic Zone.
- Left-hand-drive only. Right-hand-drive conversion is prohibited on public roads.
- Age caps vary by channel; SBFZ historically allowed vehicles up to ~5 years old.

**Duties & taxes (BOC):**
- Import duty: 30% (used) or 30% (new, ASEAN preferential rates may apply under ATIGA)
- VAT: 12%
- Excise tax: 4% – 50% based on net manufacturer's price
- Ad valorem tax on luxury vehicles

**Homologation:** DTI-BPS / DENR emissions compliance required for road use.
$MD$, 30, true),

  ('ph','export','Export laws',
$MD$
Vehicles registered in the Philippines can be exported after LTO deregistration.

**Steps:**
1. Settle any outstanding registration or Alarm Report at LTO.
2. Obtain a **PNP-HPG Motor Vehicle Clearance** confirming the unit is clear.
3. Apply for LTO **Certificate of Deregistration** for export.
4. File a **BOC Export Declaration** with commercial invoice and packing list.
5. Book with a licensed customs broker for RoRo or container shipment.
6. Buyer's country requirements (age caps, LHD/RHD, homologation) must be met before shipment.

**ATA Carnet** — for temporary export (rallies, shows, motorsport), the Philippine Chamber of Commerce and Industry (PCCI) issues carnets.
$MD$, 40, true),

  ('ph','insurance','Insurance',
$MD$
**Mandatory: CTPL** (Compulsory Third-Party Liability) — covers bodily injury or death to third parties, up to ₱100,000 per victim. Required for every vehicle registration renewal. Typical cost: ₱600–₱1,200 per year for private cars.

**Optional: Comprehensive** — covers own damage, theft, acts of nature, third-party property damage, and personal accident. Typical cost: 1.5%–3% of the vehicle's fair market value per year.

**Common local providers:** Malayan, Standard Insurance, Prudential Guarantee, FPG, Charter Ping An, MAPFRE Insular, Stronghold, PGA Sompo.

**Insurance Commission (IC)** regulates all motor insurance in the Philippines. Complaints can be filed at insurance.gov.ph.
$MD$, 50, true),

  ('ph','documents','Document reference',
$MD$
Below is a quick summary of the documents Filipino buyers and sellers encounter. Full descriptions are in the Document Reference table on this page.
$MD$, 60, true);

-- PH documents
INSERT INTO public.doc_check_documents (country_code, code, name, description_md, who_issues, typical_cost, validity, sort_order) VALUES
  ('ph','or','Official Receipt (OR)','Proof that the current year''s registration fees, CTPL, and emissions were paid. Renewed annually.','LTO','₱2,500 – ₱8,000 per year','1 year',10),
  ('ph','cr','Certificate of Registration (CR)','The vehicle''s title equivalent — shows the registered owner, plate, chassis, and engine numbers, and encumbrance status.','LTO','Included with registration','Lifetime (updated on transfer)',20),
  ('ph','deed_of_sale','Notarized Deed of Absolute Sale','Legal document transferring ownership from seller to buyer. Must be signed in front of a notary public with 2 valid IDs each.','Notary Public','₱200 – ₱500 notarial fee','N/A',30),
  ('ph','pnp_hpg','PNP-HPG Motor Vehicle Clearance','Confirms the unit is not stolen, carnapped, or wanted. Includes macro-etching of chassis and engine numbers.','PNP Highway Patrol Group','₱300 – ₱600','2 months',40),
  ('ph','emission','Emission Test Certificate','Confirms the vehicle meets Philippine Clean Air Act emission standards.','LTO-accredited PETCs','₱450 – ₱600','60 days',50),
  ('ph','ctpl','CTPL Insurance Certificate','Compulsory Third-Party Liability. Mandatory for every registration.','Insurance provider (IC-regulated)','₱600 – ₱1,200','1 year',60),
  ('ph','valid_id','Two valid government IDs','Any two of: PhilID, Passport, Driver''s License, UMID, PRC, Postal ID. Required by both notary and LTO.','Government agencies','Free – ₱500','Varies',70),
  ('ph','tin','TIN (Tax Identification Number)','Required on the Deed of Sale and LTO transfer form.','BIR','Free','Lifetime',80);

-- PH agency links
INSERT INTO public.doc_check_agency_links (country_code, section_kind, label, url, sort_order) VALUES
  ('ph', NULL, 'Land Transportation Office (LTO)', 'https://lto.gov.ph', 10),
  ('ph', NULL, 'Bureau of Customs (BOC)', 'https://customs.gov.ph', 20),
  ('ph', NULL, 'Insurance Commission', 'https://insurance.gov.ph', 30),
  ('ph', NULL, 'DTI Fair Trade Enforcement Bureau', 'https://dti.gov.ph/fair-trade/', 40),
  ('ph', NULL, 'PNP Highway Patrol Group', 'https://hpg.pnp.gov.ph', 50),
  ('ph', 'import', 'BOC Import Assessment', 'https://customs.gov.ph/import-assessment/', 60),
  ('ph', 'export', 'BOC Export Guidelines', 'https://customs.gov.ph/export/', 70);

-- Stub sections for each other country: a Quick Guide placeholder and empty other sections
INSERT INTO public.doc_check_sections (country_code, kind, title, body_md, sort_order, is_published)
SELECT c.code, 'quick_guide', 'Quick Guide — ' || c.name,
       'Content for ' || c.name || ' is being compiled. If you have local expertise in vehicle transfer, insurance, or import/export laws for ' || c.name || ', please contact us and we will credit your contribution.',
       1, true
FROM public.doc_check_countries c
WHERE c.code <> 'ph';

-- ===== END SOURCE MIGRATION: 20260713022238_540630d7-d0d4-436b-b5a0-58f9dc07811f.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260713044701_64bcbe3c-76cf-4ed0-ba80-4e9c57766705.sql =====
-- Shop Manager isolated schema import (chunk 01/10: schema + enums + sequences)
CREATE SCHEMA IF NOT EXISTS shop_manager;
GRANT USAGE ON SCHEMA shop_manager TO authenticated, service_role, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA shop_manager GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA shop_manager GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA shop_manager GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA shop_manager GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

CREATE TYPE shop_manager.app_role AS ENUM ('owner', 'admin', 'manager', 'parts_manager', 'service_advisor', 'technician', 'reception', 'other_staff', 'customer', 'marketing', 'deckhand', 'boson', 'mate', 'captain', 'chief_engineer', 'marine_engineer', 'fishing_master', 'crane_operator', 'rigger', 'diver', 'dispatch', 'truck_driver', 'office_admin', 'operations_manager', 'yard', 'yard_manager', 'welder', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'developer');
CREATE TYPE shop_manager.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE shop_manager.equipment_status AS ENUM ('operational', 'maintenance', 'down', 'retired');
CREATE TYPE shop_manager.equipment_type AS ENUM ('marine', 'forklift', 'semi', 'small_engine', 'other', 'fleet_vehicle', 'courtesy_car', 'rental_vehicle', 'service_vehicle', 'heavy_truck', 'excavator', 'loader', 'dozer', 'crane', 'vessel', 'outboard', 'diagnostic', 'lifting', 'air_tools', 'hand_tools', 'electrical', 'generator', 'fire_extinguisher', 'life_raft', 'life_ring', 'epirb', 'survival_suit', 'flare', 'first_aid_kit', 'safety_harness', 'life_jacket', 'immersion_suit', 'fuel_truck');
CREATE TYPE shop_manager.forklift_item_status AS ENUM ('good', 'attention', 'bad', 'na');
CREATE TYPE shop_manager.form_field_type AS ENUM ('text', 'textarea', 'number', 'select', 'checkbox', 'radio', 'date', 'email', 'phone', 'file', 'signature');
CREATE TYPE shop_manager.gunsmith_role_type AS ENUM ('shop_owner', 'master_gunsmith', 'gunsmith', 'apprentice', 'counter_staff', 'parts_manager', 'manager', 'sales', 'reception', 'shipping');
CREATE TYPE shop_manager.job_line_status AS ENUM ('pending', 'signed-onto-task', 'in-progress', 'waiting-for-parts', 'paused', 'awaiting-approval', 'quality-check', 'completed', 'on-hold', 'ready-for-delivery', 'needs-road-test', 'tech-support', 'warranty', 'sublet', 'customer-auth-required', 'parts-ordered', 'parts-arrived', 'rework-required');
CREATE TYPE shop_manager.maintenance_request_status AS ENUM ('pending', 'approved', 'in_progress', 'completed', 'rejected');
CREATE TYPE shop_manager.permission_type AS ENUM ('create', 'read', 'update', 'delete');
CREATE TYPE shop_manager.product_type AS ENUM ('affiliate', 'suggested');
CREATE TYPE shop_manager.report_type AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE shop_manager.resource_type AS ENUM ('users', 'roles', 'settings', 'billing', 'work_orders', 'inventory', 'appointments', 'reports', 'customers');
CREATE TYPE shop_manager.role_action_type AS ENUM ('added', 'removed', 'modified');
CREATE TYPE shop_manager.tool_condition AS ENUM ('new', 'excellent', 'good', 'fair', 'poor', 'unusable');
CREATE TYPE shop_manager.tool_status AS ENUM ('available', 'in_use', 'maintenance', 'broken', 'lost', 'retired');
CREATE TYPE shop_manager.welding_ap_status AS ENUM ('pending', 'partial', 'paid');
CREATE TYPE shop_manager.welding_customer_interaction_type AS ENUM ('email', 'phone_call', 'site_visit', 'quote_request', 'deposit', 'payment', 'follow_up', 'conversation', 'other');
CREATE TYPE shop_manager.welding_invoice_status AS ENUM ('draft', 'sent', 'unpaid', 'partial', 'paid', 'overdue');
CREATE TYPE shop_manager.welding_po_status AS ENUM ('draft', 'ordered', 'shipped', 'received', 'cancelled');
CREATE TYPE shop_manager.welding_quote_status AS ENUM ('new', 'reviewed', 'quoted', 'accepted', 'declined', 'draft', 'sent', 'approved', 'rejected');
CREATE TYPE shop_manager.welding_schedule_entry_type AS ENUM ('day_off', 'vacation', 'install_day', 'on_site', 'shop_day', 'booking', 'measurement');

CREATE SEQUENCE IF NOT EXISTS shop_manager.feature_request_number_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1 NO CYCLE;
-- ===== END SOURCE MIGRATION: 20260713044701_64bcbe3c-76cf-4ed0-ba80-4e9c57766705.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260713062739_e0144043-a7a4-43b7-8fc6-050ea0304634.sql =====
CREATE TABLE shop_manager.appointments (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  customer_id uuid,
  vehicle_id uuid,
  advisor_id uuid,
  date timestamp with time zone NOT NULL,
  duration integer NOT NULL,
  status text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT appointments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.ar_invoice_lines (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  invoice_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric(10,2) DEFAULT 1 NOT NULL,
  unit_price numeric(12,2) DEFAULT 0 NOT NULL,
  total_price numeric(12,2) DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ar_invoice_lines_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.ar_invoices (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  customer_id uuid,
  invoice_number text NOT NULL,
  status text NOT NULL,
  issue_date date NOT NULL,
  due_date date,
  subtotal numeric(12,2) DEFAULT 0 NOT NULL,
  tax numeric(12,2) DEFAULT 0 NOT NULL,
  total numeric(12,2) DEFAULT 0 NOT NULL,
  balance_due numeric(12,2) DEFAULT 0 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  tax_rate numeric(5,2) DEFAULT 0 NOT NULL,
  CONSTRAINT ar_invoices_status_check CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'partial'::text, 'paid'::text, 'overdue'::text, 'void'::text])),
  CONSTRAINT ar_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT ar_invoices_shop_id_invoice_number_key UNIQUE (shop_id, invoice_number)
);

CREATE TABLE shop_manager.ar_payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  invoice_id uuid,
  payment_date date NOT NULL,
  amount numeric(12,2) DEFAULT 0 NOT NULL,
  payment_method text,
  reference text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ar_payments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.company_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  settings_key text NOT NULL,
  settings_value jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_settings_pkey PRIMARY KEY (id),
  CONSTRAINT company_settings_shop_id_settings_key_key UNIQUE (shop_id, settings_key)
);

CREATE TABLE shop_manager.customer_activities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  action text NOT NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  timestamp timestamp with time zone DEFAULT now() NOT NULL,
  flagged boolean DEFAULT false,
  flag_reason text,
  CONSTRAINT customer_activities_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_addresses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  address_type text NOT NULL,
  is_default boolean DEFAULT false NOT NULL,
  full_name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text DEFAULT 'US'::text NOT NULL,
  phone text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_addresses_address_type_check CHECK (address_type = ANY (ARRAY['shipping'::text, 'billing'::text, 'both'::text])),
  CONSTRAINT customer_addresses_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_automation_preferences (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  service_reminders boolean DEFAULT true,
  marketing_emails boolean DEFAULT true,
  preferred_contact_time text DEFAULT 'business_hours'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customer_automation_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT customer_automation_preferences_customer_id_key UNIQUE (customer_id)
);

CREATE TABLE shop_manager.customer_communications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  date timestamp with time zone DEFAULT now() NOT NULL,
  type text NOT NULL,
  direction text NOT NULL,
  subject text,
  content text NOT NULL,
  staff_member_id text NOT NULL,
  staff_member_name text NOT NULL,
  status text NOT NULL,
  template_id uuid,
  template_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_communications_direction_check CHECK (direction = ANY (ARRAY['incoming'::text, 'outgoing'::text])),
  CONSTRAINT customer_communications_status_check CHECK (status = ANY (ARRAY['completed'::text, 'pending'::text, 'failed'::text])),
  CONSTRAINT customer_communications_type_check CHECK (type = ANY (ARRAY['email'::text, 'phone'::text, 'text'::text, 'in-person'::text])),
  CONSTRAINT customer_communications_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  original_name text NOT NULL,
  title text NOT NULL,
  description text,
  version integer DEFAULT 1 NOT NULL,
  version_notes text,
  tags text[] DEFAULT '{}'::text[],
  category uuid,
  is_shared boolean DEFAULT false NOT NULL,
  uploaded_by text NOT NULL,
  uploaded_by_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_documents_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_form_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  form_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_form_comments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_interactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  customer_name text NOT NULL,
  date timestamp with time zone DEFAULT now() NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  staff_member_id text NOT NULL,
  staff_member_name text NOT NULL,
  status text NOT NULL,
  notes text,
  related_work_order_id uuid,
  follow_up_date timestamp with time zone,
  follow_up_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_interactions_status_check CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  CONSTRAINT customer_interactions_type_check CHECK (type = ANY (ARRAY['work_order'::text, 'communication'::text, 'parts'::text, 'service'::text, 'follow_up'::text])),
  CONSTRAINT customer_interactions_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_loyalty (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid,
  current_points integer DEFAULT 0,
  lifetime_points integer DEFAULT 0,
  lifetime_value numeric DEFAULT 0.0,
  tier character varying(50) DEFAULT 'Standard'::character varying,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_loyalty_pkey PRIMARY KEY (id),
  CONSTRAINT customer_loyalty_customer_id_key UNIQUE (customer_id)
);

CREATE TABLE shop_manager.customer_notes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general'::text NOT NULL,
  created_by text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_notes_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_payment_methods (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  payment_type text NOT NULL,
  provider text NOT NULL,
  last_four text,
  expiry_month integer,
  expiry_year integer,
  is_default boolean DEFAULT false,
  stripe_payment_method_id text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_payment_methods_payment_type_check CHECK (payment_type = ANY (ARRAY['card'::text, 'paypal'::text, 'bank'::text])),
  CONSTRAINT customer_payment_methods_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  first_name text,
  last_name text,
  phone text,
  date_of_birth date,
  preferences jsonb DEFAULT '{}'::jsonb,
  marketing_consent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_property_areas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  area_type text NOT NULL,
  label text,
  square_footage integer NOT NULL,
  length_ft numeric(10,2),
  width_ft numeric(10,2),
  height_ft numeric(10,2),
  notes text,
  last_serviced_at timestamp with time zone,
  service_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_property_areas_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_provided_forms (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  customer_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  upload_date timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  tags text[] DEFAULT '{}'::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT customer_provided_forms_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_referrals (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_date timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  converted_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_referrals_pkey PRIMARY KEY (id),
  CONSTRAINT customer_referrals_referrer_id_referred_id_key UNIQUE (referrer_id, referred_id)
);

CREATE TABLE shop_manager.customer_segment_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid,
  segment_id uuid,
  is_automatic boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_segment_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT customer_segment_assignments_customer_id_segment_id_key UNIQUE (customer_id, segment_id)
);

CREATE TABLE shop_manager.customer_segments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  color text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_segments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_shop_relationships (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  joined_at timestamp with time zone DEFAULT now() NOT NULL,
  booking_enabled boolean DEFAULT true NOT NULL,
  CONSTRAINT customer_shop_relationships_pkey PRIMARY KEY (id),
  CONSTRAINT customer_shop_relationships_customer_id_shop_id_key UNIQUE (customer_id, shop_id)
);

CREATE TABLE shop_manager.customer_touchpoints (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  touchpoint_type text NOT NULL,
  channel text NOT NULL,
  campaign_id uuid,
  action text NOT NULL,
  metadata jsonb,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_touchpoints_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_uploaded_forms (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid,
  customer_id uuid,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  tags text[] DEFAULT '{}'::text[],
  category_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_uploaded_forms_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'digitized'::text])),
  CONSTRAINT customer_uploaded_forms_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  household_id uuid,
  segments jsonb,
  referral_person_id uuid,
  city text,
  state text,
  postal_code text,
  country text,
  company text,
  notes text,
  tags jsonb,
  preferred_technician_id text,
  communication_preference text,
  referral_source text,
  other_referral_details text,
  is_fleet boolean DEFAULT false,
  fleet_company text,
  auto_billing boolean DEFAULT false,
  credit_terms text,
  terms_agreed boolean DEFAULT false,
  business_type text,
  business_industry text,
  other_business_industry text,
  tax_id text,
  business_email text,
  business_phone text,
  fleet_manager text,
  fleet_contact text,
  preferred_payment_method text,
  preferred_service_type text,
  auth_user_id uuid,
  labor_tax_exempt boolean DEFAULT false,
  parts_tax_exempt boolean DEFAULT false,
  tax_exempt_certificate_number text,
  tax_exempt_notes text,
  user_id uuid,
  latitude double precision,
  longitude double precision,
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.discount_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  discount_id uuid NOT NULL,
  discount_table text NOT NULL,
  action_type text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by text NOT NULL,
  performed_at timestamp with time zone DEFAULT now() NOT NULL,
  reason text,
  CONSTRAINT discount_audit_log_action_type_check CHECK (action_type = ANY (ARRAY['created'::text, 'modified'::text, 'deleted'::text, 'approved'::text, 'rejected'::text])),
  CONSTRAINT discount_audit_log_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.discount_code_usage (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  discount_code_id uuid,
  order_id uuid,
  user_id uuid,
  discount_amount numeric(10,2) NOT NULL,
  used_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT discount_code_usage_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.discount_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL,
  discount_value numeric(10,2) NOT NULL,
  minimum_order_amount numeric(10,2) DEFAULT 0,
  maximum_discount_amount numeric(10,2),
  usage_limit integer,
  usage_count integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now() NOT NULL,
  valid_until timestamp with time zone,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT discount_codes_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text, 'free_shipping'::text])),
  CONSTRAINT discount_codes_pkey PRIMARY KEY (id),
  CONSTRAINT discount_codes_code_key UNIQUE (code)
);

CREATE TABLE shop_manager.discount_types (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL,
  default_value numeric DEFAULT 0 NOT NULL,
  applies_to text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  requires_approval boolean DEFAULT false NOT NULL,
  max_discount_amount numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text NOT NULL,
  CONSTRAINT discount_types_applies_to_check CHECK (applies_to = ANY (ARRAY['labor'::text, 'parts'::text, 'work_order'::text, 'any'::text])),
  CONSTRAINT discount_types_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  CONSTRAINT discount_types_pkey PRIMARY KEY (id),
  CONSTRAINT discount_types_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.employee_accommodations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid,
  employee_id uuid,
  accommodation_type text NOT NULL,
  description text NOT NULL,
  start_date date,
  end_date date,
  is_permanent boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamp with time zone,
  status text DEFAULT 'active'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employee_accommodations_accommodation_type_check CHECK (accommodation_type = ANY (ARRAY['medical'::text, 'religious'::text, 'personal'::text, 'disability'::text, 'other'::text])),
  CONSTRAINT employee_accommodations_status_check CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'expired'::text])),
  CONSTRAINT employee_accommodations_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.employee_availability (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  day_of_week integer NOT NULL,
  available_start time without time zone NOT NULL,
  available_end time without time zone NOT NULL,
  is_available boolean DEFAULT true,
  recurring boolean DEFAULT true,
  effective_from date DEFAULT CURRENT_DATE NOT NULL,
  effective_until date,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT employee_availability_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT valid_time_range CHECK (available_end > available_start),
  CONSTRAINT employee_availability_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.employee_leave_balances (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  leave_type_id uuid NOT NULL,
  balance_hours numeric(10,2) DEFAULT 0,
  used_hours numeric(10,2) DEFAULT 0,
  pending_hours numeric(10,2) DEFAULT 0,
  accrued_ytd numeric(10,2) DEFAULT 0,
  carry_over_hours numeric(10,2) DEFAULT 0,
  year integer DEFAULT EXTRACT(year FROM CURRENT_DATE) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT employee_leave_balances_pkey PRIMARY KEY (id),
  CONSTRAINT employee_leave_balances_employee_id_leave_type_id_year_key UNIQUE (employee_id, leave_type_id, year)
);

CREATE TABLE shop_manager.household_members (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  household_id uuid,
  customer_id uuid,
  relationship_type text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT household_members_pkey PRIMARY KEY (id),
  CONSTRAINT household_members_household_id_customer_id_key UNIQUE (household_id, customer_id)
);

CREATE TABLE shop_manager.households (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  address text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT households_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  sku text NOT NULL,
  description text,
  part_number text,
  barcode text,
  category text,
  subcategory text,
  manufacturer text,
  vehicle_compatibility text,
  location text,
  status text DEFAULT 'active'::text,
  supplier text,
  quantity integer DEFAULT 0,
  measurement_unit text,
  on_hold integer DEFAULT 0,
  on_order integer DEFAULT 0,
  reorder_point integer DEFAULT 0,
  min_stock_level integer DEFAULT 0,
  max_stock_level integer DEFAULT 0,
  unit_price numeric DEFAULT 0,
  sell_price_per_unit numeric DEFAULT 0,
  cost_per_unit numeric DEFAULT 0,
  margin_markup numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_exempt boolean DEFAULT false,
  environmental_fee numeric DEFAULT 0,
  core_charge numeric DEFAULT 0,
  hazmat_fee numeric DEFAULT 0,
  weight numeric DEFAULT 0,
  dimensions text,
  color text,
  material text,
  model_year text,
  oem_part_number text,
  universal_part boolean DEFAULT false,
  warranty_period text,
  date_bought text,
  date_last text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_sku_key UNIQUE (sku)
);

CREATE TABLE shop_manager.inventory_adjustments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid,
  inventory_item_id uuid,
  quantity integer NOT NULL,
  adjustment_type text NOT NULL,
  adjusted_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_adjustments_adjustment_type_check CHECK (adjustment_type = ANY (ARRAY['reserve'::text, 'consume'::text, 'return'::text])),
  CONSTRAINT inventory_adjustments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_alerts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid,
  variant_id uuid,
  alert_type text NOT NULL,
  threshold_value integer NOT NULL,
  current_value integer NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  message text,
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  resolved_at timestamp with time zone,
  notification_sent boolean DEFAULT false,
  CONSTRAINT inventory_alerts_check CHECK (product_id IS NOT NULL AND variant_id IS NULL OR product_id IS NULL AND variant_id IS NOT NULL),
  CONSTRAINT inventory_alerts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_auto_reorder (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  item_id uuid,
  enabled boolean DEFAULT false NOT NULL,
  threshold integer DEFAULT 5 NOT NULL,
  quantity integer DEFAULT 10 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_auto_reorder_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  CONSTRAINT inventory_categories_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_categories_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.inventory_consumption_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  quantity_consumed numeric(10,2) NOT NULL,
  usage_metric text NOT NULL,
  usage_value numeric(10,2) NOT NULL,
  service_package_id uuid,
  work_order_id uuid,
  consumed_at timestamp with time zone DEFAULT now() NOT NULL,
  notes text,
  CONSTRAINT inventory_consumption_history_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_consumption_rates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  usage_metric text NOT NULL,
  consumption_per_unit numeric(10,4) NOT NULL,
  average_consumption numeric(10,4),
  variance_percentage numeric(5,2),
  last_calculated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_consumption_rates_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_forecasts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  forecast_type text NOT NULL,
  predicted_runout_date date,
  predicted_runout_usage numeric(10,2),
  current_stock numeric(10,2) NOT NULL,
  average_consumption_rate numeric(10,4) NOT NULL,
  confidence_level numeric(5,2),
  recommended_reorder_date date,
  recommended_reorder_quantity numeric(10,2),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_forecasts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  sku text NOT NULL,
  category text NOT NULL,
  supplier text NOT NULL,
  quantity integer DEFAULT 0 NOT NULL,
  reorder_point integer DEFAULT 10 NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  location text,
  status text DEFAULT 'In Stock'::text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  shop_id uuid,
  quantity_in_stock integer,
  part_number text,
  barcode text,
  subcategory text,
  manufacturer text,
  vehicle_compatibility text,
  on_hold integer DEFAULT 0,
  on_order integer DEFAULT 0,
  margin_markup numeric(10,2) DEFAULT 0,
  sell_price_per_unit numeric(10,2) DEFAULT 0,
  cost_per_unit numeric(10,2) DEFAULT 0,
  weight numeric(10,2) DEFAULT 0,
  dimensions text,
  warranty_period text,
  date_bought date,
  date_last date,
  notes text,
  web_links jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT inventory_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_locations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  type text,
  parent_id uuid,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_locations_type_check CHECK (type = ANY (ARRAY['warehouse'::text, 'section'::text, 'shelf'::text, 'bin'::text])),
  CONSTRAINT inventory_locations_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  item_id uuid,
  order_date timestamp with time zone DEFAULT now() NOT NULL,
  expected_arrival date NOT NULL,
  quantity_ordered integer NOT NULL,
  quantity_received integer DEFAULT 0 NOT NULL,
  supplier text NOT NULL,
  status text DEFAULT 'ordered'::text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_purchase_order_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  purchase_order_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  quantity integer NOT NULL,
  quantity_received integer DEFAULT 0,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_purchase_order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT inventory_purchase_order_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_purchase_orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  vendor_id uuid,
  status text DEFAULT 'draft'::text NOT NULL,
  order_date timestamp with time zone DEFAULT now() NOT NULL,
  expected_delivery_date timestamp with time zone,
  received_date timestamp with time zone,
  total_amount numeric,
  created_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  received_by uuid,
  po_number text DEFAULT ('PO-'::text || nextval('shop_manager.feature_request_number_seq'::regclass)),
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_purchase_orders_status_check CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'partially_received'::text, 'received'::text, 'cancelled'::text])),
  CONSTRAINT inventory_purchase_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_seasonal_factors (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid,
  category text,
  month integer NOT NULL,
  adjustment_factor numeric(5,2) DEFAULT 1.0 NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_seasonal_factors_month_check CHECK (month >= 1 AND month <= 12),
  CONSTRAINT inventory_seasonal_factors_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  low_stock_threshold integer DEFAULT 5,
  auto_reorder_enabled boolean DEFAULT false,
  default_supplier_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_settings_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_settings_shop_id_key UNIQUE (shop_id)
);

CREATE TABLE shop_manager.inventory_suppliers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  website text,
  payment_terms text,
  lead_time_days integer,
  is_active boolean DEFAULT true NOT NULL,
  notes text,
  type text,
  region text,
  CONSTRAINT inventory_suppliers_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_suppliers_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.inventory_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  transaction_type text NOT NULL,
  quantity integer NOT NULL,
  transaction_date timestamp with time zone DEFAULT now() NOT NULL,
  reference_type text,
  reference_id uuid,
  performed_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_transactions_transaction_type_check CHECK (transaction_type = ANY (ARRAY['purchase'::text, 'sale'::text, 'adjustment'::text, 'transfer'::text, 'return'::text, 'write-off'::text])),
  CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_vendors (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  website text,
  payment_terms text,
  lead_time_days integer,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_vendors_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoice_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  invoice_id text NOT NULL,
  name text NOT NULL,
  description text,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  total numeric NOT NULL,
  hours boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoice_staff (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  invoice_id text NOT NULL,
  staff_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_staff_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoice_template_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  template_id uuid,
  name text NOT NULL,
  description text,
  quantity numeric DEFAULT 1,
  price numeric NOT NULL,
  total numeric,
  hours boolean DEFAULT false,
  sku text,
  category text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_template_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoice_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  default_tax_rate numeric DEFAULT 0.08,
  default_due_date_days integer DEFAULT 30,
  default_notes text,
  created_at timestamp with time zone DEFAULT now(),
  last_used timestamp with time zone,
  usage_count integer DEFAULT 0,
  CONSTRAINT invoice_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoices (
  id text NOT NULL,
  customer text NOT NULL,
  customer_address text,
  customer_email text,
  description text,
  notes text,
  date text NOT NULL,
  due_date text NOT NULL,
  status text NOT NULL,
  work_order_id text,
  created_by text,
  subtotal numeric,
  tax numeric,
  total numeric,
  payment_method text,
  created_at timestamp with time zone DEFAULT now(),
  last_updated_by text,
  last_updated_at timestamp with time zone,
  customer_id uuid,
  CONSTRAINT invoices_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.job_line_discounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  job_line_id uuid NOT NULL,
  discount_type_id uuid,
  discount_name text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  discount_amount numeric NOT NULL,
  reason text,
  approved_by text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text NOT NULL,
  CONSTRAINT job_line_discounts_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  CONSTRAINT job_line_discounts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.labor_rates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  standard_rate numeric DEFAULT 125.00 NOT NULL,
  diagnostic_rate numeric DEFAULT 145.00 NOT NULL,
  emergency_rate numeric DEFAULT 175.00 NOT NULL,
  warranty_rate numeric DEFAULT 95.00 NOT NULL,
  internal_rate numeric DEFAULT 85.00 NOT NULL,
  diy_rate numeric DEFAULT 65.00 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT labor_rates_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.part_discounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  part_id uuid NOT NULL,
  discount_type_id uuid,
  discount_name text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  discount_amount numeric NOT NULL,
  reason text,
  approved_by text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text NOT NULL,
  CONSTRAINT part_discounts_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  CONSTRAINT part_discounts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.part_warranties (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  inventory_item_id uuid,
  work_order_id uuid,
  equipment_id uuid,
  vehicle_id uuid,
  part_name character varying(200) NOT NULL,
  part_number character varying(100),
  serial_number character varying(100),
  manufacturer character varying(200),
  installed_date date NOT NULL,
  warranty_months integer,
  warranty_miles integer,
  warranty_hours integer,
  expiry_date date NOT NULL,
  purchase_price numeric(10,2),
  warranty_value numeric(10,2),
  coverage_description text,
  document_url text,
  notes text,
  status character varying(20) DEFAULT 'active'::character varying,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  CONSTRAINT part_warranties_status_check CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'expired'::character varying::text, 'claimed'::character varying::text, 'voided'::character varying::text])),
  CONSTRAINT part_warranties_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.parts_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT parts_categories_pkey PRIMARY KEY (id),
  CONSTRAINT parts_categories_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.parts_inventory (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  part_number text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  quantity integer DEFAULT 0 NOT NULL,
  min_quantity integer DEFAULT 0,
  cost_price numeric,
  retail_price numeric,
  location text,
  security_invoker boolean DEFAULT true,
  security_barrier boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT parts_inventory_pkey PRIMARY KEY (id)
);
-- ===== END SOURCE MIGRATION: 20260713062739_e0144043-a7a4-43b7-8fc6-050ea0304634.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe.sql =====
CREATE TABLE shop_manager.payment_methods (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  method_type text NOT NULL,
  is_default boolean DEFAULT false,
  card_last_four text,
  card_brand text,
  expiry_month integer,
  expiry_year integer,
  billing_name text,
  billing_address text,
  billing_city text,
  billing_state text,
  billing_postal_code text,
  billing_country text,
  token_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.payment_methods_options (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  value text NOT NULL,
  label text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_methods_options_pkey PRIMARY KEY (id),
  CONSTRAINT payment_methods_options_value_key UNIQUE (value)
);

CREATE TABLE shop_manager.payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  invoice_id text,
  amount numeric NOT NULL,
  payment_method_id uuid,
  payment_type text NOT NULL,
  status text NOT NULL,
  transaction_id text,
  transaction_date timestamp with time zone DEFAULT now(),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.profile_metadata (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  profile_id uuid NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profile_metadata_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.profiles (
  id uuid NOT NULL,
  first_name text,
  last_name text,
  email text NOT NULL,
  phone text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  shop_id uuid,
  job_title text,
  department text,
  department_id uuid,
  notification_preferences jsonb DEFAULT '{"sms": false, "push": true, "email": true}'::jsonb,
  full_name text GENERATED ALWAYS AS (
CASE
    WHEN ((first_name IS NOT NULL) AND (last_name IS NOT NULL)) THEN TRIM(BOTH FROM ((first_name || ' '::text) || last_name))
    WHEN (first_name IS NOT NULL) THEN first_name
    WHEN (last_name IS NOT NULL) THEN last_name
    ELSE NULL::text
END) STORED,
  has_auth_account boolean DEFAULT false,
  invitation_sent_at timestamp with time zone,
  invitation_accepted_at timestamp with time zone,
  middle_name text,
  user_id uuid,
  automotive_region text DEFAULT 'asia-ph'::text NOT NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_email_key UNIQUE (email)
);

CREATE TABLE shop_manager.purchase_order_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  purchase_order_id uuid,
  product_id text NOT NULL,
  quantity integer NOT NULL,
  unit_cost numeric(10,2) NOT NULL,
  total_cost numeric(10,2) NOT NULL,
  received_quantity integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.purchase_orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  po_number text NOT NULL,
  supplier_id uuid,
  status text DEFAULT 'draft'::text,
  order_date timestamp with time zone DEFAULT now() NOT NULL,
  expected_delivery_date timestamp with time zone,
  total_amount numeric(10,2) DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT purchase_orders_status_check CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'confirmed'::text, 'received'::text, 'cancelled'::text])),
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number)
);

CREATE TABLE shop_manager.quote_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quote_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  quantity numeric(10,2) DEFAULT 1 NOT NULL,
  unit_price numeric(10,2) DEFAULT 0 NOT NULL,
  total_price numeric(10,2) DEFAULT 0 NOT NULL,
  item_type text DEFAULT 'service'::text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT quote_items_item_type_check CHECK (item_type = ANY (ARRAY['service'::text, 'part'::text, 'labor'::text])),
  CONSTRAINT quote_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.quotes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quote_number text,
  customer_id uuid,
  vehicle_id uuid,
  status text DEFAULT 'draft'::text NOT NULL,
  subtotal numeric(10,2) DEFAULT 0,
  tax_rate numeric(5,4) DEFAULT 0.08,
  tax_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) DEFAULT 0,
  expiry_date date,
  notes text,
  terms_conditions text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  sent_at timestamp with time zone,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  converted_at timestamp with time zone,
  converted_to_work_order_id uuid,
  CONSTRAINT quotes_status_check CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'converted'::text])),
  CONSTRAINT quotes_pkey PRIMARY KEY (id),
  CONSTRAINT quotes_quote_number_key UNIQUE (quote_number)
);

CREATE TABLE shop_manager.schedule_forecasts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  forecast_date date NOT NULL,
  forecast_type text NOT NULL,
  predicted_value numeric(10,2) NOT NULL,
  confidence_level numeric(5,2),
  actual_value numeric(10,2),
  variance numeric(10,2),
  factors jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT schedule_forecasts_forecast_type_check CHECK (forecast_type = ANY (ARRAY['demand'::text, 'labor_cost'::text, 'coverage'::text])),
  CONSTRAINT schedule_forecasts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.schedule_notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_entity_type text,
  related_entity_id uuid,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  priority text DEFAULT 'normal'::text,
  action_url text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT schedule_notifications_notification_type_check CHECK (notification_type = ANY (ARRAY['schedule_created'::text, 'schedule_updated'::text, 'schedule_deleted'::text, 'shift_swap_requested'::text, 'shift_swap_approved'::text, 'shift_swap_rejected'::text, 'conflict_detected'::text, 'time_off_approved'::text, 'time_off_rejected'::text])),
  CONSTRAINT schedule_notifications_priority_check CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  CONSTRAINT schedule_notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.schedule_optimization_metrics (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  metric_date date NOT NULL,
  coverage_score numeric(5,2),
  efficiency_score numeric(5,2),
  cost_score numeric(5,2),
  employee_satisfaction_score numeric(5,2),
  understaffed_hours integer,
  overstaffed_hours integer,
  optimal_hours integer,
  total_gaps integer,
  total_overlaps integer,
  recommendations jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT schedule_optimization_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT schedule_optimization_metrics_shop_id_metric_date_key UNIQUE (shop_id, metric_date)
);

CREATE TABLE shop_manager.scheduling_conflicts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  conflict_type text NOT NULL,
  severity text DEFAULT 'medium'::text NOT NULL,
  employee_id uuid,
  schedule_assignment_id uuid,
  conflicting_assignment_id uuid,
  time_off_request_id uuid,
  conflict_date date NOT NULL,
  conflict_start_time time without time zone,
  conflict_end_time time without time zone,
  description text NOT NULL,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduling_conflicts_conflict_type_check CHECK (conflict_type = ANY (ARRAY['double_booking'::text, 'overlapping_shift'::text, 'time_off_conflict'::text, 'accommodation_conflict'::text, 'overtime'::text, 'understaffed'::text])),
  CONSTRAINT scheduling_conflicts_severity_check CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  CONSTRAINT scheduling_conflicts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.scheduling_statistics (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  stat_date date NOT NULL,
  total_scheduled_hours numeric(10,2) DEFAULT 0,
  total_employees_scheduled integer DEFAULT 0,
  total_shifts integer DEFAULT 0,
  coverage_percentage numeric(5,2) DEFAULT 0,
  active_conflicts integer DEFAULT 0,
  critical_conflicts integer DEFAULT 0,
  understaffed_shifts integer DEFAULT 0,
  overstaffed_shifts integer DEFAULT 0,
  overtime_hours numeric(10,2) DEFAULT 0,
  labor_cost_estimate numeric(12,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduling_statistics_pkey PRIMARY KEY (id),
  CONSTRAINT scheduling_statistics_shop_id_stat_date_key UNIQUE (shop_id, stat_date)
);

CREATE TABLE shop_manager.service_automation_rules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  rule_name text NOT NULL,
  service_type text,
  vehicle_criteria jsonb DEFAULT '{}'::jsonb,
  automation_config jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_automation_rules_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.service_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  position integer DEFAULT 1,
  sector_id uuid,
  CONSTRAINT service_categories_pkey PRIMARY KEY (id),
  CONSTRAINT service_categories_name_sector_unique UNIQUE (name, sector_id)
);

CREATE TABLE shop_manager.service_hierarchy (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  position integer,
  subcategories jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_hierarchy_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.service_jobs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  subcategory_id uuid,
  name text NOT NULL,
  description text,
  estimated_time integer,
  price numeric(10,2),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  position integer DEFAULT 0,
  CONSTRAINT service_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT service_jobs_name_subcategory_unique UNIQUE (name, subcategory_id)
);

CREATE TABLE shop_manager.service_package_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  service_package_id uuid NOT NULL,
  inventory_item_id uuid,
  part_number text,
  part_name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit text DEFAULT 'each'::text,
  is_optional boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT service_package_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.service_packages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  interval_value numeric(10,2) NOT NULL,
  interval_metric text NOT NULL,
  estimated_duration_minutes integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT service_packages_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.service_reminder_tags (
  reminder_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT service_reminder_tags_pkey PRIMARY KEY (reminder_id, tag_id)
);

CREATE TABLE shop_manager.service_reminders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  vehicle_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  notification_sent boolean DEFAULT false NOT NULL,
  notification_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text NOT NULL,
  completed_at timestamp with time zone,
  completed_by text,
  notes text,
  priority text DEFAULT 'medium'::text,
  category_id uuid,
  assigned_to text,
  template_id uuid,
  is_recurring boolean DEFAULT false,
  recurrence_interval integer,
  recurrence_unit text,
  parent_reminder_id uuid,
  last_occurred_at timestamp with time zone,
  next_occurrence_date date,
  CONSTRAINT service_reminders_recurrence_unit_check CHECK (recurrence_unit = ANY (ARRAY['days'::text, 'weeks'::text, 'months'::text, 'years'::text])),
  CONSTRAINT service_reminders_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.service_sectors (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  position integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT service_sectors_pkey PRIMARY KEY (id),
  CONSTRAINT service_sectors_name_unique UNIQUE (name)
);

CREATE TABLE shop_manager.service_subcategories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  category_id uuid,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  position integer DEFAULT 0,
  CONSTRAINT service_subcategories_pkey PRIMARY KEY (id),
  CONSTRAINT service_subcategories_name_category_unique UNIQUE (name, category_id)
);

CREATE TABLE shop_manager.shift_chats (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  chat_room_id uuid,
  shift_date date NOT NULL,
  shift_name text NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  technician_ids text[] DEFAULT '{}'::text[],
  location text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_chats_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.shift_swap_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  requesting_employee_id uuid NOT NULL,
  target_employee_id uuid,
  original_schedule_id uuid NOT NULL,
  proposed_schedule_id uuid,
  swap_date date NOT NULL,
  reason text,
  status text DEFAULT 'pending'::text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shift_swap_requests_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])),
  CONSTRAINT shift_swap_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.shift_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  template_name text NOT NULL,
  description text,
  shift_start time without time zone NOT NULL,
  shift_end time without time zone NOT NULL,
  days_of_week integer[] NOT NULL,
  break_duration_minutes integer DEFAULT 0,
  is_active boolean DEFAULT true,
  color text DEFAULT '#3b82f6'::text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT valid_days_of_week CHECK (days_of_week <@ ARRAY[0, 1, 2, 3, 4, 5, 6]),
  CONSTRAINT shift_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.shop_enabled_modules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  module_id uuid NOT NULL,
  enabled_at timestamp with time zone DEFAULT now(),
  enabled_by uuid,
  display_name text,
  display_logo_url text,
  display_phone text,
  display_email text,
  display_address text,
  display_description text,
  CONSTRAINT shop_enabled_modules_pkey PRIMARY KEY (id),
  CONSTRAINT shop_enabled_modules_shop_id_module_id_key UNIQUE (shop_id, module_id)
);

CREATE TABLE shop_manager.shop_fuel_price_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  reference_city text DEFAULT 'Victoria'::text NOT NULL,
  reference_province text DEFAULT 'BC'::text NOT NULL,
  custom_location_label text,
  show_on_portal boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shop_fuel_price_settings_pkey PRIMARY KEY (id),
  CONSTRAINT shop_fuel_price_settings_shop_id_key UNIQUE (shop_id)
);

CREATE TABLE shop_manager.shop_hours (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  day_of_week integer NOT NULL,
  open_time time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
  close_time time without time zone DEFAULT '17:00:00'::time without time zone NOT NULL,
  is_closed boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shop_hours_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT shop_hours_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.shop_integrations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  auth_credentials jsonb DEFAULT '{}'::jsonb,
  configuration jsonb DEFAULT '{}'::jsonb,
  sync_settings jsonb DEFAULT '{}'::jsonb,
  last_sync_at timestamp with time zone,
  sync_status text DEFAULT 'pending'::text,
  error_details text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shop_integrations_pkey PRIMARY KEY (id),
  CONSTRAINT shop_integrations_shop_id_provider_id_key UNIQUE (shop_id, provider_id)
);

CREATE TABLE shop_manager.shop_role_permissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  role_name text NOT NULL,
  module text NOT NULL,
  actions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT shop_role_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT shop_role_permissions_shop_id_role_name_module_key UNIQUE (shop_id, role_name, module)
);

CREATE TABLE shop_manager.shop_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  email text,
  hours jsonb,
  logo_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  shop_id uuid,
  booking_enabled boolean DEFAULT true NOT NULL,
  CONSTRAINT shop_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.shop_special_days (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  date date NOT NULL,
  name text NOT NULL,
  description text,
  is_closed boolean DEFAULT true NOT NULL,
  open_time time without time zone,
  close_time time without time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shop_special_days_pkey PRIMARY KEY (id),
  CONSTRAINT shop_special_days_shop_id_date_unique UNIQUE (shop_id, date)
);

CREATE TABLE shop_manager.shopping_carts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shopping_carts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.shops (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  organization_id uuid NOT NULL,
  address text,
  phone text,
  email text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  logo_url text,
  business_type text,
  industry text,
  other_industry text,
  tax_id text,
  city text,
  state text,
  postal_code text,
  latitude numeric(10,8),
  longitude numeric(11,8),
  is_active boolean DEFAULT true,
  shop_description text,
  shop_image_url text,
  onboarding_completed boolean DEFAULT false,
  onboarding_data jsonb DEFAULT '{}'::jsonb,
  setup_step integer DEFAULT 0,
  trial_started_at timestamp with time zone DEFAULT now(),
  trial_days integer DEFAULT 14,
  slug text,
  invite_code text,
  CONSTRAINT shops_name_not_empty CHECK (name IS NOT NULL AND TRIM(BOTH FROM name) <> ''::text),
  CONSTRAINT shops_pkey PRIMARY KEY (id),
  CONSTRAINT shops_invite_code_key UNIQUE (invite_code),
  CONSTRAINT shops_slug_key UNIQUE (slug)
);

CREATE TABLE shop_manager.staff_certificate_types (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  requires_renewal boolean DEFAULT true,
  default_validity_months integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_certificate_types_pkey PRIMARY KEY (id),
  CONSTRAINT staff_certificate_types_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.staff_certificates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  staff_id uuid NOT NULL,
  certificate_type_id uuid NOT NULL,
  certificate_number text,
  issue_date date NOT NULL,
  expiry_date date,
  training_date date,
  issuing_authority text,
  status text DEFAULT 'active'::text,
  notes text,
  document_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT staff_certificates_status_check CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'suspended'::text, 'revoked'::text])),
  CONSTRAINT staff_certificates_pkey PRIMARY KEY (id),
  CONSTRAINT staff_certificates_staff_id_certificate_type_id_issue_date_key UNIQUE (staff_id, certificate_type_id, issue_date)
);

CREATE TABLE shop_manager.staff_service_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid,
  employee_id uuid,
  service_id uuid,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT staff_service_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT staff_service_assignments_employee_id_service_id_key UNIQUE (employee_id, service_id)
);

CREATE TABLE shop_manager.stock_alerts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id text NOT NULL,
  alert_type text NOT NULL,
  threshold_quantity integer NOT NULL,
  current_quantity integer NOT NULL,
  is_resolved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  resolved_at timestamp with time zone,
  CONSTRAINT stock_alerts_alert_type_check CHECK (alert_type = ANY (ARRAY['low_stock'::text, 'out_of_stock'::text, 'reorder_point'::text])),
  CONSTRAINT stock_alerts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.stock_transfers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  from_location text NOT NULL,
  to_location text NOT NULL,
  quantity integer NOT NULL,
  notes text,
  transferred_by text,
  transferred_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT stock_transfers_quantity_check CHECK (quantity > 0),
  CONSTRAINT stock_transfers_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.suppliers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  payment_terms text,
  lead_time_days integer DEFAULT 7,
  minimum_order_amount numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  rating numeric(2,1) DEFAULT 5.0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT suppliers_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.technician_breaks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  schedule_id uuid NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT technician_breaks_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.technician_schedules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  technician_id uuid NOT NULL,
  day_of_week integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_recurring boolean DEFAULT true NOT NULL,
  specific_date date,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT technician_schedules_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.technician_status_changes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  technician_id text NOT NULL,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  change_date timestamp with time zone DEFAULT now() NOT NULL,
  change_reason text,
  changed_by text NOT NULL,
  CONSTRAINT technician_status_changes_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.user_roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id)
);

CREATE TABLE shop_manager.vehicle_inspections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  vehicle_id uuid,
  technician_id uuid,
  inspection_date timestamp with time zone DEFAULT now() NOT NULL,
  vehicle_body_style text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  damage_areas jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vehicle_inspections_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.vehicle_makes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  make_id text NOT NULL,
  make_display text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vehicle_makes_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_makes_make_id_key UNIQUE (make_id)
);

CREATE TABLE shop_manager.vehicle_models (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  make_id text NOT NULL,
  model_id text NOT NULL,
  model_display text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vehicle_models_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_models_make_id_model_id_key UNIQUE (make_id, model_id)
);

CREATE TABLE shop_manager.vehicles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid,
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  vin text,
  license_plate text,
  color text,
  last_service_date timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  transmission text,
  drive_type text,
  fuel_type text,
  engine text,
  body_style text,
  country text,
  transmission_type text,
  gvwr text,
  trim text,
  owner_type text DEFAULT 'customer'::text NOT NULL,
  asset_category text,
  asset_status text DEFAULT 'available'::text,
  checked_out_to uuid,
  checked_out_at timestamp with time zone,
  expected_return_date date,
  current_location text,
  qr_code text,
  qr_code_generated_at timestamp with time zone,
  CONSTRAINT vehicles_asset_category_check CHECK (owner_type = 'customer'::text AND asset_category IS NULL OR owner_type = 'company'::text AND (asset_category = ANY (ARRAY['courtesy'::text, 'rental'::text, 'fleet'::text, 'service'::text, 'equipment'::text, 'other'::text]))),
  CONSTRAINT vehicles_asset_status_check CHECK (asset_status = ANY (ARRAY['available'::text, 'in_use'::text, 'maintenance'::text, 'out_of_service'::text, 'retired'::text])),
  CONSTRAINT vehicles_owner_type_check CHECK (owner_type = ANY (ARRAY['customer'::text, 'company'::text])),
  CONSTRAINT vehicles_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.vendor_bill_lines (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  bill_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric(10,2) DEFAULT 1 NOT NULL,
  unit_cost numeric(12,2) DEFAULT 0 NOT NULL,
  total_cost numeric(12,2) DEFAULT 0 NOT NULL,
  account_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vendor_bill_lines_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.vendor_bills (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  supplier_id uuid,
  bill_number text NOT NULL,
  status text NOT NULL,
  bill_date date NOT NULL,
  due_date date,
  total_amount numeric(12,2) DEFAULT 0 NOT NULL,
  balance_due numeric(12,2) DEFAULT 0 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  subtotal numeric(12,2) DEFAULT 0 NOT NULL,
  tax_rate numeric(5,2) DEFAULT 0 NOT NULL,
  tax_amount numeric(12,2) DEFAULT 0 NOT NULL,
  CONSTRAINT vendor_bills_status_check CHECK (status = ANY (ARRAY['draft'::text, 'approved'::text, 'paid'::text, 'overdue'::text, 'void'::text])),
  CONSTRAINT vendor_bills_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_bills_shop_id_bill_number_key UNIQUE (shop_id, bill_number)
);

CREATE TABLE shop_manager.vendor_payment_batch_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  batch_id uuid NOT NULL,
  bill_id uuid,
  amount numeric(12,2) DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vendor_payment_batch_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.vendor_payment_batches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  batch_number text NOT NULL,
  payment_date date NOT NULL,
  payment_method text,
  reference text,
  total_amount numeric(12,2) DEFAULT 0 NOT NULL,
  status text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vendor_payment_batches_status_check CHECK (status = ANY (ARRAY['draft'::text, 'processed'::text, 'void'::text])),
  CONSTRAINT vendor_payment_batches_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.vendor_payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  supplier_id uuid,
  bill_id uuid,
  payment_date date NOT NULL,
  amount numeric(12,2) DEFAULT 0 NOT NULL,
  payment_method text,
  reference text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vendor_payments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_activities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  action text NOT NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  flagged boolean DEFAULT false,
  flag_reason text,
  CONSTRAINT work_order_activities_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  technician_id uuid,
  assigned_by uuid,
  assigned_by_name text NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  unassigned_at timestamp with time zone,
  assignment_notes text,
  is_active boolean DEFAULT true,
  CONSTRAINT work_order_assignments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_checklists (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  checklist_name text NOT NULL,
  checklist_type text DEFAULT 'general'::text NOT NULL,
  description text,
  status text DEFAULT 'pending'::text NOT NULL,
  completion_percentage integer DEFAULT 0,
  assigned_to uuid,
  completed_by uuid,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  CONSTRAINT work_order_checklists_checklist_type_check CHECK (checklist_type = ANY (ARRAY['general'::text, 'safety'::text, 'quality'::text, 'inspection'::text, 'delivery'::text])),
  CONSTRAINT work_order_checklists_completion_percentage_check CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  CONSTRAINT work_order_checklists_status_check CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text])),
  CONSTRAINT work_order_checklists_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_discounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  discount_type_id uuid,
  discount_name text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  discount_amount numeric NOT NULL,
  applies_to text NOT NULL,
  reason text,
  approved_by text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text NOT NULL,
  CONSTRAINT work_order_discounts_applies_to_check CHECK (applies_to = ANY (ARRAY['labor'::text, 'parts'::text, 'total'::text])),
  CONSTRAINT work_order_discounts_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  CONSTRAINT work_order_discounts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_document_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_document_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_document_versions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  document_id uuid,
  file_url text NOT NULL,
  version_number integer NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  notes text,
  CONSTRAINT work_order_document_versions_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  category text,
  description text,
  uploaded_by uuid,
  uploaded_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  category_id uuid,
  version_count integer DEFAULT 1,
  created_by uuid,
  CONSTRAINT work_order_documents_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_inventory_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  name text NOT NULL,
  sku text NOT NULL,
  category text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_inventory_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_job_line_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  job_line_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_name text NOT NULL,
  change_reason text,
  changed_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT work_order_job_line_history_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_job_lines (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  subcategory text,
  description text,
  estimated_hours numeric DEFAULT 0,
  labor_rate_type text DEFAULT 'standard'::text,
  labor_rate numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  status shop_manager.job_line_status DEFAULT 'pending'::shop_manager.job_line_status,
  notes text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT work_order_job_lines_pkey PRIMARY KEY (id)
);
-- ===== END SOURCE MIGRATION: 20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260713063430_0a07d0d9-729b-4662-ac1e-d561b0a2ce85.sql =====
CREATE TABLE shop_manager.work_order_notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  recipient_type text NOT NULL,
  recipient_id text NOT NULL,
  status text DEFAULT 'pending'::text,
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_part_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  part_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_name text NOT NULL,
  change_reason text,
  changed_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT work_order_part_history_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_parts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  job_line_id uuid,
  inventory_item_id uuid,
  part_name text NOT NULL,
  part_number text,
  supplier_name text,
  supplier_cost numeric(10,2) DEFAULT 0,
  markup_percentage numeric(5,2) DEFAULT 0,
  retail_price numeric(10,2) DEFAULT 0,
  customer_price numeric(10,2) NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  part_type text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  category text,
  is_taxable boolean DEFAULT true,
  core_charge_amount numeric(10,2) DEFAULT 0,
  core_charge_applied boolean DEFAULT false,
  warranty_duration text,
  warranty_expiry_date date,
  install_date date,
  installed_by text,
  status text DEFAULT 'ordered'::text,
  is_stock_item boolean DEFAULT true,
  date_added timestamp with time zone DEFAULT now(),
  attachments jsonb DEFAULT '[]'::jsonb,
  notes_internal text,
  invoice_number text,
  po_line text,
  supplier_suggested_retail_price numeric,
  eco_fee numeric DEFAULT 0,
  eco_fee_applied boolean DEFAULT false,
  CONSTRAINT work_order_parts_part_type_check CHECK (part_type = ANY (ARRAY['inventory'::text, 'non-inventory'::text])),
  CONSTRAINT work_order_parts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_priorities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  level integer NOT NULL,
  color text DEFAULT '#6B7280'::text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_priorities_pkey PRIMARY KEY (id),
  CONSTRAINT work_order_priorities_level_key UNIQUE (level),
  CONSTRAINT work_order_priorities_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.work_order_signatures (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid,
  signature_url text NOT NULL,
  signature_type text NOT NULL,
  signed_by text NOT NULL,
  signed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_signatures_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_status_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_by_name text NOT NULL,
  change_reason text,
  changed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_status_history_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_template_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  template_id uuid,
  name text NOT NULL,
  sku text,
  category text,
  quantity integer DEFAULT 1,
  unit_price numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_template_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'active'::text,
  priority text,
  technician text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  last_used timestamp with time zone,
  usage_count integer DEFAULT 0,
  CONSTRAINT work_order_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_time_entries (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  employee_id text NOT NULL,
  employee_name text NOT NULL,
  start_time text NOT NULL,
  end_time text,
  duration integer NOT NULL,
  notes text,
  billable boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_time_entries_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid,
  vehicle_id uuid,
  advisor_id uuid,
  technician_id uuid,
  status text NOT NULL,
  description text,
  estimated_hours numeric,
  total_cost numeric,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  service_type text,
  service_category_id uuid,
  invoice_id text,
  invoiced_at timestamp with time zone,
  work_order_number text,
  customer_complaint text,
  complaint_source text DEFAULT 'Customer'::text,
  additional_info text,
  requested_services jsonb DEFAULT '[]'::jsonb,
  customer_instructions text,
  authorization_limit numeric DEFAULT 0,
  preferred_contact_method text DEFAULT 'Phone'::text,
  urgency_level text DEFAULT 'Normal'::text,
  drop_off_type text DEFAULT 'Walk-in'::text,
  diagnostic_notes text,
  write_up_by uuid,
  write_up_time timestamp with time zone DEFAULT now(),
  initial_mileage integer,
  vehicle_condition_notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  service_tags text[] DEFAULT '{}'::text[],
  customer_waiting boolean DEFAULT false,
  is_warranty boolean DEFAULT false,
  is_repeat_issue boolean DEFAULT false,
  linked_prior_work_order_id uuid,
  vehicle_damages jsonb DEFAULT '[]'::jsonb,
  equipment_id uuid,
  priority text DEFAULT 'medium'::text,
  shop_id uuid NOT NULL,
  CONSTRAINT check_drop_off_type CHECK (drop_off_type = ANY (ARRAY['Walk-in'::text, 'Appointment'::text, 'Tow-in'::text, 'Night Drop'::text])),
  CONSTRAINT check_preferred_contact_method CHECK (preferred_contact_method = ANY (ARRAY['Phone'::text, 'Email'::text, 'Text'::text, 'In-Person'::text])),
  CONSTRAINT check_urgency_level CHECK (urgency_level = ANY (ARRAY['Low'::text, 'Normal'::text, 'Urgent'::text, 'Emergency'::text])),
  CONSTRAINT work_orders_must_have_reference CHECK (customer_id IS NOT NULL OR vehicle_id IS NOT NULL),
  CONSTRAINT work_orders_pkey PRIMARY KEY (id)
);
-- ===== END SOURCE MIGRATION: 20260713063430_0a07d0d9-729b-4662-ac1e-d561b0a2ce85.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260713070220_28789e9e-20ef-4e63-a727-e686ff8c5c7c.sql =====
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.appointments ADD CONSTRAINT appointments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.appointments ADD CONSTRAINT appointments_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES shop_manager.vehicles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.appointments ADD CONSTRAINT fk_appointments_advisor FOREIGN KEY (advisor_id) REFERENCES shop_manager.profiles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.appointments ADD CONSTRAINT fk_appointments_customer FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.appointments ADD CONSTRAINT fk_appointments_vehicle FOREIGN KEY (vehicle_id) REFERENCES shop_manager.vehicles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_invoice_lines ADD CONSTRAINT ar_invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES shop_manager.ar_invoices(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_invoices ADD CONSTRAINT ar_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_invoices ADD CONSTRAINT ar_invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_invoices ADD CONSTRAINT ar_invoices_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_payments ADD CONSTRAINT ar_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_payments ADD CONSTRAINT ar_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES shop_manager.ar_invoices(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_payments ADD CONSTRAINT ar_payments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.company_settings ADD CONSTRAINT company_settings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_communications ADD CONSTRAINT customer_communications_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_documents ADD CONSTRAINT customer_documents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_form_comments ADD CONSTRAINT customer_form_comments_form_id_fkey FOREIGN KEY (form_id) REFERENCES shop_manager.customer_provided_forms(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_interactions ADD CONSTRAINT customer_interactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_interactions ADD CONSTRAINT customer_interactions_related_work_order_id_fkey FOREIGN KEY (related_work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_loyalty ADD CONSTRAINT customer_loyalty_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_notes ADD CONSTRAINT customer_notes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_property_areas ADD CONSTRAINT customer_property_areas_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_property_areas ADD CONSTRAINT customer_property_areas_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_provided_forms ADD CONSTRAINT customer_provided_forms_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_referrals ADD CONSTRAINT customer_referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES shop_manager.customers(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_referrals ADD CONSTRAINT customer_referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES shop_manager.customers(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_segment_assignments ADD CONSTRAINT customer_segment_assignments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_segment_assignments ADD CONSTRAINT customer_segment_assignments_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES shop_manager.customer_segments(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_shop_relationships ADD CONSTRAINT customer_shop_relationships_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_shop_relationships ADD CONSTRAINT customer_shop_relationships_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_touchpoints ADD CONSTRAINT customer_touchpoints_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_uploaded_forms ADD CONSTRAINT customer_uploaded_forms_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_uploaded_forms ADD CONSTRAINT customer_uploaded_forms_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_uploaded_forms ADD CONSTRAINT customer_uploaded_forms_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customers ADD CONSTRAINT customers_household_id_fkey FOREIGN KEY (household_id) REFERENCES shop_manager.households(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customers ADD CONSTRAINT customers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.discount_code_usage ADD CONSTRAINT discount_code_usage_discount_code_id_fkey FOREIGN KEY (discount_code_id) REFERENCES shop_manager.discount_codes(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.employee_accommodations ADD CONSTRAINT employee_accommodations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.employee_accommodations ADD CONSTRAINT employee_accommodations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES shop_manager.profiles(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.employee_accommodations ADD CONSTRAINT employee_accommodations_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.employee_availability ADD CONSTRAINT employee_availability_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.household_members ADD CONSTRAINT household_members_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.household_members ADD CONSTRAINT household_members_household_id_fkey FOREIGN KEY (household_id) REFERENCES shop_manager.households(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_adjustments ADD CONSTRAINT inventory_adjustments_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES shop_manager.inventory_items(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_adjustments ADD CONSTRAINT inventory_adjustments_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_auto_reorder ADD CONSTRAINT inventory_auto_reorder_item_id_fkey FOREIGN KEY (item_id) REFERENCES shop_manager.inventory_items(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES shop_manager.inventory_items(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_service_package_id_fkey FOREIGN KEY (service_package_id) REFERENCES shop_manager.service_packages(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_service_package_id_fkey2 FOREIGN KEY (service_package_id) REFERENCES shop_manager.service_packages(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_service_package_id_fkey3 FOREIGN KEY (service_package_id) REFERENCES shop_manager.service_packages(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_service_package_id_fkey4 FOREIGN KEY (service_package_id) REFERENCES shop_manager.service_packages(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_service_package_id_fkey5 FOREIGN KEY (service_package_id) REFERENCES shop_manager.service_packages(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
-- ===== END SOURCE MIGRATION: 20260713070220_28789e9e-20ef-4e63-a727-e686ff8c5c7c.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260713070436_a4f482f9-5657-4142-88e7-047bd0e90a42.sql =====
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_swap_requests ADD CONSTRAINT shift_swap_requests_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_templates ADD CONSTRAINT shift_templates_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_enabled_modules ADD CONSTRAINT shop_enabled_modules_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_fuel_price_settings ADD CONSTRAINT shop_fuel_price_settings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_hours ADD CONSTRAINT shop_hours_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_role_permissions ADD CONSTRAINT shop_role_permissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_role_permissions ADD CONSTRAINT shop_role_permissions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_settings ADD CONSTRAINT shop_settings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_special_days ADD CONSTRAINT shop_special_days_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.staff_certificates ADD CONSTRAINT staff_certificates_certificate_type_id_fkey FOREIGN KEY (certificate_type_id) REFERENCES shop_manager.staff_certificate_types(id) ON DELETE RESTRICT'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.staff_certificates ADD CONSTRAINT staff_certificates_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.staff_certificates ADD CONSTRAINT staff_certificates_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES shop_manager.profiles(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.staff_service_assignments ADD CONSTRAINT staff_service_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES shop_manager.profiles(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.staff_service_assignments ADD CONSTRAINT staff_service_assignments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.stock_transfers ADD CONSTRAINT stock_transfers_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES shop_manager.inventory_items(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.technician_breaks ADD CONSTRAINT technician_breaks_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES shop_manager.technician_schedules(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vehicle_inspections ADD CONSTRAINT vehicle_inspections_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES shop_manager.vehicles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vehicles ADD CONSTRAINT fk_vehicles_customer FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vehicles ADD CONSTRAINT vehicles_checked_out_to_fkey FOREIGN KEY (checked_out_to) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vehicles ADD CONSTRAINT vehicles_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_bill_lines ADD CONSTRAINT vendor_bill_lines_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES shop_manager.vendor_bills(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_bills ADD CONSTRAINT vendor_bills_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_bills ADD CONSTRAINT vendor_bills_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_bills ADD CONSTRAINT vendor_bills_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES shop_manager.suppliers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payment_batch_items ADD CONSTRAINT vendor_payment_batch_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES shop_manager.vendor_payment_batches(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payment_batch_items ADD CONSTRAINT vendor_payment_batch_items_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES shop_manager.vendor_bills(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payment_batches ADD CONSTRAINT vendor_payment_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payment_batches ADD CONSTRAINT vendor_payment_batches_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payments ADD CONSTRAINT vendor_payments_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES shop_manager.vendor_bills(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payments ADD CONSTRAINT vendor_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payments ADD CONSTRAINT vendor_payments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payments ADD CONSTRAINT vendor_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES shop_manager.suppliers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_activities ADD CONSTRAINT fk_activities_work_order FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_activities ADD CONSTRAINT work_order_activities_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_assignments ADD CONSTRAINT work_order_assignments_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_checklists ADD CONSTRAINT work_order_checklists_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_checklists ADD CONSTRAINT work_order_checklists_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_checklists ADD CONSTRAINT work_order_checklists_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_checklists ADD CONSTRAINT work_order_checklists_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_discounts ADD CONSTRAINT work_order_discounts_discount_type_id_fkey FOREIGN KEY (discount_type_id) REFERENCES shop_manager.discount_types(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_discounts ADD CONSTRAINT work_order_discounts_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_document_versions ADD CONSTRAINT work_order_document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES shop_manager.work_order_documents(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_documents ADD CONSTRAINT work_order_documents_category_id_fkey FOREIGN KEY (category_id) REFERENCES shop_manager.work_order_document_categories(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_documents ADD CONSTRAINT work_order_documents_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_inventory_items ADD CONSTRAINT fk_inventory_items_work_order FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_inventory_items ADD CONSTRAINT work_order_inventory_items_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_job_line_history ADD CONSTRAINT work_order_job_line_history_job_line_id_fkey FOREIGN KEY (job_line_id) REFERENCES shop_manager.work_order_job_lines(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_job_lines ADD CONSTRAINT fk_job_lines_work_order FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_job_lines ADD CONSTRAINT work_order_job_lines_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_notifications ADD CONSTRAINT work_order_notifications_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_part_history ADD CONSTRAINT work_order_part_history_part_id_fkey FOREIGN KEY (part_id) REFERENCES shop_manager.work_order_parts(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_parts ADD CONSTRAINT work_order_parts_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES shop_manager.inventory_items(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_parts ADD CONSTRAINT work_order_parts_job_line_id_fkey FOREIGN KEY (job_line_id) REFERENCES shop_manager.work_order_job_lines(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_signatures ADD CONSTRAINT work_order_signatures_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_status_history ADD CONSTRAINT work_order_status_history_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_template_items ADD CONSTRAINT work_order_template_items_template_id_fkey FOREIGN KEY (template_id) REFERENCES shop_manager.work_order_templates(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_time_entries ADD CONSTRAINT fk_time_entries_work_order FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_time_entries ADD CONSTRAINT work_order_time_entries_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT fk_linked_prior_work_order FOREIGN KEY (linked_prior_work_order_id) REFERENCES shop_manager.work_orders(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT fk_work_orders_advisor FOREIGN KEY (advisor_id) REFERENCES shop_manager.profiles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT fk_work_orders_created_by FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT fk_work_orders_customer FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT fk_work_orders_technician FOREIGN KEY (technician_id) REFERENCES shop_manager.profiles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT fk_work_orders_vehicle FOREIGN KEY (vehicle_id) REFERENCES shop_manager.vehicles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES shop_manager.invoices(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_service_category_id_fkey FOREIGN KEY (service_category_id) REFERENCES shop_manager.service_categories(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES shop_manager.vehicles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.appointments ADD CONSTRAINT appointments_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_addresses ADD CONSTRAINT customer_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_form_comments ADD CONSTRAINT customer_form_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_payment_methods ADD CONSTRAINT customer_payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_profiles ADD CONSTRAINT customer_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_provided_forms ADD CONSTRAINT customer_provided_forms_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customers ADD CONSTRAINT customers_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customers ADD CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.discount_code_usage ADD CONSTRAINT discount_code_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.discount_codes ADD CONSTRAINT discount_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.employee_availability ADD CONSTRAINT employee_availability_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_adjustments ADD CONSTRAINT inventory_adjustments_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_alerts ADD CONSTRAINT inventory_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.purchase_orders ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.quotes ADD CONSTRAINT quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.schedule_notifications ADD CONSTRAINT schedule_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_chats ADD CONSTRAINT shift_chats_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_swap_requests ADD CONSTRAINT shift_swap_requests_requesting_employee_id_fkey FOREIGN KEY (requesting_employee_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_swap_requests ADD CONSTRAINT shift_swap_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_swap_requests ADD CONSTRAINT shift_swap_requests_target_employee_id_fkey FOREIGN KEY (target_employee_id) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_templates ADD CONSTRAINT shift_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shopping_carts ADD CONSTRAINT shopping_carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vehicle_inspections ADD CONSTRAINT vehicle_inspections_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_document_versions ADD CONSTRAINT work_order_document_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_documents ADD CONSTRAINT work_order_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_documents ADD CONSTRAINT work_order_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_job_line_history ADD CONSTRAINT work_order_job_line_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_part_history ADD CONSTRAINT work_order_part_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
-- ===== END SOURCE MIGRATION: 20260713070436_a4f482f9-5657-4142-88e7-047bd0e90a42.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260713070515_c57f9258-c8b3-4973-9eff-2d03ccade037.sql =====
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='shop_manager' LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA shop_manager TO authenticated, service_role');
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.%I TO authenticated', r.tablename);
    EXECUTE format('GRANT ALL ON shop_manager.%I TO service_role', r.tablename);
    EXECUTE format('ALTER TABLE shop_manager.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA shop_manager TO authenticated, service_role;
-- ===== END SOURCE MIGRATION: 20260713070515_c57f9258-c8b3-4973-9eff-2d03ccade037.sql =====

-- ===== BEGIN SOURCE MIGRATION: 20260713071921_8c790938-2bb4-420b-b1df-3261d4bed855.sql =====

-- 1. Extend chat_threads with business scope
ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'group';

CREATE UNIQUE INDEX IF NOT EXISTS chat_threads_business_team_unique
  ON public.chat_threads(business_id) WHERE kind = 'team';

CREATE INDEX IF NOT EXISTS chat_threads_business_idx ON public.chat_threads(business_id);

-- 2. Ensure a team thread exists for each business and mirror staff membership
CREATE OR REPLACE FUNCTION public.ensure_business_team_thread(_business_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _thread_id uuid;
  _owner_id uuid;
  _name text;
BEGIN
  SELECT id INTO _thread_id FROM public.chat_threads
    WHERE business_id = _business_id AND kind = 'team' LIMIT 1;
  IF _thread_id IS NOT NULL THEN RETURN _thread_id; END IF;

  SELECT owner_id, COALESCE(name,'Team') INTO _owner_id, _name
    FROM public.businesses WHERE id = _business_id;
  IF _owner_id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.chat_threads(title, created_by, business_id, kind)
    VALUES (_name || ' — Team', _owner_id, _business_id, 'team')
    RETURNING id INTO _thread_id;

  INSERT INTO public.chat_thread_members(thread_id, user_id, status, invited_by)
    VALUES (_thread_id, _owner_id, 'active', _owner_id)
    ON CONFLICT DO NOTHING;

  -- Add existing active staff
  INSERT INTO public.chat_thread_members(thread_id, user_id, status, invited_by)
    SELECT _thread_id, s.user_id, 'active', _owner_id
      FROM public.business_staff s
      WHERE s.business_id = _business_id AND s.active = true
    ON CONFLICT DO NOTHING;

  RETURN _thread_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_business_created_team_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.ensure_business_team_thread(NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS business_team_thread_on_create ON public.businesses;
CREATE TRIGGER business_team_thread_on_create
  AFTER INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.trg_business_created_team_thread();

CREATE OR REPLACE FUNCTION public.trg_staff_sync_team_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _thread_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    SELECT id INTO _thread_id FROM public.chat_threads
      WHERE business_id = OLD.business_id AND kind='team' LIMIT 1;
    IF _thread_id IS NOT NULL THEN
      DELETE FROM public.chat_thread_members
        WHERE thread_id = _thread_id AND user_id = OLD.user_id;
    END IF;
    RETURN OLD;
  END IF;

  _thread_id := public.ensure_business_team_thread(NEW.business_id);
  IF _thread_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.active THEN
    INSERT INTO public.chat_thread_members(thread_id, user_id, status, invited_by)
      VALUES (_thread_id, NEW.user_id, 'active', NEW.invited_by)
      ON CONFLICT (thread_id, user_id) DO UPDATE SET status = 'active';
  ELSE
    UPDATE public.chat_thread_members SET status = 'inactive'
      WHERE thread_id = _thread_id AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS business_staff_team_thread_sync ON public.business_staff;
CREATE TRIGGER business_staff_team_thread_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.business_staff
  FOR EACH ROW EXECUTE FUNCTION public.trg_staff_sync_team_thread();

-- Backfill: create team thread for every existing business
DO $$
DECLARE _b uuid;
BEGIN
  FOR _b IN SELECT id FROM public.businesses LOOP
    PERFORM public.ensure_business_team_thread(_b);
  END LOOP;
END $$;

-- 3. Tow request notifications
CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid, _category text, _title text, _body text,
  _link text, _entity_type text, _entity_id uuid, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_notifications(user_id, category, title, body, link_url, entity_type, entity_id, metadata)
    VALUES (_user_id, _category, _title, _body, _link, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb));
END; $$;

CREATE OR REPLACE FUNCTION public.trg_tow_request_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pid uuid;
  _title text;
  _body text;
  _link text;
BEGIN
  _link := '/dashboard/dispatch?request=' || NEW.id::text;

  IF (TG_OP = 'INSERT') THEN
    _title := 'New tow request';
    _body := COALESCE(NEW.vehicle_summary,'Vehicle') || ' — ' || COALESCE(NEW.pickup_city, NEW.pickup_region, 'Location TBD');
    IF NEW.matched_provider_ids IS NOT NULL THEN
      FOREACH _pid IN ARRAY NEW.matched_provider_ids LOOP
        PERFORM public.notify_user(_pid,'tow_request',_title,_body,_link,'tow_request',NEW.id,'{}'::jsonb);
      END LOOP;
    END IF;
    IF NEW.requested_provider_id IS NOT NULL THEN
      PERFORM public.notify_user(NEW.requested_provider_id,'tow_request','You were requested for a tow',_body,_link,'tow_request',NEW.id,'{}'::jsonb);
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: status change
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _body := 'Status: ' || NEW.status || ' — ' || COALESCE(NEW.vehicle_summary,'Vehicle');
    PERFORM public.notify_user(NEW.requester_id,'tow_request','Tow request updated',_body,_link,'tow_request',NEW.id,'{}'::jsonb);
    IF NEW.provider_id IS NOT NULL AND (OLD.provider_id IS NULL OR OLD.provider_id <> NEW.provider_id) THEN
      PERFORM public.notify_user(NEW.provider_id,'tow_request','Tow request assigned to you',_body,_link,'tow_request',NEW.id,'{}'::jsonb);
    END IF;
  END IF;

  -- New matched providers appended
  IF NEW.matched_provider_ids IS DISTINCT FROM OLD.matched_provider_ids THEN
    _body := COALESCE(NEW.vehicle_summary,'Vehicle') || ' — ' || COALESCE(NEW.pickup_city, NEW.pickup_region, 'Location TBD');
    IF NEW.matched_provider_ids IS NOT NULL THEN
      FOREACH _pid IN ARRAY NEW.matched_provider_ids LOOP
        IF OLD.matched_provider_ids IS NULL OR NOT (_pid = ANY(OLD.matched_provider_ids)) THEN
          PERFORM public.notify_user(_pid,'tow_request','New tow request',_body,_link,'tow_request',NEW.id,'{}'::jsonb);
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tow_request_notify ON public.tow_requests;
CREATE TRIGGER tow_request_notify
  AFTER INSERT OR UPDATE ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_tow_request_notify();

-- 4. Marketplace DM notifications
CREATE OR REPLACE FUNCTION public.trg_message_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text; _body text; _link text;
BEGIN
  IF NEW.recipient_id IS NULL OR NEW.recipient_id = NEW.sender_id THEN RETURN NEW; END IF;
  _title := CASE WHEN NEW.is_offer THEN 'New offer' ELSE 'New message' END;
  _body := COALESCE(LEFT(NEW.body, 140), '(attachment)');
  _link := '/dashboard/messages?listing=' || NEW.listing_id::text || '&user=' || NEW.sender_id::text;
  PERFORM public.notify_user(NEW.recipient_id,'message',_title,_body,_link,'message',NEW.id,
    jsonb_build_object('listing_id', NEW.listing_id, 'sender_id', NEW.sender_id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS message_notify ON public.messages;
CREATE TRIGGER message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_message_notify();

-- 5. Team chat message notifications (fan-out to other active members)
CREATE OR REPLACE FUNCTION public.trg_thread_message_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _rec record;
  _thread_title text;
  _body text;
BEGIN
  SELECT title INTO _thread_title FROM public.chat_threads WHERE id = NEW.thread_id;
  _body := COALESCE(LEFT(NEW.body, 140), '(attachment)');
  FOR _rec IN
    SELECT user_id FROM public.chat_thread_members
      WHERE thread_id = NEW.thread_id AND status = 'active' AND user_id <> NEW.sender_id
  LOOP
    PERFORM public.notify_user(_rec.user_id,'team_chat',COALESCE(_thread_title,'New team message'),_body,
      '/dashboard/messages?thread=' || NEW.thread_id::text,'chat_thread',NEW.thread_id,
      jsonb_build_object('sender_id', NEW.sender_id));
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS thread_message_notify ON public.chat_thread_messages;
CREATE TRIGGER thread_message_notify
  AFTER INSERT ON public.chat_thread_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_thread_message_notify();

-- 6. Realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_thread_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_thread_members;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;         EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;             EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tow_requests;         EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ===== END SOURCE MIGRATION: 20260713071921_8c790938-2bb4-420b-b1df-3261d4bed855.sql =====

