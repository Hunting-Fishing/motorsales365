-- Create security definer function to safely get user's shop_id
CREATE OR REPLACE FUNCTION public.get_user_shop_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can read profiles from their shop" ON public.profiles;

-- Create a new policy that uses the security definer function
CREATE POLICY "Users can read profiles from their shop"
ON public.profiles
FOR SELECT
USING (shop_id = public.get_user_shop_id());