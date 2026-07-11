-- Drop existing policies on equipment_assets
DROP POLICY IF EXISTS "Users can view equipment assets in their shop" ON equipment_assets;
DROP POLICY IF EXISTS "Users can create equipment assets in their shop" ON equipment_assets;
DROP POLICY IF EXISTS "Users can update equipment assets in their shop" ON equipment_assets;
DROP POLICY IF EXISTS "Users can delete equipment assets in their shop" ON equipment_assets;

-- Create new policies using get_user_shop_id_secure which works correctly
CREATE POLICY "Users can view equipment assets in their shop" 
ON equipment_assets FOR SELECT 
USING (shop_id = public.get_user_shop_id_secure(auth.uid()));

CREATE POLICY "Users can create equipment assets in their shop" 
ON equipment_assets FOR INSERT 
WITH CHECK (shop_id = public.get_user_shop_id_secure(auth.uid()));

CREATE POLICY "Users can update equipment assets in their shop" 
ON equipment_assets FOR UPDATE 
USING (shop_id = public.get_user_shop_id_secure(auth.uid()));

CREATE POLICY "Users can delete equipment assets in their shop" 
ON equipment_assets FOR DELETE 
USING (shop_id = public.get_user_shop_id_secure(auth.uid()));