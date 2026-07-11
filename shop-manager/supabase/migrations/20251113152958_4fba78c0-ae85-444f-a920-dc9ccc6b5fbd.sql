-- Fix INSERT policy to properly check shop_id for new profiles

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Admins can insert same shop profiles" ON public.profiles;

-- Create correct INSERT policy that checks the shop_id being inserted matches user's shop
CREATE POLICY "Admins can insert profiles in their shop"
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must be admin/owner
  is_admin_or_owner_secure(auth.uid()) 
  AND 
  -- The shop_id being inserted must match the user's shop_id
  shop_id = (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
);