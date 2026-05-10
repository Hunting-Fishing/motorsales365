
-- Add "free" to listing_plan enum
ALTER TYPE listing_plan ADD VALUE IF NOT EXISTS 'free' BEFORE 'standard';

-- Insert Free subscription plan
INSERT INTO public.subscription_plans (name, price_php, listings_per_month, features, sort_order, active)
VALUES (
  'Free',
  0,
  4,
  '["1 listing per week","1 photo per listing","No video","Community support"]'::jsonb,
  0,
  true
)
ON CONFLICT DO NOTHING;

-- Function: check if user has any active paid subscription
CREATE OR REPLACE FUNCTION public.user_has_paid_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE s.user_id = _user_id
      AND s.status = 'active'
      AND p.price_php > 0
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  )
$$;

-- Trigger: enforce 1 free listing per rolling 7 days
CREATE OR REPLACE FUNCTION public.enforce_free_listing_quota()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  -- Only enforce on free plan listings
  IF NEW.plan IS DISTINCT FROM 'free'::listing_plan THEN
    RETURN NEW;
  END IF;

  -- Users with paid subscription bypass the weekly cap
  IF public.user_has_paid_subscription(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO recent_count
  FROM public.listings
  WHERE user_id = NEW.user_id
    AND plan = 'free'::listing_plan
    AND created_at > now() - interval '7 days'
    AND id <> NEW.id;

  IF recent_count >= 1 THEN
    RAISE EXCEPTION 'Free plan is limited to 1 listing per week. Please wait or upgrade your plan.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_listing_quota ON public.listings;
CREATE TRIGGER trg_enforce_free_listing_quota
BEFORE INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_free_listing_quota();
