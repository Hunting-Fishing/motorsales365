ALTER TABLE public.export_products
  ADD COLUMN IF NOT EXISTS packaging_source_country text,
  ADD COLUMN IF NOT EXISTS packaging_supplier_name text;