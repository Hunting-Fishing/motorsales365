-- Allow onboarding users to read organizations (during setup)
-- This fixes the issue where INSERT succeeds but .select() fails
CREATE POLICY "Users can read organizations during onboarding"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  -- If user has no shop_id, they're in onboarding and should be able 
  -- to read the org they just created
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE (id = auth.uid() OR user_id = auth.uid()) 
    AND shop_id IS NOT NULL
  )
);