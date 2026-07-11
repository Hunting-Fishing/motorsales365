-- Drop any conflicting triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS link_auth_user_trigger ON auth.users;

-- Drop the old conflicting function if it exists
DROP FUNCTION IF EXISTS public.link_auth_user_to_profile() CASCADE;

-- Update handle_new_user to be the single source of truth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Check if profile exists by email
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email) THEN
    -- Update existing profile - link to auth user
    UPDATE public.profiles
    SET user_id = NEW.id,
        has_auth_account = true,
        invitation_accepted_at = NOW(),
        updated_at = NOW()
    WHERE email = NEW.email;
  ELSE
    -- Create new profile with auth user's ID
    INSERT INTO public.profiles (id, user_id, email, first_name, last_name, has_auth_account, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.id, 
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''), 
      COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
      true,
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate single trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();