CREATE OR REPLACE FUNCTION shop_manager.employee_allowed_modules()
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_profile shop_manager.profiles%ROWTYPE; v_roles text[]; v_modules text[];
  v_all constant text[] := ARRAY['operations','customers','vehicles','work_orders','inspections','appointments',
    'inventory','parts_network','purchase_orders','invoices','payments','quotes','vendors','vendor_bills',
    'technicians','scheduling','discounts','returns','warranty','reports','accounting','settings'];
BEGIN
  IF (select auth.uid()) IS NULL THEN RETURN ARRAY[]::text[]; END IF;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  IF NOT FOUND OR v_profile.shop_id IS NULL THEN RETURN ARRAY[]::text[]; END IF;
  SELECT COALESCE(array_agg(DISTINCT r.name::text),'{}'::text[]) INTO v_roles
  FROM shop_manager.user_roles ur JOIN shop_manager.roles r ON r.id=ur.role_id
  WHERE ur.user_id IN (v_profile.id,(select auth.uid()));
  IF v_roles && ARRAY['owner','admin','manager','operations_manager','developer']::text[] THEN RETURN v_all; END IF;
  IF EXISTS (SELECT 1 FROM shop_manager.shop_role_permissions p WHERE p.shop_id=v_profile.shop_id AND p.role_name=ANY(v_roles)) THEN
    SELECT COALESCE(array_agg(DISTINCT p.module),'{}'::text[]) INTO v_modules
    FROM shop_manager.shop_role_permissions p WHERE p.shop_id=v_profile.shop_id AND p.role_name=ANY(v_roles)
      AND (COALESCE((p.actions->>'view')::boolean,false) OR COALESCE((p.actions->>'read')::boolean,false)
        OR COALESCE((p.actions->>'manage')::boolean,false));
    RETURN array_append(v_modules,'operations');
  END IF;
  v_modules := ARRAY['operations'];
  IF v_roles && ARRAY['parts_manager']::text[] THEN v_modules := v_modules || ARRAY['customers','vehicles','inventory','parts_network','purchase_orders','vendors','returns','warranty','reports']; END IF;
  IF v_roles && ARRAY['service_advisor','reception','office_admin']::text[] THEN v_modules := v_modules || ARRAY['customers','vehicles','work_orders','inspections','appointments','quotes','invoices','payments','discounts','returns','warranty']; END IF;
  IF v_roles && ARRAY['technician','mechanic_manager','mechanic_manager_assistant']::text[] THEN v_modules := v_modules || ARRAY['vehicles','work_orders','inspections','inventory','parts_network','warranty']; END IF;
  IF v_roles && ARRAY['other_staff','dispatch','yard','yard_manager','yard_manager_assistant']::text[] THEN v_modules := v_modules || ARRAY['customers','vehicles','work_orders','inventory','parts_network','scheduling']; END IF;
  IF v_roles && ARRAY['truck_driver']::text[] THEN v_modules := v_modules || ARRAY['vehicles','parts_network','scheduling']; END IF;
  RETURN ARRAY(SELECT DISTINCT unnest(v_modules));
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.employee_allowed_modules() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION shop_manager.employee_allowed_modules() TO authenticated,service_role;
