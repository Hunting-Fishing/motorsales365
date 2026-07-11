-- Insert water_delivery module into business_modules table
INSERT INTO public.business_modules (
  slug,
  name,
  description,
  icon,
  category,
  is_premium,
  default_enabled,
  display_order,
  monthly_price
) VALUES (
  'water_delivery',
  'Water Delivery',
  'Water delivery management, tank monitoring, route optimization, and delivery scheduling',
  'droplet',
  'logistics',
  true,
  false,
  101,
  0.00
) ON CONFLICT (slug) DO NOTHING;