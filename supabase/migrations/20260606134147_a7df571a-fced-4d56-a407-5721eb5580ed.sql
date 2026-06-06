
CREATE TABLE public.business_discovery_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  city text,
  region text,
  place_type text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  last_found_count integer NOT NULL DEFAULT 0,
  last_new_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_discovery_searches TO authenticated;
GRANT ALL ON public.business_discovery_searches TO service_role;

ALTER TABLE public.business_discovery_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view discovery searches"
  ON public.business_discovery_searches FOR SELECT
  TO authenticated
  USING (public.can_moderate(auth.uid()));

CREATE POLICY "Staff can manage discovery searches"
  ON public.business_discovery_searches FOR ALL
  TO authenticated
  USING (public.can_moderate(auth.uid()))
  WITH CHECK (public.can_moderate(auth.uid()));

CREATE TRIGGER trg_business_discovery_searches_updated_at
  BEFORE UPDATE ON public.business_discovery_searches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.business_discovery_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'google_places',
  external_id text NOT NULL,
  name text NOT NULL,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  website text,
  rating numeric,
  rating_count integer,
  types text[] NOT NULL DEFAULT '{}',
  our_type text,
  photo_name text,
  region text,
  city text,
  search_id uuid REFERENCES public.business_discovery_searches(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','imported','dismissed')),
  existing_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  diff jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);

CREATE INDEX idx_business_discovery_queue_status ON public.business_discovery_queue (status, last_seen_at DESC);
CREATE INDEX idx_business_discovery_queue_search ON public.business_discovery_queue (search_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_discovery_queue TO authenticated;
GRANT ALL ON public.business_discovery_queue TO service_role;

ALTER TABLE public.business_discovery_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view discovery queue"
  ON public.business_discovery_queue FOR SELECT
  TO authenticated
  USING (public.can_moderate(auth.uid()));

CREATE POLICY "Staff can manage discovery queue"
  ON public.business_discovery_queue FOR ALL
  TO authenticated
  USING (public.can_moderate(auth.uid()))
  WITH CHECK (public.can_moderate(auth.uid()));

CREATE TRIGGER trg_business_discovery_queue_updated_at
  BEFORE UPDATE ON public.business_discovery_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
