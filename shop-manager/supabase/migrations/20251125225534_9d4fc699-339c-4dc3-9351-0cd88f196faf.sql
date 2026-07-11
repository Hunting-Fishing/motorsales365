-- Add invitation tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMP WITH TIME ZONE;

-- Create function to link auth user to existing profile on signup
CREATE OR REPLACE FUNCTION public.link_auth_user_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Find matching profile by email and update it
  UPDATE public.profiles
  SET 
    id = NEW.id,
    has_auth_account = true,
    invitation_accepted_at = NOW(),
    updated_at = NOW()
  WHERE email = NEW.email
    AND has_auth_account = false
    AND id != NEW.id;
  
  -- If no existing profile was found, create one
  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      has_auth_account,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      true,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to link auth users to profiles
DROP TRIGGER IF EXISTS on_auth_user_created_link_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_link_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_auth_user_to_profile();

-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_no_auth 
ON public.profiles(email) 
WHERE has_auth_account = false;