-- =====================================================
-- PERMISSION SYSTEM SECURITY AND RLS POLICIES
-- =====================================================
-- This migration adds comprehensive security to the permission system
-- including RLS policies, security definer functions, and proper access controls

-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Function to check if a user is an owner or admin
CREATE OR REPLACE FUNCTION public.is_owner_or_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_user_id
    AND r.name IN ('owner', 'admin')
  );
$$;

-- Function to check if a user belongs to a shop
CREATE OR REPLACE FUNCTION public.user_belongs_to_shop(check_user_id UUID, check_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_user_id
    AND shop_id = check_shop_id
  );
$$;

-- Function to get user's effective permissions for a module
-- This combines role permissions with user-specific overrides
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(
  _user_id UUID,
  _module TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_id UUID;
  _role_name TEXT;
  _role_permissions JSONB;
  _user_overrides JSONB;
  _final_permissions JSONB;
BEGIN
  -- Get user's shop and role
  SELECT p.shop_id INTO _shop_id
  FROM profiles p
  WHERE p.id = _user_id;

  IF _shop_id IS NULL THEN
    RETURN '{"view": false}'::jsonb;
  END IF;

  -- Get user's role name
  SELECT r.name INTO _role_name
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = _user_id
  LIMIT 1;

  IF _role_name IS NULL THEN
    RETURN '{"view": false}'::jsonb;
  END IF;

  -- Get role default permissions
  SELECT srp.actions INTO _role_permissions
  FROM shop_role_permissions srp
  WHERE srp.shop_id = _shop_id
    AND srp.role_name = _role_name
    AND srp.module = _module;

  -- Get user-specific permission overrides
  SELECT up.actions INTO _user_overrides
  FROM user_permissions up
  WHERE up.user_id = _user_id
    AND up.shop_id = _shop_id
    AND up.module = _module;

  -- Merge permissions (user overrides take precedence)
  IF _user_overrides IS NOT NULL THEN
    _final_permissions := _role_permissions || _user_overrides;
  ELSE
    _final_permissions := COALESCE(_role_permissions, '{"view": false}'::jsonb);
  END IF;

  RETURN _final_permissions;
END;
$$;

-- =====================================================
-- RLS POLICIES FOR ROLES TABLE
-- =====================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Everyone can view roles (needed for role selection)
CREATE POLICY "roles_select_all"
ON public.roles
FOR SELECT
TO authenticated
USING (true);

-- Only owners/admins can insert custom roles
CREATE POLICY "roles_insert_admin"
ON public.roles
FOR INSERT
TO authenticated
WITH CHECK (
  is_custom = true
  AND public.is_owner_or_admin(auth.uid())
);

-- Only owners/admins can update custom roles
CREATE POLICY "roles_update_admin"
ON public.roles
FOR UPDATE
TO authenticated
USING (
  is_custom = true
  AND public.is_owner_or_admin(auth.uid())
)
WITH CHECK (
  is_custom = true
  AND public.is_owner_or_admin(auth.uid())
);

-- Only owners/admins can delete custom roles
CREATE POLICY "roles_delete_admin"
ON public.roles
FOR DELETE
TO authenticated
USING (
  is_custom = true
  AND public.is_owner_or_admin(auth.uid())
);

-- =====================================================
-- RLS POLICIES FOR USER_ROLES TABLE
-- =====================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Owners/admins can view all roles in their shop
CREATE POLICY "user_roles_select_shop_admin"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.is_owner_or_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles p1, profiles p2
    WHERE p1.id = auth.uid()
    AND p2.id = user_roles.user_id
    AND p1.shop_id = p2.shop_id
  )
);

-- Only owners/admins can assign roles
CREATE POLICY "user_roles_insert_admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_owner_or_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles p1, profiles p2
    WHERE p1.id = auth.uid()
    AND p2.id = user_roles.user_id
    AND p1.shop_id = p2.shop_id
  )
);

-- Only owners/admins can update roles
CREATE POLICY "user_roles_update_admin"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.is_owner_or_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles p1, profiles p2
    WHERE p1.id = auth.uid()
    AND p2.id = user_roles.user_id
    AND p1.shop_id = p2.shop_id
  )
);

-- Only owners/admins can delete role assignments
CREATE POLICY "user_roles_delete_admin"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.is_owner_or_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles p1, profiles p2
    WHERE p1.id = auth.uid()
    AND p2.id = user_roles.user_id
    AND p1.shop_id = p2.shop_id
  )
);

-- =====================================================
-- RLS POLICIES FOR SHOP_ROLE_PERMISSIONS TABLE
-- =====================================================

ALTER TABLE public.shop_role_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view permissions for their shop
CREATE POLICY "shop_role_permissions_select_shop"
ON public.shop_role_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND shop_id = shop_role_permissions.shop_id
  )
);

-- Only owners/admins can insert role permissions
CREATE POLICY "shop_role_permissions_insert_admin"
ON public.shop_role_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_owner_or_admin(auth.uid())
  AND public.user_belongs_to_shop(auth.uid(), shop_id)
);

-- Only owners/admins can update role permissions
CREATE POLICY "shop_role_permissions_update_admin"
ON public.shop_role_permissions
FOR UPDATE
TO authenticated
USING (
  public.is_owner_or_admin(auth.uid())
  AND public.user_belongs_to_shop(auth.uid(), shop_id)
)
WITH CHECK (
  public.is_owner_or_admin(auth.uid())
  AND public.user_belongs_to_shop(auth.uid(), shop_id)
);

-- Only owners/admins can delete role permissions
CREATE POLICY "shop_role_permissions_delete_admin"
ON public.shop_role_permissions
FOR DELETE
TO authenticated
USING (
  public.is_owner_or_admin(auth.uid())
  AND public.user_belongs_to_shop(auth.uid(), shop_id)
);

-- =====================================================
-- RLS POLICIES FOR USER_PERMISSIONS TABLE
-- =====================================================

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own permission overrides
CREATE POLICY "user_permissions_select_own"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Owners/admins can view all user permissions in their shop
CREATE POLICY "user_permissions_select_shop_admin"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (
  public.is_owner_or_admin(auth.uid())
  AND public.user_belongs_to_shop(auth.uid(), shop_id)
);

-- Only owners/admins can insert user permission overrides
CREATE POLICY "user_permissions_insert_admin"
ON public.user_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_owner_or_admin(auth.uid())
  AND public.user_belongs_to_shop(auth.uid(), shop_id)
  AND public.user_belongs_to_shop(user_id, shop_id)
);

-- Only owners/admins can update user permission overrides
CREATE POLICY "user_permissions_update_admin"
ON public.user_permissions
FOR UPDATE
TO authenticated
USING (
  public.is_owner_or_admin(auth.uid())
  AND public.user_belongs_to_shop(auth.uid(), shop_id)
)
WITH CHECK (
  public.is_owner_or_admin(auth.uid())
  AND public.user_belongs_to_shop(auth.uid(), shop_id)
);

-- Only owners/admins can delete user permission overrides
CREATE POLICY "user_permissions_delete_admin"
ON public.user_permissions
FOR DELETE
TO authenticated
USING (
  public.is_owner_or_admin(auth.uid())
  AND public.user_belongs_to_shop(auth.uid(), shop_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_shop_role_permissions_lookup ON public.shop_role_permissions(shop_id, role_name, module);
CREATE INDEX IF NOT EXISTS idx_user_permissions_lookup ON public.user_permissions(user_id, shop_id, module);
CREATE INDEX IF NOT EXISTS idx_profiles_shop_id ON public.profiles(shop_id);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION public.is_owner_or_admin IS 'Security definer function to check if a user has owner or admin role';
COMMENT ON FUNCTION public.user_belongs_to_shop IS 'Security definer function to verify user belongs to a specific shop';
COMMENT ON FUNCTION public.get_user_effective_permissions IS 'Get combined role and user-specific permissions for a module';