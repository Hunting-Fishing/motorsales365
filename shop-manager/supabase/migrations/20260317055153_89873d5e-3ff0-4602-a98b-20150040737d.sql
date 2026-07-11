ALTER TABLE public.export_products
  ADD COLUMN IF NOT EXISTS bulk_purchase_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bulk_purchase_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS bulk_quantity numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bulk_quantity_unit text DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS bulk_qty_units integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bulk_item_type text DEFAULT 'bag';