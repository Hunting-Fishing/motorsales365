
ALTER TABLE public.business_inventory_items
  ADD COLUMN IF NOT EXISTS brand text;

GRANT SELECT (brand) ON public.business_inventory_items TO anon, authenticated;

CREATE INDEX IF NOT EXISTS business_inv_category_lower_idx
  ON public.business_inventory_items (lower(category)) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS business_inv_brand_lower_idx
  ON public.business_inventory_items (lower(brand)) WHERE brand IS NOT NULL;

DROP VIEW IF EXISTS public.network_stock;
CREATE VIEW public.network_stock
WITH (security_invoker = on) AS
SELECT
  i.id, i.business_id, i.sku, i.name, i.category, i.brand, i.unit,
  i.qty_on_hand,
  GREATEST(i.qty_on_hand - public.active_reservation_qty(i.id), 0) AS available_qty,
  public.active_reservation_qty(i.id) AS reserved_qty,
  i.price, i.catalog_part_id, i.updated_at,
  b.name AS business_name, b.slug AS business_slug,
  b.city, b.province, b.region, b.lat, b.lng,
  c.compatible_makes,
  c.compatible_models,
  c.year_min,
  c.year_max
FROM public.business_inventory_items i
JOIN public.businesses b ON b.id = i.business_id
LEFT JOIN public.parts_catalog c ON c.id = i.catalog_part_id
WHERE i.active
  AND i.network_visible
  AND b.expose_inventory_to_network
  AND b.network_exposure_status = 'approved'
  AND b.status = 'active';

GRANT SELECT ON public.network_stock TO anon, authenticated;
