ALTER TABLE public.shop_product_fitment
  ADD COLUMN IF NOT EXISTS transmission text;

CREATE INDEX IF NOT EXISTS idx_fitment_transmission
  ON public.shop_product_fitment (transmission)
  WHERE transmission IS NOT NULL;

WITH parent AS (SELECT id FROM public.shop_categories WHERE slug = 'hand-tools')
INSERT INTO public.shop_categories (slug, name, description, parent_id, sort_order, active, department_slug)
SELECT v.slug, v.name, v.description, parent.id, v.sort_order, true, 'tools-garage'
FROM parent, (VALUES
  ('hand-tools-general',       'General Hand Tools',           'Wrenches, sockets, screwdrivers, pliers, hammers and everyday mechanic basics.', 10),
  ('hand-tools-engine',        'Engine Tools',                 'Timing tools, valve spring compressors, piston ring tools, cylinder hones, compression testers.', 20),
  ('hand-tools-transmission',  'Transmission Tools',           'Clutch alignment kits, snap-ring pliers, bearing pullers, transmission jacks and gearbox specialty tools.', 30),
  ('hand-tools-drivetrain',    'Drivetrain & Axle Tools',      'CV joint tools, axle-nut sockets, differential tools, U-joint presses.', 40),
  ('hand-tools-hvac',          'Heat & A/C Tools',             'Refrigerant manifold gauges, vacuum pumps, leak detectors, flaring & swaging tools.', 50),
  ('hand-tools-brakes',        'Brake & Suspension Tools',     'Brake bleeders, caliper wind-back tools, ball-joint separators, spring compressors.', 60),
  ('hand-tools-electrical',    'Electrical & Diagnostic Hand Tools', 'Multimeters, test lights, wire strippers, crimpers, soldering.', 70),
  ('hand-tools-body',          'Body & Trim Tools',            'Trim removers, panel pullers, dent pullers, plastic pry tools.', 80),
  ('hand-tools-specialty',     'Specialty / OEM Tools',        'Manufacturer-specific service tools — Toyota SST, Honda, BMW, Ford, etc.', 90)
) AS v(slug, name, description, sort_order)
ON CONFLICT (slug) DO NOTHING;
