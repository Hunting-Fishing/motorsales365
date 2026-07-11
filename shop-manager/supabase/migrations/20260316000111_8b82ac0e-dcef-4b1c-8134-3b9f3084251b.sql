INSERT INTO public.business_modules (slug, name, description, icon, category)
VALUES (
  'export-company',
  'Export Company',
  'International trade, export/import operations, logistics, and compliance management',
  'Ship',
  'Logistics & Trade'
) ON CONFLICT (slug) DO NOTHING;