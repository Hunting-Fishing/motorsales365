-- Fix RLS policies for work_order_notifications table
-- The trigger handle_work_order_status_change() needs to be able to insert notifications

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON work_order_notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON work_order_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON work_order_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON work_order_notifications;

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