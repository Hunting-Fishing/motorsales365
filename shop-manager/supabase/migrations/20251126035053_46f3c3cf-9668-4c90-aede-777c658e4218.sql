-- Update the trigger function to handle existing profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only insert if profile doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = new.email) THEN
    INSERT INTO public.profiles (id, user_id, email, first_name, last_name, has_auth_account)
    VALUES (
      gen_random_uuid(), 
      new.id, 
      new.email,
      new.raw_user_meta_data ->> 'first_name', 
      new.raw_user_meta_data ->> 'last_name',
      true
    );
  ELSE
    -- Update existing profile with auth user_id
    UPDATE public.profiles
    SET user_id = new.id,
        has_auth_account = true,
        invitation_accepted_at = now()
    WHERE email = new.email AND user_id IS NULL;
  END IF;
  RETURN new;
END;
$$;