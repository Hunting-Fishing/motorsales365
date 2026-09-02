-- Add an Assistant Manager tier and narrowly scoped, expiring staff grants for
-- linking private inventory rows to active canonical catalogue products.

ALTER TYPE public.business_staff_role ADD VALUE IF NOT EXISTS 'assistant_manager' AFTER 'manager';

CREATE OR REPLACE FUNCTION public.has_business_role(
  _user uuid,
  _business uuid,
  _role public.business_staff_role
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_business_owner(_user, _business)
    OR EXISTS (
      SELECT 1
      FROM public.business_staff
      WHERE business_id = _business
        AND user_id = _user
        AND active = true
        AND (
          role = _role
          OR role::text IN ('owner', 'manager', 'assistant_manager')
        )
    )
$$;
REVOKE ALL ON FUNCTION public.has_business_role(uuid,uuid,public.business_staff_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_business_role(uuid,uuid,public.business_staff_role) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.business_staff_temporary_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key text NOT NULL CHECK (permission_key IN ('canonical_inventory_link')),
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  reason text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > granted_at)
);

CREATE INDEX IF NOT EXISTS business_staff_temp_permission_lookup_idx
  ON public.business_staff_temporary_permissions
  (business_id, user_id, permission_key, expires_at DESC)
  WHERE revoked_at IS NULL;

ALTER TABLE public.business_staff_temporary_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_staff_temporary_permissions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.business_staff_temporary_permissions TO authenticated;
GRANT ALL ON public.business_staff_temporary_permissions TO service_role;

CREATE POLICY "temporary permissions: employee or managers read"
  ON public.business_staff_temporary_permissions FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role)
  );

CREATE POLICY "temporary permissions: managers grant"
  ON public.business_staff_temporary_permissions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role)
    AND granted_by = (select auth.uid())
    AND public.is_business_member(user_id, business_id)
  );

CREATE POLICY "temporary permissions: managers revoke"
  ON public.business_staff_temporary_permissions FOR UPDATE TO authenticated
  USING (public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role))
  WITH CHECK (public.has_business_role((select auth.uid()), business_id, 'manager'::public.business_staff_role));

CREATE OR REPLACE FUNCTION public.has_active_business_permission(
  _user uuid,
  _business uuid,
  _permission_key text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_business_role(_user, _business, 'manager'::public.business_staff_role)
    OR EXISTS (
      SELECT 1
      FROM public.business_staff_temporary_permissions p
      JOIN public.business_staff s
        ON s.business_id = p.business_id AND s.user_id = p.user_id AND s.active
      WHERE p.business_id = _business
        AND p.user_id = _user
        AND p.permission_key = _permission_key
        AND p.revoked_at IS NULL
        AND p.expires_at > now()
    )
$$;
REVOKE ALL ON FUNCTION public.has_active_business_permission(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_business_permission(uuid,uuid,text) TO authenticated, service_role;

-- Deliberately expose one narrow mutation instead of widening the inventory
-- table UPDATE policy. The caller can change only catalog_part_id, and the
-- selected product must be an approved, active canonical catalogue record.
CREATE OR REPLACE FUNCTION public.link_business_inventory_catalog_part(
  _business_id uuid,
  _inventory_item_id uuid,
  _catalog_part_id uuid
) RETURNS public.business_inventory_items
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_actor uuid := (select auth.uid());
  v_item public.business_inventory_items%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_active_business_permission(
    v_actor, _business_id, 'canonical_inventory_link'
  ) THEN
    RAISE EXCEPTION 'Canonical catalogue linking permission required';
  END IF;

  SELECT * INTO v_item
  FROM public.business_inventory_items
  WHERE id = _inventory_item_id AND business_id = _business_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found'; END IF;

  IF _catalog_part_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.parts_catalog
    WHERE id = _catalog_part_id AND active = true AND catalog_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Select an active approved canonical catalogue product';
  END IF;

  UPDATE public.business_inventory_items
  SET catalog_part_id = _catalog_part_id, updated_at = now()
  WHERE id = _inventory_item_id AND business_id = _business_id
  RETURNING * INTO v_item;

  INSERT INTO public.business_inventory_movements(
    item_id, business_id, delta, reason, actor_id
  ) VALUES (
    _inventory_item_id,
    _business_id,
    0,
    CASE WHEN _catalog_part_id IS NULL
      THEN 'Canonical catalogue link removed'
      ELSE 'Canonical catalogue product linked'
    END,
    v_actor
  );

  RETURN v_item;
END;
$$;
REVOKE ALL ON FUNCTION public.link_business_inventory_catalog_part(uuid,uuid,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_business_inventory_catalog_part(uuid,uuid,uuid)
  TO authenticated, service_role;

-- Keep the existing Shop Manager bridge aligned with the new role.
CREATE OR REPLACE FUNCTION shop_manager.sync_business_staff_member(
  _business_id uuid,
  _user_id uuid,
  _active boolean,
  _business_role text,
  _title text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = shop_manager, public, auth, pg_temp
AS $$
DECLARE
  v_business public.businesses%ROWTYPE;
  v_public_profile public.profiles%ROWTYPE;
  v_shop_id uuid;
  v_shop_role text;
  v_role_id uuid;
  v_email text;
BEGIN
  SELECT * INTO v_business FROM public.businesses WHERE id = _business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Business not found'; END IF;
  SELECT * INTO v_public_profile FROM public.profiles WHERE id = _user_id;
  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'Employee auth account not found'; END IF;

  INSERT INTO shop_manager.shops(name,organization_id,business_id,slug,address,phone,email,city,is_active,business_type,industry)
  VALUES (v_business.name,v_business.id,v_business.id,'sm-'||left(replace(v_business.id::text,'-',''),20),v_business.street_address,v_business.phone,v_business.email,v_business.city,true,'business',v_business.type_slug)
  ON CONFLICT (business_id) WHERE business_id IS NOT NULL DO UPDATE
    SET name=EXCLUDED.name,address=EXCLUDED.address,phone=EXCLUDED.phone,email=EXCLUDED.email,city=EXCLUDED.city,is_active=true,updated_at=now()
  RETURNING id INTO v_shop_id;

  INSERT INTO shop_manager.cash_registers(shop_id,name)
  SELECT v_shop_id,'Front Counter' WHERE NOT EXISTS (SELECT 1 FROM shop_manager.cash_registers WHERE shop_id=v_shop_id);

  IF NOT _active THEN
    UPDATE shop_manager.register_sessions SET status='manager_closed',closed_at=now(),counted_cash=expected_cash,variance=0,closing_note='Employee access deactivated' WHERE opened_by_user_id=_user_id AND status='open';
    UPDATE shop_manager.employee_shifts SET status='clocked_out',clocked_out_at=now(),closing_note='Employee access deactivated',updated_at=now() WHERE user_id=_user_id AND status IN ('on_shift','on_break');
    UPDATE shop_manager.profiles SET shop_id=NULL,updated_at=now() WHERE user_id=_user_id AND shop_id=v_shop_id;
    DELETE FROM shop_manager.user_roles ur USING shop_manager.roles r WHERE ur.role_id=r.id AND ur.user_id=_user_id AND r.name::text IN ('owner','manager','dispatch','truck_driver','technician','office_admin');
    RETURN;
  END IF;

  v_shop_role := CASE WHEN v_business.owner_id=_user_id THEN 'owner' ELSE CASE lower(_business_role)
    WHEN 'owner' THEN 'owner' WHEN 'manager' THEN 'manager' WHEN 'assistant_manager' THEN 'manager'
    WHEN 'dispatcher' THEN 'dispatch' WHEN 'driver' THEN 'truck_driver'
    WHEN 'mechanic' THEN 'technician' WHEN 'clerk' THEN 'office_admin' ELSE 'other_staff' END END;

  INSERT INTO shop_manager.profiles(id,user_id,email,first_name,last_name,shop_id,job_title,department,has_auth_account)
  VALUES (_user_id,_user_id,v_email,COALESCE(NULLIF(v_public_profile.first_name,''),'Employee'),COALESCE(NULLIF(v_public_profile.last_name,''),''),v_shop_id,COALESCE(NULLIF(_title,''),initcap(replace(_business_role,'_',' '))),'Operations',true)
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET email=EXCLUDED.email,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,shop_id=EXCLUDED.shop_id,job_title=EXCLUDED.job_title,department=EXCLUDED.department,has_auth_account=true,updated_at=now();

  DELETE FROM shop_manager.user_roles ur USING shop_manager.roles r WHERE ur.role_id=r.id AND ur.user_id=_user_id AND r.name::text IN ('owner','manager','dispatch','truck_driver','technician','office_admin','other_staff');
  SELECT id INTO v_role_id FROM shop_manager.roles WHERE name::text=v_shop_role;
  IF v_role_id IS NULL THEN RAISE EXCEPTION 'Mapped Shop Manager role not found: %',v_shop_role; END IF;
  INSERT INTO shop_manager.user_roles(user_id,role_id) VALUES(_user_id,v_role_id) ON CONFLICT(user_id,role_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text) TO service_role;
