
-- Create pt_gym_events table
CREATE TABLE public.pt_gym_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  event_type text NOT NULL DEFAULT 'event',
  location text,
  color text,
  max_signups int,
  current_signups int DEFAULT 0,
  is_recurring boolean DEFAULT false,
  recurrence_rule text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pt_event_signups table
CREATE TABLE public.pt_event_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.pt_gym_events(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  signed_up_at timestamptz DEFAULT now(),
  status text DEFAULT 'confirmed',
  UNIQUE(event_id, client_id)
);

-- Enable RLS
ALTER TABLE public.pt_gym_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_event_signups ENABLE ROW LEVEL SECURITY;

-- RLS for pt_gym_events
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_gym_events_select' AND tablename = 'pt_gym_events') THEN
    CREATE POLICY pt_gym_events_select ON public.pt_gym_events FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_gym_events_insert' AND tablename = 'pt_gym_events') THEN
    CREATE POLICY pt_gym_events_insert ON public.pt_gym_events FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_gym_events_update' AND tablename = 'pt_gym_events') THEN
    CREATE POLICY pt_gym_events_update ON public.pt_gym_events FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_gym_events_delete' AND tablename = 'pt_gym_events') THEN
    CREATE POLICY pt_gym_events_delete ON public.pt_gym_events FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- RLS for pt_event_signups (scoped via event's shop_id)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_event_signups_select' AND tablename = 'pt_event_signups') THEN
    CREATE POLICY pt_event_signups_select ON public.pt_event_signups FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pt_gym_events e WHERE e.id = event_id AND e.shop_id = public.get_current_user_shop_id()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_event_signups_insert' AND tablename = 'pt_event_signups') THEN
    CREATE POLICY pt_event_signups_insert ON public.pt_event_signups FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pt_gym_events e WHERE e.id = event_id AND e.shop_id = public.get_current_user_shop_id()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_event_signups_delete' AND tablename = 'pt_event_signups') THEN
    CREATE POLICY pt_event_signups_delete ON public.pt_event_signups FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pt_gym_events e WHERE e.id = event_id AND e.shop_id = public.get_current_user_shop_id()));
  END IF;
END $$;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_pt_gym_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pt_gym_events_updated_at ON public.pt_gym_events;
CREATE TRIGGER trg_pt_gym_events_updated_at
  BEFORE UPDATE ON public.pt_gym_events
  FOR EACH ROW EXECUTE FUNCTION public.update_pt_gym_events_updated_at();
