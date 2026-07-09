
-- 1. Extend businesses & inventory items for network visibility
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS expose_inventory_to_network boolean NOT NULL DEFAULT false;

ALTER TABLE public.business_inventory_items
  ADD COLUMN IF NOT EXISTS price numeric(12,2),
  ADD COLUMN IF NOT EXISTS catalog_part_id uuid REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS network_visible boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS business_inv_sku_lower_idx
  ON public.business_inventory_items (lower(sku)) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS business_inv_catalog_idx
  ON public.business_inventory_items (catalog_part_id) WHERE catalog_part_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS business_inv_network_idx
  ON public.business_inventory_items (business_id) WHERE active AND network_visible;

-- 2. Column-restricted public read on inventory items (no cost, no location, no notes exposed)
GRANT SELECT (id, business_id, sku, name, category, unit, qty_on_hand,
              price, catalog_part_id, active, network_visible, updated_at)
  ON public.business_inventory_items TO anon, authenticated;

DROP POLICY IF EXISTS "inv: public network read" ON public.business_inventory_items;
CREATE POLICY "inv: public network read"
  ON public.business_inventory_items FOR SELECT
  TO anon, authenticated
  USING (
    active
    AND network_visible
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.expose_inventory_to_network
        AND b.status = 'active'
    )
  );

-- 3. Public view joining shop location info for the network stock feed
DROP VIEW IF EXISTS public.network_stock;
CREATE VIEW public.network_stock
WITH (security_invoker = on) AS
SELECT
  i.id,
  i.business_id,
  i.sku,
  i.name,
  i.category,
  i.unit,
  i.qty_on_hand,
  i.price,
  i.catalog_part_id,
  i.updated_at,
  b.name       AS business_name,
  b.slug       AS business_slug,
  b.city,
  b.province,
  b.region,
  b.lat,
  b.lng
FROM public.business_inventory_items i
JOIN public.businesses b ON b.id = i.business_id
WHERE i.active
  AND i.network_visible
  AND b.expose_inventory_to_network
  AND b.status = 'active';

GRANT SELECT ON public.network_stock TO anon, authenticated;

-- 4. Realtime for live stock updates
ALTER TABLE public.business_inventory_items REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'business_inventory_items'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.business_inventory_items';
  END IF;
END $$;

-- 5. Customer inquiries against a specific shop's stocked part
CREATE TABLE IF NOT EXISTS public.network_part_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.business_inventory_items(id) ON DELETE SET NULL,
  sku text,
  part_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  requester_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','fulfilled','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.network_part_inquiries TO authenticated;
GRANT INSERT ON public.network_part_inquiries TO anon;
GRANT ALL ON public.network_part_inquiries TO service_role;

ALTER TABLE public.network_part_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "npi: anyone insert"
  ON public.network_part_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id
        AND b.expose_inventory_to_network
        AND b.status = 'active'
    )
  );

CREATE POLICY "npi: requester read own"
  ON public.network_part_inquiries FOR SELECT
  TO authenticated
  USING (requester_user_id = auth.uid());

CREATE POLICY "npi: shop members read"
  ON public.network_part_inquiries FOR SELECT
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "npi: shop managers update"
  ON public.network_part_inquiries FOR UPDATE
  TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'::business_staff_role))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'::business_staff_role));

CREATE INDEX IF NOT EXISTS npi_business_idx ON public.network_part_inquiries(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS npi_requester_idx ON public.network_part_inquiries(requester_user_id) WHERE requester_user_id IS NOT NULL;

CREATE TRIGGER trg_npi_updated
  BEFORE UPDATE ON public.network_part_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
