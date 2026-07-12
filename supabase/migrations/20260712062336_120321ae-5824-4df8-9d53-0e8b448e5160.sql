
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
