
-- Insert septic module into business_modules
INSERT INTO public.business_modules (name, slug, description, icon, category, is_premium, default_enabled, display_order)
VALUES (
  'Septic Services',
  'septic',
  'Septic pumping, inspections, tank management, compliance tracking, and route optimization',
  'container',
  'logistics',
  true,
  false,
  102
)
ON CONFLICT DO NOTHING;
