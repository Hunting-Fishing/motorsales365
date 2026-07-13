
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
