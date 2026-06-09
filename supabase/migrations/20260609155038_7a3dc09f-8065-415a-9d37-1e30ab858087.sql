
CREATE TABLE IF NOT EXISTS public.dispatch_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.tow_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  event text NOT NULL CHECK (event IN ('matched','accepted','declined','lost','timed_out','completed','cancelled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.dispatch_job_events TO authenticated;
GRANT ALL ON public.dispatch_job_events TO service_role;

ALTER TABLE public.dispatch_job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own dispatch events"
  ON public.dispatch_job_events FOR SELECT TO authenticated
  USING (auth.uid() = provider_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Providers insert own dispatch events"
  ON public.dispatch_job_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = provider_id);

CREATE INDEX IF NOT EXISTS idx_dispatch_events_provider ON public.dispatch_job_events(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_request ON public.dispatch_job_events(request_id);

-- Trigger: log 'matched' events when matched_provider_ids is populated on insert
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_matched()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  IF NEW.matched_provider_ids IS NOT NULL AND array_length(NEW.matched_provider_ids, 1) > 0 THEN
    FOREACH pid IN ARRAY NEW.matched_provider_ids LOOP
      INSERT INTO public.dispatch_job_events(request_id, provider_id, event, metadata)
      VALUES (NEW.id, pid, 'matched', jsonb_build_object('dispatch_status', NEW.dispatch_status));
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_matched ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_matched
  AFTER INSERT ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_matched();

-- Trigger: log 'matched' on UPDATE when new providers are added during expansion
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_expanded()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid; added uuid[];
BEGIN
  IF NEW.matched_provider_ids IS DISTINCT FROM OLD.matched_provider_ids THEN
    SELECT COALESCE(array_agg(p), '{}'::uuid[]) INTO added
      FROM unnest(NEW.matched_provider_ids) p
      WHERE NOT (p = ANY(OLD.matched_provider_ids));
    IF added IS NOT NULL AND array_length(added, 1) > 0 THEN
      FOREACH pid IN ARRAY added LOOP
        INSERT INTO public.dispatch_job_events(request_id, provider_id, event, metadata)
        VALUES (NEW.id, pid, 'matched', jsonb_build_object('dispatch_status', NEW.dispatch_status, 'expansion', true));
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_expanded ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_expanded
  AFTER UPDATE OF matched_provider_ids ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_expanded();

-- Trigger: log 'accepted' for winner, 'lost' for others when provider_id transitions to non-null
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  IF (OLD.provider_id IS NULL) AND (NEW.provider_id IS NOT NULL) THEN
    INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
    VALUES (NEW.id, NEW.provider_id, 'accepted');
    IF NEW.matched_provider_ids IS NOT NULL THEN
      FOREACH pid IN ARRAY NEW.matched_provider_ids LOOP
        IF pid <> NEW.provider_id THEN
          INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
          VALUES (NEW.id, pid, 'lost');
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_accepted ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_accepted
  AFTER UPDATE OF provider_id ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_accepted();

-- Trigger: log 'timed_out' for matched providers when dispatch_status becomes 'expired'
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_expired()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  IF NEW.dispatch_status = 'expired' AND OLD.dispatch_status <> 'expired'
     AND NEW.provider_id IS NULL THEN
    IF NEW.matched_provider_ids IS NOT NULL THEN
      FOREACH pid IN ARRAY NEW.matched_provider_ids LOOP
        INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
        VALUES (NEW.id, pid, 'timed_out');
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_expired ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_expired
  AFTER UPDATE OF dispatch_status ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_expired();

-- Trigger: log 'completed' / 'cancelled' for provider on status change
CREATE OR REPLACE FUNCTION public.tg_dispatch_log_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.provider_id IS NOT NULL THEN
    IF NEW.status = 'completed' THEN
      INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
      VALUES (NEW.id, NEW.provider_id, 'completed');
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO public.dispatch_job_events(request_id, provider_id, event)
      VALUES (NEW.id, NEW.provider_id, 'cancelled');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_log_status ON public.tow_requests;
CREATE TRIGGER trg_dispatch_log_status
  AFTER UPDATE OF status ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_log_status();
