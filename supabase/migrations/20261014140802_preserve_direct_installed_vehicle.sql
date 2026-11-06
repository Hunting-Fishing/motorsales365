-- Preserve installations attached directly to an owned vehicle. Shop-origin
-- installations still resolve their owner link exclusively through approval.
CREATE OR REPLACE FUNCTION vehicle_receipts_private.link_installed_component()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.shop_manager_vehicle_id IS NOT NULL THEN
    SELECT vehicle_id INTO NEW.public_vehicle_id
    FROM public.vehicle_shop_links
    WHERE shop_vehicle_id = NEW.shop_manager_vehicle_id AND active;
  END IF;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION vehicle_receipts_private.link_installed_component()
FROM PUBLIC, anon, authenticated;
