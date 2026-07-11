-- Update get_user_effective_permissions to give owners full access by default
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(_user_id uuid, _module text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _shop_id UUID;
  _profile_id UUID;
  _role_name TEXT;
  _role_permissions JSONB;
  _user_overrides JSONB;
  _final_permissions JSONB;
BEGIN
  -- Get user's profile ID and shop using the user_id column (which stores auth.uid())
  SELECT p.id, p.shop_id INTO _profile_id, _shop_id
  FROM profiles p
  WHERE p.user_id = _user_id;

  -- If no profile found, try looking up by id directly (backward compatibility)
  IF _profile_id IS NULL THEN
    SELECT p.id, p.shop_id INTO _profile_id, _shop_id
    FROM profiles p
    WHERE p.id = _user_id;
  END IF;

  IF _shop_id IS NULL OR _profile_id IS NULL THEN
    RETURN '{"view": false}'::jsonb;
  END IF;

  -- Get user's role name
  -- Try both patterns: user_roles.user_id = auth.uid() OR user_roles.user_id = profile.id
  SELECT r.name INTO _role_name
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = _user_id  -- Direct auth.uid() match (newer pattern)
     OR ur.user_id = _profile_id  -- Profile.id match (older pattern)
  LIMIT 1;

  IF _role_name IS NULL THEN
    RETURN '{"view": false}'::jsonb;
  END IF;

  -- OWNERS ALWAYS GET FULL ACCESS TO ALL MODULES
  IF _role_name = 'owner' THEN
    RETURN '{"view": true, "create": true, "edit": true, "delete": true}'::jsonb;
  END IF;

  -- Get role default permissions
  SELECT srp.actions INTO _role_permissions
  FROM shop_role_permissions srp
  WHERE srp.shop_id = _shop_id
    AND srp.role_name = _role_name
    AND srp.module = _module;

  -- Get user-specific permission overrides
  -- Try both patterns: user_permissions.user_id = auth.uid() OR profile.id
  SELECT up.actions INTO _user_overrides
  FROM user_permissions up
  WHERE (up.user_id = _user_id OR up.user_id = _profile_id)
    AND up.shop_id = _shop_id
    AND up.module = _module
  LIMIT 1;

  -- Properly prioritize user overrides over potentially NULL role permissions
  IF _user_overrides IS NOT NULL THEN
    _final_permissions := _user_overrides;
  ELSIF _role_permissions IS NOT NULL THEN
    _final_permissions := _role_permissions;
  ELSE
    _final_permissions := '{"view": false}'::jsonb;
  END IF;

  RETURN _final_permissions;
END;
$function$;