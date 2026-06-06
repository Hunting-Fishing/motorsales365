
-- 1) Migrate existing business_plans rows off enum values we're collapsing
UPDATE public.business_plans SET business_kind = 'transport' WHERE business_kind = 'trucking';

-- 2) Rename enum values (1:1) to canonical slugs
ALTER TYPE public.business_kind RENAME VALUE 'dealer' TO 'dealership';
ALTER TYPE public.business_kind RENAME VALUE 'parts_shop' TO 'parts_accessories';
ALTER TYPE public.business_kind RENAME VALUE 'body_shop' TO 'body_paint';

-- 3) Add missing canonical values
ALTER TYPE public.business_kind ADD VALUE IF NOT EXISTS 'motorcycle_shop';

-- 4) Expand business_types to cover every 365 field; relabel parts_accessories
UPDATE public.business_types SET label = 'Parts supplier / shop' WHERE slug = 'parts_accessories';

INSERT INTO public.business_types (slug, label, icon, sort_order) VALUES
  ('rental',         'Vehicle rental',              'Car',         11),
  ('battery_shop',   'Battery shop',                NULL,          33),
  ('accessories',    'Accessories / customization', NULL,          55),
  ('audio_tint',     'Audio & window tint',         NULL,          56),
  ('inspection',     'Inspection / emissions',      NULL,          60),
  ('driving_school', 'Driving school',              NULL,          65),
  ('lto_services',   'LTO / registration services', NULL,          70),
  ('financing',      'Financing / loans',           NULL,          75),
  ('transport',      'Transport / logistics',       'Truck',       80),
  ('corporate',      'Corporate / fleet',           NULL,          85),
  ('other',          'Other',                       NULL,          99)
ON CONFLICT (slug) DO NOTHING;
