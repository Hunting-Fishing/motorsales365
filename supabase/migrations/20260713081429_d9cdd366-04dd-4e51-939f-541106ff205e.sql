
-- Helper: current user's shop_id from shop_manager.profiles
CREATE OR REPLACE FUNCTION shop_manager.get_current_user_shop_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_id FROM shop_manager.profiles WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION shop_manager.get_user_shop_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_id FROM shop_manager.profiles WHERE id = _user_id LIMIT 1
$$;

-- roles catalog referenced by user_roles.role_id
CREATE TABLE IF NOT EXISTS shop_manager.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name shop_manager.app_role NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON shop_manager.roles TO authenticated;
GRANT ALL ON shop_manager.roles TO service_role;
ALTER TABLE shop_manager.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles_select_all" ON shop_manager.roles;
CREATE POLICY "roles_select_all" ON shop_manager.roles FOR SELECT TO authenticated USING (true);

INSERT INTO shop_manager.roles (name)
SELECT unnest(enum_range(NULL::shop_manager.app_role))
ON CONFLICT (name) DO NOTHING;

-- has_role by enum value (matches policy signatures)
CREATE OR REPLACE FUNCTION shop_manager.has_role(_user_id uuid, _role shop_manager.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shop_manager.user_roles ur
    JOIN shop_manager.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.name = _role
  )
$$;

-- Generic permission stub — allow owner/admin; extend later when a
-- permissions table lands. Kept conservative on purpose.
CREATE OR REPLACE FUNCTION shop_manager.user_has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shop_manager.user_roles ur
    JOIN shop_manager.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name IN ('owner'::shop_manager.app_role, 'admin'::shop_manager.app_role)
  )
$$;
