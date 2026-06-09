ALTER TABLE public.provider_tow_rates
  ADD COLUMN IF NOT EXISTS dispatch_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispatch_regions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avg_response_sec integer,
  ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2);

ALTER TABLE public.tow_requests
  ADD COLUMN IF NOT EXISTS dispatch_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS dispatch_window_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS requested_provider_id uuid,
  ADD COLUMN IF NOT EXISTS matched_provider_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dispatch_expansions integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tow_requests_dispatch_status ON public.tow_requests(dispatch_status) WHERE dispatch_status IN ('matched','open');
CREATE INDEX IF NOT EXISTS idx_tow_requests_window ON public.tow_requests(dispatch_window_ends_at) WHERE dispatch_status='matched';
CREATE INDEX IF NOT EXISTS idx_tow_requests_matched_gin ON public.tow_requests USING GIN (matched_provider_ids);

CREATE TABLE IF NOT EXISTS public.dispatch_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_slug text NOT NULL,
  status text NOT NULL DEFAULT 'incomplete',
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_end timestamptz,
  environment text NOT NULL DEFAULT 'sandbox',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dispatch_sub_stripe ON public.dispatch_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dispatch_sub_user ON public.dispatch_subscriptions(user_id, environment);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_subscriptions TO authenticated;
GRANT ALL ON public.dispatch_subscriptions TO service_role;
ALTER TABLE public.dispatch_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own dispatch sub"
  ON public.dispatch_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners update own dispatch sub"
  ON public.dispatch_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_dispatch_sub_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_dispatch_sub_updated_at ON public.dispatch_subscriptions;
CREATE TRIGGER trg_dispatch_sub_updated_at
  BEFORE UPDATE ON public.dispatch_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_sub_updated_at();

CREATE OR REPLACE FUNCTION public.dispatch_plan_capacity(_plan text)
RETURNS TABLE(max_jobs integer, max_regions integer, priority integer)
LANGUAGE sql IMMUTABLE AS $$
  SELECT t.max_jobs, t.max_regions, t.priority FROM (VALUES
    ('dispatch_starter', 3, 1, 1),
    ('dispatch_pro', 10, 4, 2),
    ('dispatch_fleet', 999999, 99, 3)
  ) AS t(plan, max_jobs, max_regions, priority)
  WHERE t.plan = _plan
$$;

CREATE OR REPLACE FUNCTION public.get_active_dispatch_plan(_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT plan_slug FROM public.dispatch_subscriptions
  WHERE user_id = _user AND status IN ('active','trialing')
    AND (current_period_end IS NULL OR current_period_end > now())
  ORDER BY created_at DESC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.dispatch_match_providers(_request_id uuid, _take integer DEFAULT 5)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req RECORD; matches uuid[];
BEGIN
  SELECT pickup_region, pickup_province, pickup_city, matched_provider_ids
    INTO req FROM public.tow_requests WHERE id = _request_id;
  IF req IS NULL THEN RETURN '{}'::uuid[]; END IF;

  WITH eligible AS (
    SELECT
      ptr.user_id,
      ap.plan AS plan_slug,
      cap.priority AS tier_priority,
      cap.max_jobs,
      COALESCE(ptr.avg_rating, 0) AS rating,
      COALESCE(ptr.avg_response_sec, 999999) AS resp,
      b.city, b.province, b.region,
      (SELECT count(*) FROM public.tow_requests tr
         WHERE tr.provider_id = ptr.user_id
           AND tr.status IN ('assigned','in_progress','picked_up')) AS active_jobs
    FROM public.provider_tow_rates ptr
    JOIN LATERAL (SELECT public.get_active_dispatch_plan(ptr.user_id) AS plan) ap ON ap.plan IS NOT NULL
    LEFT JOIN LATERAL public.dispatch_plan_capacity(ap.plan) cap ON true
    LEFT JOIN public.businesses b ON b.owner_id = ptr.user_id AND b.type_slug='towing' AND b.status='active'
    WHERE ptr.dispatch_enabled = true
      AND (ap.plan = 'dispatch_fleet'
        OR req.pickup_region = ANY(ptr.dispatch_regions)
        OR (b.region IS NOT NULL AND b.region = req.pickup_region))
  )
  SELECT COALESCE(array_agg(user_id ORDER BY
    tier_priority DESC NULLS LAST,
    CASE WHEN city = req.pickup_city THEN 0
         WHEN province = req.pickup_province THEN 1
         WHEN region = req.pickup_region THEN 2 ELSE 3 END,
    rating DESC, resp ASC
  ), '{}'::uuid[]) INTO matches
  FROM eligible
  WHERE active_jobs < COALESCE(max_jobs, 999999)
    AND NOT (user_id = ANY(req.matched_provider_ids));

  RETURN matches[1:_take];
END $$;

CREATE OR REPLACE FUNCTION public.tg_dispatch_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.requested_provider_id IS NOT NULL THEN
    NEW.dispatch_status := 'direct';
    NEW.matched_provider_ids := ARRAY[NEW.requested_provider_id];
    NEW.dispatch_window_ends_at := now() + INTERVAL '15 minutes';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.tg_dispatch_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE picks uuid[];
BEGIN
  IF NEW.dispatch_status = 'direct' THEN RETURN NEW; END IF;
  picks := public.dispatch_match_providers(NEW.id, 5);
  UPDATE public.tow_requests
    SET matched_provider_ids = picks,
        dispatch_status = CASE WHEN array_length(picks,1) > 0 THEN 'matched' ELSE 'open' END,
        dispatch_window_ends_at = CASE WHEN array_length(picks,1) > 0 THEN now() + INTERVAL '5 minutes' ELSE NULL END
  WHERE id = NEW.id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_before_insert ON public.tow_requests;
CREATE TRIGGER trg_dispatch_before_insert BEFORE INSERT ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_before_insert();
DROP TRIGGER IF EXISTS trg_dispatch_after_insert ON public.tow_requests;
CREATE TRIGGER trg_dispatch_after_insert AFTER INSERT ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_after_insert();

CREATE OR REPLACE FUNCTION public.dispatch_expand_stale()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; picks uuid[]; n integer := 0;
BEGIN
  FOR r IN
    SELECT id, dispatch_expansions FROM public.tow_requests
    WHERE dispatch_status = 'matched' AND dispatch_window_ends_at < now() AND status = 'open'
  LOOP
    IF r.dispatch_expansions >= 3 THEN
      UPDATE public.tow_requests SET dispatch_status = 'expired', dispatch_window_ends_at = NULL WHERE id = r.id;
    ELSE
      picks := public.dispatch_match_providers(r.id, 5);
      UPDATE public.tow_requests
        SET matched_provider_ids = matched_provider_ids || picks,
            dispatch_status = CASE WHEN array_length(picks,1) > 0 THEN 'matched' ELSE 'open' END,
            dispatch_window_ends_at = CASE WHEN array_length(picks,1) > 0 THEN now() + INTERVAL '5 minutes' ELSE NULL END,
            dispatch_expansions = r.dispatch_expansions + 1
        WHERE id = r.id;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

DROP POLICY IF EXISTS "Requesters view own tow requests" ON public.tow_requests;
CREATE POLICY "Tow request visible to participants and matched providers"
  ON public.tow_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = requester_id OR auth.uid() = provider_id
    OR auth.uid() = ANY(matched_provider_ids)
    OR ((provider_id IS NULL) AND (status = 'open') AND is_towing_provider(auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Tow request participants update" ON public.tow_requests;
CREATE POLICY "Tow request participants update"
  ON public.tow_requests FOR UPDATE TO authenticated
  USING (
    auth.uid() = requester_id OR auth.uid() = provider_id
    OR auth.uid() = ANY(matched_provider_ids)
    OR ((provider_id IS NULL) AND (status = 'open') AND is_towing_provider(auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

ALTER TABLE public.tow_requests REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tow_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.subscription_plans (name, price_php, sort_order, active, stripe_lookup_key, features, max_photos_per_listing)
SELECT v.name, v.price_php, v.sort_order, v.active, v.stripe_lookup_key, v.features::jsonb, v.max_photos_per_listing
FROM (VALUES
  ('Dispatch Starter', 499.00::numeric, 10, true, 'dispatch_starter_monthly', '["Home region only","Up to 3 active jobs","Standard placement in dispatch queue"]', 0),
  ('Dispatch Pro', 1499.00::numeric, 11, true, 'dispatch_pro_monthly', '["Up to 4 regions","Up to 10 active jobs","High priority in dispatch queue"]', 0),
  ('Dispatch Fleet', 2999.00::numeric, 12, true, 'dispatch_fleet_monthly', '["Nationwide coverage","Unlimited active jobs","Top priority in dispatch queue","Featured badge"]', 0)
) AS v(name, price_php, sort_order, active, stripe_lookup_key, features, max_photos_per_listing)
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans p WHERE p.stripe_lookup_key = v.stripe_lookup_key);