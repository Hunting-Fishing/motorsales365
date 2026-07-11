-- Create index for better query performance (if not exists)
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