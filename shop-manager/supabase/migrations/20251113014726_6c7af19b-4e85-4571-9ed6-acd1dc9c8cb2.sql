-- Create security definer function to get user's shop_id
-- This bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.get_user_shop_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id 
  FROM public.profiles 
  WHERE id = user_id
  LIMIT 1;
$$;

-- Drop existing RLS policies on equipment_assets
DROP POLICY IF EXISTS "Users can view equipment from their shop" ON public.equipment_assets;
DROP POLICY IF EXISTS "Users can insert equipment into their shop" ON public.equipment_assets;
DROP POLICY IF EXISTS "Users can update equipment in their shop" ON public.equipment_assets;
DROP POLICY IF EXISTS "Users can delete equipment from their shop" ON public.equipment_assets;

-- Recreate RLS policies using the security definer function
CREATE POLICY "Users can view equipment from their shop" 
ON public.equipment_assets 
FOR SELECT 
TO public
USING (shop_id = public.get_user_shop_id(auth.uid()));

CREATE POLICY "Users can insert equipment into their shop" 
ON public.equipment_assets 
FOR INSERT 
TO public
WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()));

CREATE POLICY "Users can update equipment in their shop" 
ON public.equipment_assets 
FOR UPDATE 
TO public
USING (shop_id = public.get_user_shop_id(auth.uid()));

CREATE POLICY "Users can delete equipment from their shop" 
ON public.equipment_assets 
FOR DELETE 
TO public
USING (shop_id = public.get_user_shop_id(auth.uid()));