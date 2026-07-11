-- Fix RLS policies for work_order_notifications table
-- Drop ALL existing policies first
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'work_order_notifications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON work_order_notifications', pol.policyname);
    END LOOP;
END $$;

-- Create policies that allow the SECURITY DEFINER trigger to work
CREATE POLICY "Users can view notifications in their shop"
ON work_order_notifications FOR SELECT
USING (
  work_order_id IN (
    SELECT id FROM work_orders 
    WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "System can insert notifications"
ON work_order_notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update notifications in their shop"
ON work_order_notifications FOR UPDATE
USING (
  work_order_id IN (
    SELECT id FROM work_orders 
    WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete notifications in their shop"
ON work_order_notifications FOR DELETE
USING (
  work_order_id IN (
    SELECT id FROM work_orders 
    WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);