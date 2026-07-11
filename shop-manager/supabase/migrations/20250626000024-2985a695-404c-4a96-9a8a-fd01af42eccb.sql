
-- Remove the duplicate foreign key constraint that's causing the "Could not embed" error
-- We'll keep the properly named constraint and remove the duplicate one
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS fk_work_orders_customer;

-- Ensure we have a proper foreign key constraint with the correct name
DO $$
BEGIN
    -- Check if the constraint exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'work_orders_customer_id_fkey' 
        AND table_name = 'work_orders'
    ) THEN
        ALTER TABLE work_orders 
        ADD CONSTRAINT work_orders_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id);
    END IF;
END $$;

-- Ensure work_orders table has proper RLS policies for visibility
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policy to allow authenticated users to view work orders
DROP POLICY IF EXISTS "Allow authenticated users to view work orders" ON work_orders;
CREATE POLICY "Allow authenticated users to view work orders" 
ON work_orders FOR SELECT 
TO authenticated 
USING (true);

-- Create or replace RLS policy to allow authenticated users to insert work orders
DROP POLICY IF EXISTS "Allow authenticated users to create work orders" ON work_orders;
CREATE POLICY "Allow authenticated users to create work orders" 
ON work_orders FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create or replace RLS policy to allow authenticated users to update work orders
DROP POLICY IF EXISTS "Allow authenticated users to update work orders" ON work_orders;
CREATE POLICY "Allow authenticated users to update work orders" 
ON work_orders FOR UPDATE 
TO authenticated 
USING (true);

-- Create or replace RLS policy to allow authenticated users to delete work orders
DROP POLICY IF EXISTS "Allow authenticated users to delete work orders" ON work_orders;
CREATE POLICY "Allow authenticated users to delete work orders" 
ON work_orders FOR DELETE 
TO authenticated 
USING (true);
