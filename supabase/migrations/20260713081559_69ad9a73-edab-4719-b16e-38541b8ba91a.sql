
-- Text overload of has_role (some policies pass 'admin'::text instead of the enum)
CREATE OR REPLACE FUNCTION shop_manager.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (
    SELECT 1 FROM shop_manager.user_roles ur
    JOIN shop_manager.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.name::text = _role
  )
$$;

CREATE OR REPLACE FUNCTION shop_manager.is_staff_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (SELECT 1 FROM shop_manager.profiles WHERE id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION shop_manager.is_owner_or_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (
    SELECT 1 FROM shop_manager.user_roles ur
    JOIN shop_manager.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name IN ('owner'::shop_manager.app_role, 'admin'::shop_manager.app_role)
  )
$$;

CREATE OR REPLACE FUNCTION shop_manager.get_user_shop_id_secure(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_id FROM shop_manager.profiles WHERE id = _user_id LIMIT 1
$$;

-- 3-arg overload: resource + action; conservative — owner/admin only.
CREATE OR REPLACE FUNCTION shop_manager.user_has_permission(_user_id uuid, _resource text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_manager.is_owner_or_admin(_user_id)
$$;
