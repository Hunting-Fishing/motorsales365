
-- Fan-out notifications for broadcast tow requests
CREATE OR REPLACE FUNCTION public.notify_towing_providers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  body text;
BEGIN
  -- Only fan out broadcast (no specific provider) open requests
  IF NEW.provider_id IS NOT NULL OR NEW.status <> 'open' THEN
    RETURN NEW;
  END IF;

  body := 'New tow request: ' || NEW.vehicle_summary
    || E'\nFrom ' || COALESCE(NEW.pickup_city, NEW.pickup_region, '?')
    || ' to ' || COALESCE(NEW.dropoff_city, NEW.dropoff_region, '?')
    || CASE WHEN NEW.needed_at IS NOT NULL THEN E'\nNeeded by ' || NEW.needed_at::text ELSE '' END
    || CASE WHEN NEW.notes IS NOT NULL THEN E'\n\n' || NEW.notes ELSE '' END;

  -- For each active towing listing whose owner covers the pickup region,
  -- pick the most recent listing per provider and notify them.
  FOR rec IN
    SELECT DISTINCT ON (l.user_id) l.id, l.user_id
    FROM public.listings l
    WHERE l.category_slug = 'towing'
      AND l.status IN ('active', 'pending_sale')
      AND l.user_id <> NEW.requester_id
      AND (
        NEW.pickup_region IS NULL
        OR l.region IS NULL
        OR l.region = NEW.pickup_region
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(
            COALESCE(l.attributes->'coverage_regions', '[]'::jsonb)
          ) AS cr(region)
          WHERE cr.region = NEW.pickup_region
        )
      )
    ORDER BY l.user_id, l.created_at DESC
  LOOP
    INSERT INTO public.messages (listing_id, sender_id, recipient_id, body)
    VALUES (rec.id, NEW.requester_id, rec.user_id, body);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_notify_towing_providers ON public.tow_requests;
CREATE TRIGGER tg_notify_towing_providers
AFTER INSERT ON public.tow_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_towing_providers();

-- Realtime updates so the provider dashboard sees changes live
ALTER TABLE public.tow_requests REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tow_requests'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tow_requests';
  END IF;
END $$;
