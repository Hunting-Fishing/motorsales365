-- Make the business_tags seed bullet-proof against the type_slug FK.
-- 1. Ensure every business_type referenced by tags actually exists.
INSERT INTO public.business_types (slug, label, sort_order) VALUES
  ('dealership','Dealerships',10),
  ('repair_shop','Repair & service shops',20),
  ('parts_accessories','Parts & accessories',30),
  ('towing','Towing & roadside',40),
  ('insurance','Insurance',50),
  ('body_paint','Body & paint shop',25),
  ('carwash','Car wash & detailing',35),
  ('salvage','Salvage / pick-a-part',45)
ON CONFLICT (slug) DO NOTHING;

-- 2. Clean up any orphan tag rows that point at a missing type
--    (defensive — there shouldn't be any, but this guarantees the FK is satisfied).
DELETE FROM public.business_tags t
WHERE t.type_slug IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.business_types bt WHERE bt.slug = t.type_slug);