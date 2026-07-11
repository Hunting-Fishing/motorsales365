
-- Create user_permissions table for individual employee permission overrides
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  module text NOT NULL,
  actions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  notes text,
  UNIQUE(user_id, shop_id, module)
);

CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_shop ON user_permissions(shop_id);

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON user_permissions FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR shop_id = get_user_shop_id(auth.uid()));

-- Owners and managers can manage user permissions
CREATE POLICY "Managers can insert user permissions"
ON user_permissions FOR INSERT
TO authenticated
WITH CHECK (
  shop_id = get_user_shop_id(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('owner', 'admin', 'manager', 'operations_manager')
  )
);

CREATE POLICY "Managers can update user permissions"
ON user_permissions FOR UPDATE
TO authenticated
USING (
  shop_id = get_user_shop_id(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('owner', 'admin', 'manager', 'operations_manager')
  )
);

CREATE POLICY "Managers can delete user permissions"
ON user_permissions FOR DELETE
TO authenticated
USING (
  shop_id = get_user_shop_id(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('owner', 'admin', 'manager', 'operations_manager')
  )
);

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

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_permissions_updated_at
BEFORE UPDATE ON user_permissions
FOR EACH ROW
EXECUTE FUNCTION update_user_permissions_updated_at();

COMMENT ON TABLE user_permissions IS 'Individual employee permission overrides - allows custom permissions per user beyond their role defaults';
COMMENT ON FUNCTION get_user_effective_permissions IS 'Gets effective permissions for user - checks individual overrides first, then role defaults';
COMMENT ON FUNCTION user_has_permission IS 'Checks if user has specific permission for a module and action';
