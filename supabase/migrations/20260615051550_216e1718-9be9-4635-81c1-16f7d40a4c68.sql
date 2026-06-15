
-- Update dispatch plan capacity to new tiers (Solo / Team / Unlimited)
-- and keep legacy slugs as aliases so old subscription rows still match.
CREATE OR REPLACE FUNCTION public.dispatch_plan_capacity(_plan text)
RETURNS TABLE(max_jobs integer, max_regions integer, priority integer)
LANGUAGE sql IMMUTABLE AS $$
  SELECT t.max_jobs, t.max_regions, t.priority FROM (VALUES
    -- new
    ('dispatch_solo',       3,      1,  1),
    ('dispatch_team',       10,     3,  2),
    ('dispatch_unlimited',  999999, 99, 3),
    -- legacy aliases (any old rows still resolve)
    ('dispatch_starter',    3,      1,  1),
    ('dispatch_pro',        10,     3,  2),
    ('dispatch_fleet',      999999, 99, 3)
  ) AS t(plan, max_jobs, max_regions, priority)
  WHERE t.plan = _plan
$$;

-- Match function: treat unlimited (and legacy fleet) as nationwide
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
      AND (ap.plan IN ('dispatch_unlimited','dispatch_fleet')
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

-- Update subscription_plans entries for new dispatch tiers
UPDATE public.subscription_plans
   SET name='Dispatch Solo', price_php=250.00, stripe_lookup_key='dispatch_solo_monthly',
       features='["1 driver seat","1 service region","Up to 3 active jobs","Dispatch inbox (web + PWA)","Email + in-app alerts"]'::jsonb
 WHERE stripe_lookup_key='dispatch_starter_monthly';

UPDATE public.subscription_plans
   SET name='Dispatch Team', price_php=500.00, stripe_lookup_key='dispatch_team_monthly',
       features='["Up to 5 drivers","Up to 3 service regions","Up to 10 active jobs","Priority placement in dispatch queue","SMS + push job alerts","Auto-route to nearest driver"]'::jsonb
 WHERE stripe_lookup_key='dispatch_pro_monthly';

UPDATE public.subscription_plans
   SET name='Dispatch Unlimited', price_php=1000.00, stripe_lookup_key='dispatch_unlimited_monthly',
       features='["Unlimited drivers","Nationwide coverage","Unlimited active jobs","Top priority in dispatch queue","Live GPS tracking","White-label tracking link","API + webhooks"]'::jsonb
 WHERE stripe_lookup_key='dispatch_fleet_monthly';
