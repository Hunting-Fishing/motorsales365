-- Add user_id column to profiles table for auth user linking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Update the handle_new_user function to work correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Check if profile exists by email
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email) THEN
    -- Update existing profile with auth user_id
    UPDATE public.profiles
    SET user_id = NEW.id,
        has_auth_account = true,
        invitation_accepted_at = NOW(),
        updated_at = NOW()
    WHERE email = NEW.email AND (user_id IS NULL OR user_id != NEW.id);
  ELSE
    -- Create new profile
    INSERT INTO public.profiles (id, user_id, email, first_name, last_name, has_auth_account, created_at, updated_at)
    VALUES (
      gen_random_uuid(), 
      NEW.id, 
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name', 
      NEW.raw_user_meta_data ->> 'last_name',
      true,
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();