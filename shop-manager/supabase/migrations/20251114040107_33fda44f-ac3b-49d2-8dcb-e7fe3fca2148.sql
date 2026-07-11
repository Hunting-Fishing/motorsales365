-- Add shop_id column to work_orders table for multi-tenant support (nullable initially)
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id);

-- Set shop_id for existing work orders based on the user who created them
UPDATE work_orders wo
SET shop_id = (
  SELECT p.shop_id 
  FROM profiles p 
  WHERE p.id = wo.created_by
)
WHERE shop_id IS NULL AND created_by IS NOT NULL AND created_by IN (SELECT id FROM profiles);

-- For any work orders without a created_by or where profile doesn't exist,
-- set shop_id to the first available shop (fallback for data integrity)
UPDATE work_orders wo
SET shop_id = (SELECT id FROM shops LIMIT 1)
WHERE shop_id IS NULL;

-- Now make shop_id required for new records (only if all existing records have shop_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM work_orders WHERE shop_id IS NULL) THEN
    ALTER TABLE work_orders ALTER COLUMN shop_id SET NOT NULL;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_work_orders_shop_id ON work_orders(shop_id);

-- Update RLS policies to include shop_id filtering
DROP POLICY IF EXISTS "Users can view work orders in their shop" ON work_orders;
DROP POLICY IF EXISTS "Users can create work orders in their shop" ON work_orders;
DROP POLICY IF EXISTS "Users can update work orders in their shop" ON work_orders;
DROP POLICY IF EXISTS "Users can delete work orders in their shop" ON work_orders;

-- Create comprehensive RLS policies with shop_id
CREATE POLICY "Users can view work orders in their shop"
ON work_orders FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create work orders in their shop"
ON work_orders FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update work orders in their shop"
ON work_orders FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete work orders in their shop"
ON work_orders FOR DELETE
USING (
  shop_id IN (
    SELECT shop_id FROM profiles WHERE id = auth.uid()
  )
);