-- Role-aware Shop Manager module routing. Existing per-shop permission rows
-- override the default role matrix when a shop has configured them.

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

  IF v_roles && ARRAY['owner','admin','manager','operations_manager','developer']::text[] THEN
    RETURN v_all;
  END IF;

  IF EXISTS (SELECT 1 FROM shop_manager.shop_role_permissions p
    WHERE p.shop_id=v_profile.shop_id AND p.role_name=ANY(v_roles)) THEN
    SELECT COALESCE(array_agg(DISTINCT p.module),'{}'::text[]) INTO v_modules
    FROM shop_manager.shop_role_permissions p
    WHERE p.shop_id=v_profile.shop_id AND p.role_name=ANY(v_roles)
      AND (COALESCE((p.actions->>'view')::boolean,false)
        OR COALESCE((p.actions->>'read')::boolean,false)
        OR COALESCE((p.actions->>'manage')::boolean,false));
    RETURN array_append(v_modules,'operations');
  END IF;

  v_modules := ARRAY['operations'];
  IF v_roles && ARRAY['parts_manager']::text[] THEN
    v_modules := v_modules || ARRAY['customers','vehicles','inventory','parts_network','purchase_orders','vendors','returns','warranty','reports'];
  END IF;
  IF v_roles && ARRAY['service_advisor','reception','office_admin']::text[] THEN
    v_modules := v_modules || ARRAY['customers','vehicles','work_orders','inspections','appointments','quotes','invoices','payments','discounts','returns','warranty'];
  END IF;
  IF v_roles && ARRAY['technician','mechanic_manager','mechanic_manager_assistant']::text[] THEN
    v_modules := v_modules || ARRAY['vehicles','work_orders','inspections','inventory','parts_network','warranty'];
  END IF;
  IF v_roles && ARRAY['other_staff','dispatch','yard','yard_manager','yard_manager_assistant']::text[] THEN
    v_modules := v_modules || ARRAY['customers','vehicles','work_orders','inventory','parts_network','scheduling'];
  END IF;
  IF v_roles && ARRAY['truck_driver']::text[] THEN
    v_modules := v_modules || ARRAY['vehicles','parts_network','scheduling'];
  END IF;
  RETURN ARRAY(SELECT DISTINCT unnest(v_modules));
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.employee_allowed_modules() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.employee_allowed_modules() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION shop_manager.employee_operating_context()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp AS $$
DECLARE v_profile shop_manager.profiles%ROWTYPE; v_shift shop_manager.employee_shifts%ROWTYPE;
  v_roles jsonb; v_locations jsonb;
BEGIN
  IF (select auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_profile FROM shop_manager.current_employee_profile();
  IF NOT FOUND OR v_profile.shop_id IS NULL THEN RAISE EXCEPTION 'No Shop Manager employee profile is linked to this account'; END IF;
  SELECT COALESCE(jsonb_agg(r.name::text ORDER BY r.name::text),'[]'::jsonb) INTO v_roles
  FROM shop_manager.user_roles ur JOIN shop_manager.roles r ON r.id=ur.role_id
  WHERE ur.user_id IN (v_profile.id,(select auth.uid()));
  SELECT * INTO v_shift FROM shop_manager.employee_shifts
  WHERE user_id=(select auth.uid()) AND status IN ('on_shift','on_break') ORDER BY clocked_in_at DESC LIMIT 1;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'location_type',l.location_type) ORDER BY l.name),'[]'::jsonb)
  INTO v_locations FROM shop_manager.employee_work_locations l WHERE l.shop_id=v_profile.shop_id AND l.active;
  RETURN jsonb_build_object(
    'shop_id',v_profile.shop_id,'profile_id',v_profile.id,
    'employee_name',COALESCE(v_profile.full_name,concat_ws(' ',v_profile.first_name,v_profile.last_name),v_profile.email),
    'job_title',v_profile.job_title,'department',v_profile.department,'roles',v_roles,'locations',v_locations,
    'allowed_modules',to_jsonb(shop_manager.employee_allowed_modules()),
    'can_manage',shop_manager.is_shop_operations_manager((select auth.uid()),v_profile.shop_id),
    'active_shift',CASE WHEN v_shift.id IS NULL THEN NULL ELSE to_jsonb(v_shift) END
  );
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.employee_operating_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shop_manager.employee_operating_context() TO authenticated, service_role;
