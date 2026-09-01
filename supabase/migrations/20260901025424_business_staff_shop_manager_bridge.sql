-- Keep the business staff roster and Shop Manager identity/role model aligned.
CREATE UNIQUE INDEX IF NOT EXISTS shops_one_per_business
  ON shop_manager.shops(business_id) WHERE business_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_per_auth_user
  ON shop_manager.profiles(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION shop_manager.sync_business_staff_member(
  _business_id uuid,
  _user_id uuid,
  _active boolean,
  _business_role text,
  _title text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

  INSERT INTO shop_manager.shops(
    name, organization_id, business_id, slug, address, phone, email, city, is_active,
    business_type, industry
  ) VALUES (
    v_business.name, v_business.id, v_business.id,
    'sm-' || left(replace(v_business.id::text, '-', ''), 20),
    v_business.street_address, v_business.phone, v_business.email, v_business.city,
    true, 'business', v_business.type_slug
  )
  ON CONFLICT (business_id) WHERE business_id IS NOT NULL
  DO UPDATE SET name=EXCLUDED.name, address=EXCLUDED.address, phone=EXCLUDED.phone,
    email=EXCLUDED.email, city=EXCLUDED.city, is_active=true, updated_at=now()
  RETURNING id INTO v_shop_id;

  INSERT INTO shop_manager.cash_registers(shop_id,name)
  SELECT v_shop_id,'Front Counter'
  WHERE NOT EXISTS (SELECT 1 FROM shop_manager.cash_registers WHERE shop_id=v_shop_id);

  IF NOT _active THEN
    UPDATE shop_manager.register_sessions
      SET status='manager_closed', closed_at=now(), counted_cash=expected_cash,
          variance=0, closing_note='Employee access deactivated'
      WHERE opened_by_user_id=_user_id AND status='open';
    UPDATE shop_manager.employee_shifts
      SET status='clocked_out', clocked_out_at=now(), closing_note='Employee access deactivated', updated_at=now()
      WHERE user_id=_user_id AND status IN ('on_shift','on_break');
    UPDATE shop_manager.profiles SET shop_id=NULL, updated_at=now()
      WHERE user_id=_user_id AND shop_id=v_shop_id;
    DELETE FROM shop_manager.user_roles ur USING shop_manager.roles r
      WHERE ur.role_id=r.id AND ur.user_id=_user_id
        AND r.name::text IN ('owner','manager','dispatch','truck_driver','technician','office_admin');
    RETURN;
  END IF;

  -- Ownership is authoritative. A redundant/stale staff row must never reduce
  -- the business owner's Shop Manager permissions (for example owner+driver).
  v_shop_role := CASE WHEN v_business.owner_id = _user_id THEN 'owner' ELSE CASE lower(_business_role)
    WHEN 'owner' THEN 'owner'
    WHEN 'manager' THEN 'manager'
    WHEN 'dispatcher' THEN 'dispatch'
    WHEN 'driver' THEN 'truck_driver'
    WHEN 'mechanic' THEN 'technician'
    WHEN 'clerk' THEN 'office_admin'
    ELSE 'other_staff'
  END END;

  INSERT INTO shop_manager.profiles(
    id,user_id,email,first_name,last_name,shop_id,job_title,department,has_auth_account
  ) VALUES (
    _user_id,_user_id,v_email,
    COALESCE(NULLIF(v_public_profile.first_name,''),'Employee'),
    COALESCE(NULLIF(v_public_profile.last_name,''),''),
    v_shop_id,COALESCE(NULLIF(_title,''),initcap(replace(_business_role,'_',' '))),
    'Operations',true
  )
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE
    SET email=EXCLUDED.email,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,
        shop_id=EXCLUDED.shop_id,job_title=EXCLUDED.job_title,
        department=EXCLUDED.department,has_auth_account=true,updated_at=now();

  DELETE FROM shop_manager.user_roles ur USING shop_manager.roles r
    WHERE ur.role_id=r.id AND ur.user_id=_user_id
      AND r.name::text IN ('owner','manager','dispatch','truck_driver','technician','office_admin','other_staff');
  SELECT id INTO v_role_id FROM shop_manager.roles WHERE name::text=v_shop_role;
  IF v_role_id IS NULL THEN RAISE EXCEPTION 'Mapped Shop Manager role not found: %',v_shop_role; END IF;
  INSERT INTO shop_manager.user_roles(user_id,role_id)
    VALUES(_user_id,v_role_id) ON CONFLICT(user_id,role_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION shop_manager.sync_business_staff_member(uuid,uuid,boolean,text,text)
  TO service_role;

CREATE OR REPLACE FUNCTION shop_manager.sync_business_staff_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=shop_manager,public,pg_temp AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id=OLD.business_id AND b.owner_id=OLD.user_id
    ) THEN
      PERFORM shop_manager.sync_business_staff_member(OLD.business_id,OLD.user_id,true,'owner','Owner');
    ELSE
      PERFORM shop_manager.sync_business_staff_member(OLD.business_id,OLD.user_id,false,OLD.role::text,OLD.title);
    END IF;
    RETURN OLD;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id=NEW.business_id AND b.owner_id=NEW.user_id
  ) THEN
    PERFORM shop_manager.sync_business_staff_member(NEW.business_id,NEW.user_id,true,'owner','Owner');
  ELSE
    PERFORM shop_manager.sync_business_staff_member(NEW.business_id,NEW.user_id,NEW.active,NEW.role::text,NEW.title);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.sync_business_staff_trigger() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS sync_business_staff_to_shop_manager ON public.business_staff;
CREATE TRIGGER sync_business_staff_to_shop_manager
AFTER INSERT OR UPDATE OF role,title,active OR DELETE ON public.business_staff
FOR EACH ROW EXECUTE FUNCTION shop_manager.sync_business_staff_trigger();

-- Provision staff who were added before this bridge was installed.
DO $$ DECLARE r public.business_staff%ROWTYPE; BEGIN
  FOR r IN SELECT * FROM public.business_staff LOOP
    PERFORM shop_manager.sync_business_staff_member(r.business_id,r.user_id,r.active,r.role::text,r.title);
  END LOOP;
END $$;
