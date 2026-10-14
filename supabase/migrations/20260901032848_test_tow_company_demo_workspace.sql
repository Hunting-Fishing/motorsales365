-- Resettable, private demo data for a towing-business workspace.
-- This is additive: only rows carrying the exact demo marker are replaced.

CREATE OR REPLACE FUNCTION shop_manager.seed_tow_demo_workspace(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp
AS $$
DECLARE
  v_shop_id uuid;
  v_location_id uuid;
  v_marker constant text := '[365 DEMO v1]';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id) THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  SELECT id INTO v_shop_id FROM shop_manager.shops WHERE business_id = _business_id;
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'Shop Manager workspace is not linked'; END IF;

  INSERT INTO public.business_inventory_locations(
    business_id, code, name, location_type, network_visible, active, pickup_notes
  ) VALUES (
    _business_id, 'DEMO-MAIN', 'Demo Main Stockroom', 'warehouse', false, true,
    'Training location — not available for public pickup'
  )
  ON CONFLICT (business_id, code) DO UPDATE SET
    name=EXCLUDED.name, location_type=EXCLUDED.location_type,
    network_visible=false, active=true, pickup_notes=EXCLUDED.pickup_notes,
    updated_at=now()
  RETURNING id INTO v_location_id;

  DELETE FROM public.business_assets
    WHERE business_id=_business_id AND notes=v_marker;
  DELETE FROM public.business_inventory_items
    WHERE business_id=_business_id AND notes=v_marker;
  DELETE FROM shop_manager.inventory_items
    WHERE shop_id=v_shop_id AND notes=v_marker;

  INSERT INTO public.business_assets(
    business_id,kind,name,plate,vin,capacity_kg,status,notes
  ) VALUES
    (_business_id,'tow_truck','Unit 01 · Light-Duty Wheel Lift','DEMO-101','DEMO-VIN-WL-001',3500,'active',v_marker),
    (_business_id,'flatbed','Unit 02 · Flatbed Carrier','DEMO-202','DEMO-VIN-FB-002',5000,'active',v_marker),
    (_business_id,'wrecker','Unit 03 · Heavy Recovery Wrecker','DEMO-303','DEMO-VIN-HR-003',12000,'maintenance',v_marker),
    (_business_id,'service_van','Unit 04 · Roadside Service Van','DEMO-404','DEMO-VIN-SV-004',1800,'active',v_marker);

  INSERT INTO public.business_inventory_items(
    business_id,location_id,sku,name,category,unit,qty_on_hand,reorder_at,cost,price,
    location,notes,active,network_visible,brand,manufacturer_part_number,
    country_code,item_condition,fulfillment_methods,warranty_months
  ) VALUES
    (_business_id,v_location_id,'DEMO-REC-10T','Recovery Strap 10T','Recovery Gear','pc',8,3,1450,2100,'Rack A1',v_marker,true,false,'365 Demo','REC-10T','PH','new',ARRAY['pickup'],12),
    (_business_id,v_location_id,'DEMO-SHK-475','Bow Shackle 4.75T','Recovery Gear','pc',14,5,620,950,'Rack A2',v_marker,true,false,'365 Demo','SHK-475','PH','new',ARRAY['pickup'],12),
    (_business_id,v_location_id,'DEMO-WLS-SET','Wheel-Lift Strap Set','Tow Equipment','set',6,2,1900,2850,'Rack A3',v_marker,true,false,'365 Demo','WLS-SET','PH','new',ARRAY['pickup'],6),
    (_business_id,v_location_id,'DEMO-DOLLY-01','Universal Wheel Dolly','Tow Equipment','pc',4,2,7200,9500,'Equipment Bay',v_marker,true,false,'365 Demo','DOLLY-01','PH','new',ARRAY['pickup'],12),
    (_business_id,v_location_id,'DEMO-JUMP-12V','12V/24V Jump Starter','Roadside Service','pc',3,1,6400,7900,'Charging Station',v_marker,true,false,'365 Demo','JUMP-12V24V','PH','new',ARRAY['pickup'],12),
    (_business_id,v_location_id,'DEMO-TIRE-PLUG','Tubeless Tire Repair Kit','Roadside Service','kit',12,4,480,750,'Rack B1',v_marker,true,false,'365 Demo','TIRE-PLUG-KIT','PH','new',ARRAY['pickup'],6),
    (_business_id,v_location_id,'DEMO-HYD-ISO46','Hydraulic Oil ISO 46 · 4L','Fluids','bottle',9,3,680,950,'Fluids Cabinet',v_marker,true,false,'365 Demo','HYD-ISO46-4L','PH','new',ARRAY['pickup'],NULL),
    (_business_id,v_location_id,'DEMO-CONE-750','Traffic Cone 750mm','Safety','pc',20,8,340,520,'Safety Cage',v_marker,true,false,'365 Demo','CONE-750','PH','new',ARRAY['pickup'],NULL),
    (_business_id,v_location_id,'DEMO-VEST-HV','High-Visibility Safety Vest','Safety','pc',16,6,180,320,'Safety Cage',v_marker,true,false,'365 Demo','VEST-HV','PH','new',ARRAY['pickup'],NULL),
    (_business_id,v_location_id,'DEMO-SPILL-20L','20L Spill Response Kit','Safety','kit',2,2,1650,2350,'Safety Cage',v_marker,true,false,'365 Demo','SPILL-20L','PH','new',ARRAY['pickup'],NULL);

  INSERT INTO shop_manager.inventory_items(
    shop_id,name,sku,category,supplier,quantity,quantity_in_stock,reorder_point,
    unit_price,cost_per_unit,sell_price_per_unit,location,status,part_number,
    manufacturer,warranty_period,description,notes
  ) VALUES
    (v_shop_id,'Recovery Strap 10T','DEMO-REC-10T','Recovery Gear','365 Demo Supply',8,8,3,2100,1450,2100,'Rack A1','In Stock','REC-10T','365 Demo','12 months','Heavy recovery strap for training sales and receiving.',v_marker),
    (v_shop_id,'Bow Shackle 4.75T','DEMO-SHK-475','Recovery Gear','365 Demo Supply',14,14,5,950,620,950,'Rack A2','In Stock','SHK-475','365 Demo','12 months','Rated bow shackle demo inventory.',v_marker),
    (v_shop_id,'Wheel-Lift Strap Set','DEMO-WLS-SET','Tow Equipment','365 Demo Supply',6,6,2,2850,1900,2850,'Rack A3','In Stock','WLS-SET','365 Demo','6 months','Replacement wheel-lift straps.',v_marker),
    (v_shop_id,'Universal Wheel Dolly','DEMO-DOLLY-01','Tow Equipment','365 Demo Supply',4,4,2,9500,7200,9500,'Equipment Bay','In Stock','DOLLY-01','365 Demo','12 months','Universal wheel dolly set.',v_marker),
    (v_shop_id,'12V/24V Jump Starter','DEMO-JUMP-12V','Roadside Service','365 Demo Supply',3,3,1,7900,6400,7900,'Charging Station','In Stock','JUMP-12V24V','365 Demo','12 months','Commercial jump starter.',v_marker),
    (v_shop_id,'Tubeless Tire Repair Kit','DEMO-TIRE-PLUG','Roadside Service','365 Demo Supply',12,12,4,750,480,750,'Rack B1','In Stock','TIRE-PLUG-KIT','365 Demo','6 months','Roadside tubeless repair kit.',v_marker),
    (v_shop_id,'Hydraulic Oil ISO 46 · 4L','DEMO-HYD-ISO46','Fluids','365 Demo Supply',9,9,3,950,680,950,'Fluids Cabinet','In Stock','HYD-ISO46-4L','365 Demo',NULL,'Hydraulic oil for tow equipment.',v_marker),
    (v_shop_id,'Traffic Cone 750mm','DEMO-CONE-750','Safety','365 Demo Supply',20,20,8,520,340,520,'Safety Cage','In Stock','CONE-750','365 Demo',NULL,'Reflective roadside traffic cone.',v_marker),
    (v_shop_id,'High-Visibility Safety Vest','DEMO-VEST-HV','Safety','365 Demo Supply',16,16,6,320,180,320,'Safety Cage','In Stock','VEST-HV','365 Demo',NULL,'Employee roadside safety vest.',v_marker),
    (v_shop_id,'20L Spill Response Kit','DEMO-SPILL-20L','Safety','365 Demo Supply',2,2,2,2350,1650,2350,'Safety Cage','Low Stock','SPILL-20L','365 Demo',NULL,'Training stock intentionally at reorder point.',v_marker);
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.seed_tow_demo_workspace(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION shop_manager.seed_tow_demo_workspace(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.reset_tow_demo_workspace(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shop_manager, pg_temp
AS $$
DECLARE v_meta jsonb;
BEGIN
  SELECT import_metadata INTO v_meta FROM public.businesses
    WHERE id=_business_id AND owner_id=(SELECT auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Only the business owner can reset this demo'; END IF;
  IF COALESCE(v_meta->>'demo_template','') <> 'tow-company-v1' THEN
    RAISE EXCEPTION 'This business is not a resettable towing demo';
  END IF;
  PERFORM shop_manager.seed_tow_demo_workspace(_business_id);
END;
$$;
REVOKE ALL ON FUNCTION public.reset_tow_demo_workspace(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reset_tow_demo_workspace(uuid) TO authenticated,service_role;

-- Correct owner role precedence in the already-deployed bridge function.
CREATE OR REPLACE FUNCTION shop_manager.effective_business_shop_role(
  _business_id uuid, _user_id uuid, _business_role text
) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
  SELECT CASE WHEN EXISTS(
    SELECT 1 FROM public.businesses b WHERE b.id=_business_id AND b.owner_id=_user_id
  ) THEN 'owner' ELSE CASE lower(_business_role)
    WHEN 'owner' THEN 'owner' WHEN 'manager' THEN 'manager'
    WHEN 'dispatcher' THEN 'dispatch' WHEN 'driver' THEN 'truck_driver'
    WHEN 'mechanic' THEN 'technician' WHEN 'clerk' THEN 'office_admin'
    ELSE 'other_staff' END END
$$;
REVOKE ALL ON FUNCTION shop_manager.effective_business_shop_role(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION shop_manager.effective_business_shop_role(uuid,uuid,text) TO service_role;

-- Update the deployed bridge without changing its signature or surrounding
-- provisioning/deactivation behavior.
DO $$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)'::regprocedure
  ) INTO v_definition;
  IF position('v_shop_role := CASE lower(_business_role)' in v_definition) > 0 THEN
    v_definition := replace(
      v_definition,
      'v_shop_role := CASE lower(_business_role)',
      'v_shop_role := CASE WHEN v_business.owner_id = _user_id THEN ''owner'' ELSE CASE lower(_business_role)'
    );
    v_definition := replace(
      v_definition,
      E'    ELSE ''other_staff''\n  END;\n\n  INSERT INTO shop_manager.profiles',
      E'    ELSE ''other_staff''\n  END END;\n\n  INSERT INTO shop_manager.profiles'
    );
    EXECUTE v_definition;
  END IF;
END;
$$;
