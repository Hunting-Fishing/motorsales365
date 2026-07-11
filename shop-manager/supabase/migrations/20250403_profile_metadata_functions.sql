
-- Create a function to get profile metadata
CREATE OR REPLACE FUNCTION public.get_profile_metadata(profile_id_param UUID)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id,
    pm.profile_id,
    pm.metadata,
    pm.created_at,
    pm.updated_at
  FROM public.profile_metadata pm
  WHERE pm.profile_id = profile_id_param;
END;
$$;

-- Create function to update profile metadata
CREATE OR REPLACE FUNCTION public.update_profile_metadata(
  profile_id_param UUID,
  metadata_param JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_id UUID;
BEGIN
  UPDATE public.profile_metadata
  SET 
    metadata = metadata_param,
    updated_at = NOW()
  WHERE profile_id = profile_id_param
  RETURNING id INTO updated_id;
  
  RETURN updated_id;
END;
$$;

-- Create function to insert profile metadata
CREATE OR REPLACE FUNCTION public.insert_profile_metadata(
  profile_id_param UUID,
  metadata_param JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.profile_metadata (
    profile_id,
    metadata
  ) VALUES (
    profile_id_param,
    metadata_param
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Create a master function that creates all the above functions
CREATE OR REPLACE FUNCTION public.create_profile_metadata_functions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function exists to be called by the edge function
  -- No need to implement anything here as we've already created the functions separately
  RETURN;
END;
$$;
