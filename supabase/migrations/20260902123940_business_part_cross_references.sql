-- Private Associate supplier-number cross references.
--
-- Canonical numbers in parts_product_numbers are shared network data. These
-- rows belong to one business and are intentionally never exposed through
-- network_stock or any public policy.

CREATE TABLE IF NOT EXISTS public.business_part_cross_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.business_inventory_items(id) ON DELETE CASCADE,
  catalog_part_id uuid REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
  supplier_name text,
  part_number text NOT NULL,
  normalized_number text
    GENERATED ALWAYS AS (public.normalize_part_number(part_number)) STORED,
  number_type text NOT NULL
    CHECK (number_type IN ('business_sku','supplier_sku','manufacturer','oem','barcode','interchange')),
  source text NOT NULL DEFAULT 'inventory_sync'
    CHECK (source IN ('inventory_sync','manual','supplier_feed','import')),
  is_preferred boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (normalized_number IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS business_part_xref_identity_idx
  ON public.business_part_cross_references
  (business_id, inventory_item_id, normalized_number, number_type);
CREATE INDEX IF NOT EXISTS business_part_xref_lookup_idx
  ON public.business_part_cross_references (business_id, normalized_number)
  WHERE active;
CREATE INDEX IF NOT EXISTS business_part_xref_catalog_idx
  ON public.business_part_cross_references (business_id, catalog_part_id)
  WHERE active AND catalog_part_id IS NOT NULL;

ALTER TABLE public.business_part_cross_references ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_part_cross_references FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_part_cross_references TO authenticated;
GRANT ALL ON public.business_part_cross_references TO service_role;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.business_part_cross_references FROM authenticated;

CREATE POLICY "business part xrefs: members read"
  ON public.business_part_cross_references FOR SELECT TO authenticated
  USING (public.is_business_member((select auth.uid()), business_id));

CREATE POLICY "business part xrefs: managers insert"
  ON public.business_part_cross_references FOR INSERT TO authenticated
  WITH CHECK (
    public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role)
  );

CREATE POLICY "business part xrefs: managers update"
  ON public.business_part_cross_references FOR UPDATE TO authenticated
  USING (
    public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role)
  )
  WITH CHECK (
    public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role)
  );

CREATE POLICY "business part xrefs: managers delete"
  ON public.business_part_cross_references FOR DELETE TO authenticated
  USING (
    public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role)
  );

CREATE TRIGGER business_part_cross_references_updated_at
  BEFORE UPDATE ON public.business_part_cross_references
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_inventory_part_cross_references()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.business_part_cross_references
  WHERE inventory_item_id = NEW.id
    AND source = 'inventory_sync';

  INSERT INTO public.business_part_cross_references (
    business_id, inventory_item_id, catalog_part_id, supplier_name,
    part_number, number_type, source, is_preferred, created_by
  )
  SELECT NEW.business_id, NEW.id, NEW.catalog_part_id, NEW.supplier,
         candidate.part_number, candidate.number_type, 'inventory_sync',
         candidate.is_preferred, auth.uid()
  FROM (VALUES
    (NEW.sku, 'business_sku', true),
    (NEW.manufacturer_part_number, 'manufacturer', false),
    (NEW.oem_part_number, 'oem', false),
    (NEW.barcode, 'barcode', false)
  ) AS candidate(part_number, number_type, is_preferred)
  WHERE public.normalize_part_number(candidate.part_number) IS NOT NULL
  ON CONFLICT (business_id, inventory_item_id, normalized_number, number_type)
  DO UPDATE SET
    catalog_part_id = EXCLUDED.catalog_part_id,
    supplier_name = EXCLUDED.supplier_name,
    part_number = EXCLUDED.part_number,
    active = true,
    updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_inventory_part_cross_references() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_inventory_part_cross_references() TO service_role;

CREATE TRIGGER sync_inventory_part_cross_references
  AFTER INSERT OR UPDATE OF business_id, sku, manufacturer_part_number,
    oem_part_number, barcode, supplier, catalog_part_id
  ON public.business_inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_part_cross_references();

-- Backfill the working inventory without altering any inventory row.
INSERT INTO public.business_part_cross_references (
  business_id, inventory_item_id, catalog_part_id, supplier_name,
  part_number, number_type, source, is_preferred
)
SELECT i.business_id, i.id, i.catalog_part_id, i.supplier,
       candidate.part_number, candidate.number_type, 'inventory_sync', candidate.is_preferred
FROM public.business_inventory_items i
CROSS JOIN LATERAL (VALUES
  (i.sku, 'business_sku', true),
  (i.manufacturer_part_number, 'manufacturer', false),
  (i.oem_part_number, 'oem', false),
  (i.barcode, 'barcode', false)
) AS candidate(part_number, number_type, is_preferred)
WHERE public.normalize_part_number(candidate.part_number) IS NOT NULL
ON CONFLICT (business_id, inventory_item_id, normalized_number, number_type)
DO UPDATE SET
  catalog_part_id = EXCLUDED.catalog_part_id,
  supplier_name = EXCLUDED.supplier_name,
  part_number = EXCLUDED.part_number,
  active = true,
  updated_at = now();
