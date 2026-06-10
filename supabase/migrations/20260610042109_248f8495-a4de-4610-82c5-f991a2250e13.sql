
-- Add Truck & Equipment department + top-level category (only missing item)
INSERT INTO public.shop_departments (slug, name, sort_order, active)
VALUES ('truck-equipment', 'Truck & Equipment', 90, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.shop_categories (slug, name, description, sort_order, active, department_slug)
VALUES (
  'truck-equipment',
  'Truck & Equipment',
  'Work lights, tow straps, ratchet straps, grease guns and heavy-duty gear for trucks and equipment.',
  90,
  true,
  'truck-equipment'
)
ON CONFLICT (slug) DO NOTHING;
