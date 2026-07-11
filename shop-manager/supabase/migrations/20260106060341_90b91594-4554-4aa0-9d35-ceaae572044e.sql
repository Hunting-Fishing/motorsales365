-- Create a platform_developers table for dedicated developer accounts
-- These accounts will have god-mode access across the entire platform

CREATE TABLE public.platform_developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.platform_developers ENABLE ROW LEVEL SECURITY;

-- Only platform developers can view other platform developers
CREATE POLICY "Platform developers can view all" 
ON public.platform_developers 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.platform_developers pd 
    WHERE pd.user_id = auth.uid() AND pd.is_active = true
  )
);

-- Only platform developers can manage platform developers
CREATE POLICY "Platform developers can manage" 
ON public.platform_developers 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.platform_developers pd 
    WHERE pd.user_id = auth.uid() AND pd.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.platform_developers pd 
    WHERE pd.user_id = auth.uid() AND pd.is_active = true
  )
);

-- Create a function to check if a user is a platform developer
CREATE OR REPLACE FUNCTION public.is_platform_developer(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.platform_developers 
    WHERE user_id = _user_id 
    AND is_active = true
  )
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_platform_developers_updated_at
BEFORE UPDATE ON public.platform_developers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment explaining the table
COMMENT ON TABLE public.platform_developers IS 'Stores platform-level developer accounts with god-mode access across all shops and modules';