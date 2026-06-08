-- Add body-repair tag and promote the 7 core repair service categories to "popular"
-- so they surface as quick-filter chips on submit and browse for repair shops.
INSERT INTO public.business_tags (slug, label, type_slug, is_popular, sort_order)
VALUES ('body-repair', 'Body repair', 'repair_shop', true, 55)
ON CONFLICT (slug) DO UPDATE SET is_popular = EXCLUDED.is_popular, sort_order = EXCLUDED.sort_order;

UPDATE public.business_tags
SET is_popular = true
WHERE slug IN (
  'tire-mount-balance',     -- Tires
  'brake-service',          -- Brakes
  'suspension-service',     -- Suspension
  'engine-overhaul',        -- Engine
  'at-mt-repair',           -- Transmission
  'obd-diagnostics',        -- Diagnostics
  'body-repair'             -- Body repair
);