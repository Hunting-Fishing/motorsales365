-- Fix create_workspace to use correct user_roles schema (role_id, not role/shop_id)
CREATE OR REPLACE FUNCTION public.create_workspace(
  company_name TEXT,
  selected_module_slugs TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_existing_shop_id UUID;
  v_org_id UUID;
  v_shop_id UUID;
  v_industry TEXT;
  v_module_slug TEXT;
  v_module_id UUID;
  v_owner_role_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find the user's profile (handle both user_id and id patterns)
  SELECT id, shop_id INTO v_profile_id, v_existing_shop_id
  FROM profiles
  WHERE user_id = v_user_id OR id = v_user_id
  LIMIT 1;
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;
  
  -- Check if user already has a workspace
  IF v_existing_shop_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already has a workspace';
  END IF;
  
  -- Determine industry from selected modules (if any match business_industries)
  IF array_length(selected_module_slugs, 1) > 0 THEN
    SELECT bi.value INTO v_industry
    FROM business_industries bi
    WHERE bi.value = ANY(selected_module_slugs)
    LIMIT 1;
  END IF;
  
  -- Create organization
  INSERT INTO organizations (name)
  VALUES (company_name)
  RETURNING id INTO v_org_id;
  
  -- Create shop with organization_id and optional industry
  INSERT INTO shops (name, organization_id, industry, trial_started_at, trial_days)
  VALUES (company_name, v_org_id, v_industry, NOW(), 14)
  RETURNING id INTO v_shop_id;
  
  -- Update the user's profile with the new shop_id
  UPDATE profiles
  SET shop_id = v_shop_id
  WHERE id = v_profile_id;
  
  -- Look up the owner role ID from the roles table
  SELECT id INTO v_owner_role_id
  FROM roles
  WHERE name = 'owner'
  LIMIT 1;
  
  IF v_owner_role_id IS NULL THEN
    RAISE EXCEPTION 'Owner role not found in roles table';
  END IF;
  
  -- Assign owner role to the user using role_id (correct schema)
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_user_id, v_owner_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  -- Enable selected modules for the shop
  IF array_length(selected_module_slugs, 1) > 0 THEN
    FOREACH v_module_slug IN ARRAY selected_module_slugs
    LOOP
      SELECT id INTO v_module_id
      FROM business_modules
      WHERE slug = v_module_slug;
      
      IF v_module_id IS NOT NULL THEN
        INSERT INTO shop_enabled_modules (shop_id, module_id, enabled_at, enabled_by)
        VALUES (v_shop_id, v_module_id, NOW(), v_user_id)
        ON CONFLICT (shop_id, module_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'shop_id', v_shop_id,
    'organization_id', v_org_id,
    'industry', v_industry
  );
END;
$$;

-- Ensure authenticated users can execute this function
GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT, TEXT[]) TO authenticated;