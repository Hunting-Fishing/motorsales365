-- Add middle_name column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN middle_name text;

-- Add comment explaining the field
COMMENT ON COLUMN public.profiles.middle_name IS 'Middle name for legal/HR purposes and duplicate name disambiguation';