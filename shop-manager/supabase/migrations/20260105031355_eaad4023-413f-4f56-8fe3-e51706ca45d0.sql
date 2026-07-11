-- Fix RLS policies for shops table to allow new shop creation during onboarding
-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can insert shop information" ON public.shops;
DROP POLICY IF EXISTS "Authenticated users can create their first shop" ON public.shops;

-- Create a proper policy that allows authenticated users without a shop to create one
CREATE POLICY "Users without shop can create their first shop" 
ON public.shops 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must not already have a shop
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE (profiles.id = auth.uid() OR profiles.user_id = auth.uid()) 
    AND profiles.shop_id IS NOT NULL
  )
);

-- Also ensure the update policy works correctly
DROP POLICY IF EXISTS "Users can update their shop information" ON public.shops;
CREATE POLICY "Users can update their shop information" 
ON public.shops 
FOR UPDATE 
TO authenticated
USING (
  id IN (
    SELECT shop_id FROM public.profiles 
    WHERE profiles.id = auth.uid() OR profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT shop_id FROM public.profiles 
    WHERE profiles.id = auth.uid() OR profiles.user_id = auth.uid()
  )
);