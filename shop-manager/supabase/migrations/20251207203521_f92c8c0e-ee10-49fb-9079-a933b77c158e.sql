-- Complete Lisa's onboarding setup
DO $$
DECLARE
  lisa_user_id UUID := '8ca63b98-7a44-4f8a-8128-57787a149b75';
  new_org_id UUID;
  new_shop_id UUID;
  owner_role_id UUID;
BEGIN
  -- Create organization for Lisa
  INSERT INTO public.organizations (name)
  VALUES ('Lisa''s Company')
  RETURNING id INTO new_org_id;

  -- Create shop linked to organization
  INSERT INTO public.shops (name, organization_id)
  VALUES ('Lisa''s Company', new_org_id)
  RETURNING id INTO new_shop_id;

  -- Update Lisa's profile with shop_id
  UPDATE public.profiles
  SET shop_id = new_shop_id
  WHERE id = lisa_user_id OR user_id = lisa_user_id;

  -- Get owner role id
  SELECT id INTO owner_role_id FROM public.roles WHERE name = 'owner';

  -- Assign owner role to Lisa (delete existing first to avoid duplicates)
  DELETE FROM public.user_roles WHERE user_id = lisa_user_id;
  
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (lisa_user_id, owner_role_id);

  RAISE NOTICE 'Lisa setup complete: org_id=%, shop_id=%', new_org_id, new_shop_id;
END $$;