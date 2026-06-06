
INSERT INTO public.business_tags (type_slug, category, slug, label) VALUES
  ('tire_shop', 'tires', 'tire-vulcanizing', 'Vulcanizing'),
  ('tire_shop', 'tires', 'tire-repair-patch', 'Tire repair / patch'),
  ('tire_shop', 'tires', 'tire-mount-balance-ts', 'Mount & balance'),
  ('tire_shop', 'tires', 'tire-rotation', 'Tire rotation'),
  ('tire_shop', 'tires', 'tire-pressure-check', 'Pressure check / inflation'),
  ('tire_shop', 'tires', 'tire-nitrogen', 'Nitrogen fill'),
  ('tire_shop', 'tires', 'tire-tubeless-conversion', 'Tubeless conversion'),
  ('tire_shop', 'tires', 'tire-flat-roadside', 'Flat tire roadside'),
  ('tire_shop', 'tires', 'tire-recap-retread', 'Recap / retread'),
  ('tire_shop', 'wheels', 'ts-alignment', 'Wheel alignment'),
  ('tire_shop', 'wheels', 'ts-wheel-balancing', 'Wheel balancing'),
  ('tire_shop', 'wheels', 'ts-tpms', 'TPMS service'),
  ('tire_shop', 'wheels', 'mag-wheel-repair', 'Mag / rim repair'),
  ('tire_shop', 'wheels', 'hubcap-replacement', 'Hubcap replacement'),
  ('tire_shop', 'inventory_type', 'inv-tire-new', 'New tires'),
  ('tire_shop', 'inventory_type', 'inv-tire-used', 'Used tires'),
  ('tire_shop', 'inventory_type', 'inv-tire-mags', 'Mag wheels / rims'),
  ('tire_shop', 'inventory_type', 'inv-tire-tubes', 'Inner tubes'),
  ('tire_shop', 'inventory_type', 'inv-tire-batteries', 'Batteries'),
  ('tire_shop', 'brand', 'tirebrand-bridgestone', 'Bridgestone'),
  ('tire_shop', 'brand', 'tirebrand-michelin', 'Michelin'),
  ('tire_shop', 'brand', 'tirebrand-yokohama', 'Yokohama'),
  ('tire_shop', 'brand', 'tirebrand-dunlop', 'Dunlop'),
  ('tire_shop', 'brand', 'tirebrand-bf-goodrich', 'BFGoodrich'),
  ('tire_shop', 'brand', 'tirebrand-goodyear', 'Goodyear'),
  ('tire_shop', 'brand', 'tirebrand-toyo', 'Toyo'),
  ('tire_shop', 'brand', 'tirebrand-maxxis', 'Maxxis'),
  ('tire_shop', 'brand', 'tirebrand-gt-radial', 'GT Radial'),
  ('tire_shop', 'brand', 'tirebrand-westlake', 'Westlake'),
  ('tire_shop', 'vehicle_scope', 'tire-scope-cars', 'Cars'),
  ('tire_shop', 'vehicle_scope', 'tire-scope-suvs', 'SUVs'),
  ('tire_shop', 'vehicle_scope', 'tire-scope-trucks', 'Trucks'),
  ('tire_shop', 'vehicle_scope', 'tire-scope-vans', 'Vans'),
  ('tire_shop', 'vehicle_scope', 'tire-scope-motorcycles', 'Motorcycles'),
  ('tire_shop', 'vehicle_scope', 'tire-scope-heavy-duty', 'Heavy duty / commercial'),
  ('tire_shop', 'mobile', 'tire-mobile-service', 'Mobile tire service'),
  ('tire_shop', 'mobile', 'tire-24-7', '24/7 vulcanizing'),
  ('repair_shop', 'tires', 'rs-tire-vulcanizing', 'Vulcanizing'),
  ('repair_shop', 'tires', 'rs-tire-repair-patch', 'Tire repair / patch'),
  ('repair_shop', 'tires', 'rs-tire-rotation', 'Tire rotation')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.business_tags (type_slug, category, slug, label)
SELECT 'used_dealership', category, 'used-' || slug, label
FROM public.business_tags
WHERE type_slug = 'dealership' AND category IS NOT NULL
ON CONFLICT (slug) DO NOTHING;
