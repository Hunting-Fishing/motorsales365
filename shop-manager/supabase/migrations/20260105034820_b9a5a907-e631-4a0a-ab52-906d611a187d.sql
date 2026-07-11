-- Create a transactional function to create workspace (organization + shop + role + modules)
CREATE OR REPLACE FUNCTION public.create_workspace(
  company_name text,
  selected_module_slugs text[] DEFAULT '{}'::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_shop_id uuid;
  v_owner_role_id uuid;
  v_existing_shop_id uuid;
BEGIN
  -- 1. Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Check if user already has a shop
  SELECT shop_id INTO v_existing_shop_id FROM profiles WHERE id = v_user_id;
  IF v_existing_shop_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already has a workspace';
  END IF;

  -- 3. Create organization
  INSERT INTO organizations (name, created_by)
  VALUES (company_name, v_user_id)
  RETURNING id INTO v_org_id;

  -- 4. Create shop
  INSERT INTO shops (name, organization_id, created_by)
  VALUES (company_name, v_org_id, v_user_id)
  RETURNING id INTO v_shop_id;

  -- 5. Update profile with shop_id
  UPDATE profiles SET shop_id = v_shop_id WHERE id = v_user_id;

  -- 6. Get owner role id
  SELECT id INTO v_owner_role_id FROM roles WHERE name = 'owner' LIMIT 1;
  
  -- 7. Assign owner role (if role exists and not already assigned)
  IF v_owner_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id, shop_id)
    VALUES (v_user_id, v_owner_role_id, v_shop_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 8. Enable selected modules
  IF array_length(selected_module_slugs, 1) > 0 THEN
    INSERT INTO shop_enabled_modules (shop_id, module_id, enabled_by)
    SELECT v_shop_id, bm.id, v_user_id
    FROM business_modules bm
    WHERE bm.slug = ANY(selected_module_slugs)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Return the created IDs
  RETURN jsonb_build_object(
    'organization_id', v_org_id,
    'shop_id', v_shop_id,
    'success', true
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_workspace(text, text[]) TO authenticated;