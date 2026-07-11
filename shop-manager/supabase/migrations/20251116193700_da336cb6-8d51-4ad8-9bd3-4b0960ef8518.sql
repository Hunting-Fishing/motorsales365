
-- Function to get effective user permissions (individual overrides OR role defaults)
CREATE OR REPLACE FUNCTION get_user_effective_permissions(
  _user_id uuid,
  _module text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_shop uuid;
  user_override jsonb;
  role_perms jsonb;
  user_role_name text;
BEGIN
  -- Get user's shop
  SELECT shop_id INTO user_shop FROM profiles WHERE id = _user_id;
  
  -- Check for individual user permission override first
  SELECT actions INTO user_override
  FROM user_permissions
  WHERE user_id = _user_id 
    AND shop_id = user_shop
    AND module = _module;
  
  -- If user has custom permissions, return those
  IF user_override IS NOT NULL THEN
    RETURN user_override;
  END IF;
  
  -- Otherwise, get permissions from their role
  SELECT r.name INTO user_role_name
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = _user_id
  LIMIT 1;
  
  IF user_role_name IS NOT NULL THEN
    SELECT actions INTO role_perms
    FROM shop_role_permissions
    WHERE shop_id = user_shop
      AND role_name = user_role_name
      AND module = _module;
    
    IF role_perms IS NOT NULL THEN
      RETURN role_perms;
    END IF;
  END IF;
  
  -- Default deny all
  RETURN '{"view": false, "create": false, "edit": false, "delete": false}'::jsonb;
END;
$$;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
  _user_id uuid,
  _module text,
  _action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  perms jsonb;
BEGIN
  -- Owner always has all permissions
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.name = 'owner'
  ) THEN
    RETURN true;
  END IF;
  
  -- Get effective permissions
  perms := get_user_effective_permissions(_user_id, _module);
  
  -- Check if action is allowed
  RETURN COALESCE((perms->>_action)::boolean, false);
END;
$$;

COMMENT ON FUNCTION get_user_effective_permissions IS 'Gets effective permissions for user - checks individual overrides first, then role defaults';
COMMENT ON FUNCTION user_has_permission IS 'Checks if user has specific permission for a module and action';
