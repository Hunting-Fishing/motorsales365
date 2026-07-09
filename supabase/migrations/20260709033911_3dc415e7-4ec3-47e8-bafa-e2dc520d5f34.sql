
ALTER TABLE public.network_part_inquiries
  ADD COLUMN IF NOT EXISTS reserved_quantity numeric(12,2),
  ADD COLUMN IF NOT EXISTS reserved_until timestamptz,
  ADD COLUMN IF NOT EXISTS reserved_item_id uuid REFERENCES public.business_inventory_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS npi_active_reservation_idx
  ON public.network_part_inquiries (reserved_item_id, reserved_until)
  WHERE reserved_item_id IS NOT NULL
    AND reserved_until IS NOT NULL
    AND status = 'accepted';

-- Sum of live holds for a given inventory item
CREATE OR REPLACE FUNCTION public.active_reservation_qty(_item_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(reserved_quantity), 0)::numeric
  FROM public.network_part_inquiries
  WHERE reserved_item_id = _item_id
    AND status = 'accepted'
    AND reserved_until IS NOT NULL
    AND reserved_until > now();
$$;

GRANT EXECUTE ON FUNCTION public.active_reservation_qty(uuid) TO anon, authenticated;

-- Rebuild public feed to expose available_qty (on-hand minus live holds)
DROP VIEW IF EXISTS public.network_stock;
CREATE VIEW public.network_stock
WITH (security_invoker = on) AS
SELECT
  i.id, i.business_id, i.sku, i.name, i.category, i.unit,
  i.qty_on_hand,
  GREATEST(i.qty_on_hand - public.active_reservation_qty(i.id), 0) AS available_qty,
  public.active_reservation_qty(i.id) AS reserved_qty,
  i.price, i.catalog_part_id, i.updated_at,
  b.name AS business_name, b.slug AS business_slug,
  b.city, b.province, b.region, b.lat, b.lng
FROM public.business_inventory_items i
JOIN public.businesses b ON b.id = i.business_id
WHERE i.active
  AND i.network_visible
  AND b.expose_inventory_to_network
  AND b.network_exposure_status = 'approved'
  AND b.status = 'active';

GRANT SELECT ON public.network_stock TO anon, authenticated;

-- Manager-only RPC to reserve stock for a specific inquiry
CREATE OR REPLACE FUNCTION public.reserve_network_inquiry(
  _inquiry_id uuid,
  _business_id uuid,
  _quantity numeric,
  _hours integer,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inq record;
  item record;
  other_reserved numeric;
  hold_until timestamptz;
BEGIN
  IF NOT public.has_business_role(auth.uid(), _business_id, 'manager'::business_staff_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _quantity IS NULL OR _quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  IF _hours IS NULL OR _hours <= 0 OR _hours > 168 THEN
    RAISE EXCEPTION 'Hold window must be between 1 and 168 hours';
  END IF;

  SELECT * INTO inq
  FROM public.network_part_inquiries
  WHERE id = _inquiry_id AND business_id = _business_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inquiry not found';
  END IF;

  IF inq.item_id IS NULL THEN
    RAISE EXCEPTION 'Inquiry is not linked to a specific stock item';
  END IF;

  SELECT id, qty_on_hand INTO item
  FROM public.business_inventory_items
  WHERE id = inq.item_id AND business_id = _business_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  -- Sum other active holds on this item excluding the current inquiry
  SELECT COALESCE(SUM(reserved_quantity), 0)::numeric INTO other_reserved
  FROM public.network_part_inquiries
  WHERE reserved_item_id = item.id
    AND id <> _inquiry_id
    AND status = 'accepted'
    AND reserved_until IS NOT NULL
    AND reserved_until > now();

  IF _quantity > (item.qty_on_hand - other_reserved) THEN
    RAISE EXCEPTION 'Only % available after existing holds', (item.qty_on_hand - other_reserved);
  END IF;

  hold_until := now() + make_interval(hours => _hours);

  UPDATE public.network_part_inquiries
     SET status = 'accepted',
         reserved_item_id = item.id,
         reserved_quantity = _quantity,
         reserved_until = hold_until,
         response_note = COALESCE(_note, response_note),
         responded_at = now(),
         responded_by = auth.uid()
   WHERE id = _inquiry_id;

  RETURN jsonb_build_object(
    'reserved_quantity', _quantity,
    'reserved_until', hold_until
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_network_inquiry(uuid, uuid, numeric, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_network_inquiry(uuid, uuid, numeric, integer, text) TO authenticated;

-- Release helper: clear reservation fields (used when status leaves 'accepted')
CREATE OR REPLACE FUNCTION public.release_network_inquiry(
  _inquiry_id uuid,
  _business_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_business_role(auth.uid(), _business_id, 'manager'::business_staff_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.network_part_inquiries
     SET reserved_quantity = NULL,
         reserved_until = NULL,
         reserved_item_id = NULL,
         responded_at = now(),
         responded_by = auth.uid()
   WHERE id = _inquiry_id AND business_id = _business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.release_network_inquiry(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_network_inquiry(uuid, uuid) TO authenticated;
