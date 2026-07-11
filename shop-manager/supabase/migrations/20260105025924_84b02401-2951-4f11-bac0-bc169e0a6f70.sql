-- Function to assign owner role when profile is linked to a shop
CREATE OR REPLACE FUNCTION public.assign_owner_on_profile_shop_update()
RETURNS TRIGGER AS $$
DECLARE
  owner_role_id uuid;
BEGIN
  -- Only proceed if shop_id was set (null -> value)
  IF OLD.shop_id IS NULL AND NEW.shop_id IS NOT NULL THEN
    -- Get the owner role ID
    SELECT id INTO owner_role_id FROM public.roles WHERE name = 'owner' LIMIT 1;
    
    IF owner_role_id IS NOT NULL AND NEW.user_id IS NOT NULL THEN
      -- Insert owner role for this user
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (NEW.user_id, owner_role_id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS assign_owner_on_profile_shop_update_trigger ON public.profiles;
CREATE TRIGGER assign_owner_on_profile_shop_update_trigger
  AFTER UPDATE OF shop_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_owner_on_profile_shop_update();

-- Also handle INSERT for new profiles with shop_id
CREATE OR REPLACE FUNCTION public.assign_owner_on_profile_insert()
RETURNS TRIGGER AS $$
DECLARE
  owner_role_id uuid;
BEGIN
  -- Only proceed if shop_id is set
  IF NEW.shop_id IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    -- Get the owner role ID
    SELECT id INTO owner_role_id FROM public.roles WHERE name = 'owner' LIMIT 1;
    
    IF owner_role_id IS NOT NULL THEN
      -- Insert owner role for this user
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (NEW.user_id, owner_role_id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS assign_owner_on_profile_insert_trigger ON public.profiles;
CREATE TRIGGER assign_owner_on_profile_insert_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_owner_on_profile_insert();

-- Fix Darren's missing owner role (if he has a shop)
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.user_id, r.id
FROM public.profiles p
CROSS JOIN public.roles r
WHERE p.user_id = '15771cce-cbee-4263-8a36-0a0b9d6f02fc'
  AND p.shop_id IS NOT NULL
  AND r.name = 'owner'
ON CONFLICT (user_id, role_id) DO NOTHING;