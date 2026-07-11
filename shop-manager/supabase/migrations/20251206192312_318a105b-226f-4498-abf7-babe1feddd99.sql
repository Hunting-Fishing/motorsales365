-- Fix maintenance_requests RLS policies
-- Issue: INSERT policy assigned to 'public' role instead of 'authenticated'
-- Issue: Inconsistent profile lookup pattern across policies

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can create maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can create maintenance requests for their shop" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can view maintenance requests from their shop" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can update maintenance requests in their shop" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can delete maintenance requests from their shop" ON maintenance_requests;

-- Recreate INSERT policy with authenticated role
CREATE POLICY "Users can create maintenance requests" 
ON maintenance_requests 
FOR INSERT 
TO authenticated
WITH CHECK (
  shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
);

-- Recreate SELECT policy with consistent pattern
CREATE POLICY "Users can view maintenance requests from their shop" 
ON maintenance_requests 
FOR SELECT 
TO authenticated
USING (
  shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
);

-- Recreate UPDATE policy with consistent pattern
CREATE POLICY "Users can update maintenance requests in their shop"
ON maintenance_requests 
FOR UPDATE 
TO authenticated
USING (
  shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
);

-- Recreate DELETE policy with consistent pattern
CREATE POLICY "Users can delete maintenance requests from their shop"
ON maintenance_requests 
FOR DELETE 
TO authenticated
USING (
  shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
);