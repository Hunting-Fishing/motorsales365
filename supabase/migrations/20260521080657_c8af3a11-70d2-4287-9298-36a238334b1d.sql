-- 1) Free-text brands carried on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS brands_carried text;

-- 2) Seed business_tags for parts_accessories and inventory-type across service providers.
-- Idempotent: ON CONFLICT (slug) DO NOTHING so re-runs are safe.

INSERT INTO public.business_tags (slug, label, type_slug, category, sort_order, is_popular) VALUES
  -- Parts sold
  ('parts-tires',           'Tires',                 'parts_accessories', 'parts_sold', 10, true),
  ('parts-wheels',          'Wheels & rims',         'parts_accessories', 'parts_sold', 20, true),
  ('parts-batteries',       'Batteries',             'parts_accessories', 'parts_sold', 30, true),
  ('parts-brake-pads',      'Brake pads & rotors',   'parts_accessories', 'parts_sold', 40, true),
  ('parts-filters',         'Filters',               'parts_accessories', 'parts_sold', 50, true),
  ('parts-belts-hoses',     'Belts & hoses',         'parts_accessories', 'parts_sold', 60, false),
  ('parts-lights',          'Lights & bulbs',        'parts_accessories', 'parts_sold', 70, true),
  ('parts-spark-plugs',     'Spark plugs',           'parts_accessories', 'parts_sold', 80, false),
  ('parts-fluids-oils',     'Fluids & oils',         'parts_accessories', 'parts_sold', 90, true),
  ('parts-body-panels',     'Body panels',           'parts_accessories', 'parts_sold', 100, false),
  ('parts-glass',           'Glass',                 'parts_accessories', 'parts_sold', 110, false),
  ('parts-mirrors',         'Mirrors',               'parts_accessories', 'parts_sold', 120, false),
  ('parts-bumpers',         'Bumpers',               'parts_accessories', 'parts_sold', 130, false),
  ('parts-engines',         'Engines',               'parts_accessories', 'parts_sold', 140, false),
  ('parts-transmissions',   'Transmissions',         'parts_accessories', 'parts_sold', 150, false),
  ('parts-suspension',      'Suspension parts',      'parts_accessories', 'parts_sold', 160, false),
  ('parts-exhaust',         'Exhaust',               'parts_accessories', 'parts_sold', 170, false),
  ('parts-electrical',      'Electrical parts',      'parts_accessories', 'parts_sold', 180, false),
  ('parts-interior-trim',   'Interior trim',         'parts_accessories', 'parts_sold', 190, false),
  ('parts-heavy-duty',      'Heavy duty parts',      'parts_accessories', 'parts_sold', 200, false),
  ('parts-performance',     'Performance parts',     'parts_accessories', 'parts_sold', 210, false),
  ('parts-audio-electronics','Audio & electronics',  'parts_accessories', 'parts_sold', 220, false),
  ('parts-accessories-misc','Accessories',           'parts_accessories', 'parts_sold', 230, false),

  -- Vehicle scope for parts shops
  ('parts-scope-cars',          'Cars',           'parts_accessories', 'vehicle_scope', 10, true),
  ('parts-scope-motorcycles',   'Motorcycles',    'parts_accessories', 'vehicle_scope', 20, true),
  ('parts-scope-trucks',        'Trucks',         'parts_accessories', 'vehicle_scope', 30, false),
  ('parts-scope-suvs',          'SUVs',           'parts_accessories', 'vehicle_scope', 40, false),
  ('parts-scope-vans',          'Vans',           'parts_accessories', 'vehicle_scope', 50, false),
  ('parts-scope-heavy-duty',    'Heavy duty / Commercial', 'parts_accessories', 'vehicle_scope', 60, false),
  ('parts-scope-diesel',        'Diesel',         'parts_accessories', 'vehicle_scope', 70, false),
  ('parts-scope-ev-hybrid',     'EV / Hybrid',    'parts_accessories', 'vehicle_scope', 80, false),
  ('parts-scope-boats',         'Boats',          'parts_accessories', 'vehicle_scope', 90, false),
  ('parts-scope-heavy-equipment','Heavy equipment','parts_accessories', 'vehicle_scope', 100, false),

  -- Inventory type — parts_accessories
  ('inv-parts-new',         'Brand new',          'parts_accessories', 'inventory_type', 10, true),
  ('inv-parts-used',        'Pre-owned / used',   'parts_accessories', 'inventory_type', 20, true),
  ('inv-parts-oem',         'OEM',                'parts_accessories', 'inventory_type', 30, true),
  ('inv-parts-aftermarket', 'Aftermarket',        'parts_accessories', 'inventory_type', 40, true),
  ('inv-parts-rebuilt',     'Rebuilt',            'parts_accessories', 'inventory_type', 50, false),
  ('inv-parts-performance', 'Performance',        'parts_accessories', 'inventory_type', 60, false),

  -- Inventory type — repair_shop (uses OEM/aftermarket parts)
  ('inv-repair-oem',         'Uses OEM parts',         'repair_shop', 'inventory_type', 10, true),
  ('inv-repair-aftermarket', 'Uses aftermarket parts', 'repair_shop', 'inventory_type', 20, true),
  ('inv-repair-rebuilt',     'Uses rebuilt parts',     'repair_shop', 'inventory_type', 30, false),

  -- Inventory type — body_paint
  ('inv-body-oem',         'OEM panels',         'body_paint', 'inventory_type', 10, false),
  ('inv-body-aftermarket', 'Aftermarket panels', 'body_paint', 'inventory_type', 20, false),

  -- Inventory type — salvage
  ('inv-salvage-used-parts','Used parts',         'salvage', 'inventory_type', 10, true),
  ('inv-salvage-cores',     'Cores',              'salvage', 'inventory_type', 20, false),
  ('inv-salvage-whole',     'Whole vehicles',     'salvage', 'inventory_type', 30, false)
ON CONFLICT (slug) DO NOTHING;
