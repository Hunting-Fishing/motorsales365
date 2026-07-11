-- Drop conflicting INSERT policy that uses profiles.user_id pattern
DROP POLICY IF EXISTS "Users can create maintenance requests for their shop" ON maintenance_requests;

-- Keep the working policy that uses profiles.id = auth.uid() pattern
-- If it doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_requests' 
    AND policyname = 'Users can create maintenance requests'
  ) THEN
    CREATE POLICY "Users can create maintenance requests" 
    ON maintenance_requests 
    FOR INSERT 
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.shop_id = maintenance_requests.shop_id
      )
    );
  END IF;
END $$;