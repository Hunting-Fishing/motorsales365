CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(_user_id uuid, _module text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _shop_id UUID;
  _role_name TEXT;
  _role_permissions JSONB;
  _user_overrides JSONB;
  _final_permissions JSONB;
BEGIN
  -- Get user's shop
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

  -- FIX: Properly prioritize user overrides over potentially NULL role permissions
  IF _user_overrides IS NOT NULL THEN
    -- User overrides take full precedence
    _final_permissions := _user_overrides;
  ELSIF _role_permissions IS NOT NULL THEN
    -- Fall back to role permissions
    _final_permissions := _role_permissions;
  ELSE
    -- No permissions defined
    _final_permissions := '{"view": false}'::jsonb;
  END IF;

  RETURN _final_permissions;
END;
$function$;