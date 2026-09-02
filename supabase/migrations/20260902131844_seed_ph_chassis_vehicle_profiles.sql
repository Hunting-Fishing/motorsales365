-- Promote the existing curated Asian/JDM chassis-code reference into the
-- canonical PH vehicle-profile layer. This creates vehicle identities only;
-- it deliberately does not claim that any part fits a vehicle.

INSERT INTO public.parts_vehicle_profiles (
  country_code,
  make,
  model,
  year_min,
  year_max,
  engine_code,
  chassis_code,
  market_code,
  source,
  source_reference,
  status,
  attributes
)
SELECT
  'PH',
  j.make,
  j.model,
  j.year_min,
  j.year_max,
  NULLIF(btrim(j.engine), ''),
  upper(j.code),
  'PH-JDM',
  '365_jdm_chassis_codes',
  'jdm_chassis_codes:' || upper(j.code),
  'approved',
  jsonb_strip_nulls(jsonb_build_object('notes', j.notes))
FROM public.jdm_chassis_codes j
WHERE NOT EXISTS (
  SELECT 1
  FROM public.parts_vehicle_profiles v
  WHERE v.country_code = 'PH'
    AND lower(v.make) = lower(j.make)
    AND lower(v.model) = lower(j.model)
    AND upper(COALESCE(v.chassis_code, '')) = upper(j.code)
    AND COALESCE(v.year_min, 0) = COALESCE(j.year_min, 0)
    AND COALESCE(v.year_max, 9999) = COALESCE(j.year_max, 9999)
);
