
CREATE OR REPLACE FUNCTION shop_manager.is_admin_or_owner_secure(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_manager.is_owner_or_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION shop_manager.check_user_is_admin_or_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_manager.is_owner_or_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION shop_manager.is_admin_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_manager.has_role(_user_id, 'admin'::shop_manager.app_role)
$$;

CREATE OR REPLACE FUNCTION shop_manager.is_same_shop(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (
    SELECT 1 FROM shop_manager.profiles p
    WHERE p.id = _profile_id
      AND p.shop_id = (SELECT shop_id FROM shop_manager.profiles WHERE id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION shop_manager.user_belongs_to_shop(_user_id uuid, _shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (
    SELECT 1 FROM shop_manager.profiles WHERE id = _user_id AND shop_id = _shop_id
  )
$$;
