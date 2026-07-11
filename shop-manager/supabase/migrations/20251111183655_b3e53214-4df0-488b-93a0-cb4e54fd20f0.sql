-- Fix the INSERT policy for equipment_assets to include WITH CHECK clause
DROP POLICY IF EXISTS "Users can insert equipment into their shop" ON equipment_assets;

CREATE POLICY "Users can insert equipment into their shop"
ON equipment_assets
FOR INSERT
TO public
WITH CHECK (
  shop_id IN (
    SELECT shop_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);