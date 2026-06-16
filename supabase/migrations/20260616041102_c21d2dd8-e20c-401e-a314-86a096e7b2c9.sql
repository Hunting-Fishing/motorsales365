
ALTER TABLE public.business_plans
  ADD COLUMN IF NOT EXISTS limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.business_subscriptions
  ADD COLUMN IF NOT EXISTS auto_upgrade boolean NOT NULL DEFAULT false;

-- Seed sensible defaults per tier. Existing rows only.
UPDATE public.business_plans
SET limits = CASE tier
  WHEN 'listed'   THEN '{"staff":3,  "assets":3,  "listings":10, "inventory_skus":50,  "tow_jobs_month":50,  "storage_mb":250}'::jsonb
  WHEN 'featured' THEN '{"staff":10, "assets":10, "listings":50, "inventory_skus":250, "tow_jobs_month":250, "storage_mb":1000}'::jsonb
  WHEN 'premium'  THEN '{"staff":50, "assets":50, "listings":500,"inventory_skus":2000,"tow_jobs_month":2000,"storage_mb":10000}'::jsonb
  ELSE limits
END
WHERE limits = '{}'::jsonb OR limits IS NULL;

UPDATE public.business_plans
SET features = CASE tier
  WHEN 'listed'   THEN '{"dispatch":true, "analytics":false, "auto_upgrade":false}'::jsonb
  WHEN 'featured' THEN '{"dispatch":true, "analytics":true,  "auto_upgrade":true}'::jsonb
  WHEN 'premium'  THEN '{"dispatch":true, "analytics":true,  "auto_upgrade":true, "priority_support":true}'::jsonb
  ELSE features
END
WHERE features = '{}'::jsonb OR features IS NULL;
