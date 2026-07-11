-- Fix Foreign Key Relationships and RLS Policies (Safe Version)

-- First, let's clean up ALL existing policies on these tables
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on customers table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'customers' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON customers';
    END LOOP;

    -- Drop all existing policies on vehicles table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'vehicles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON vehicles';
    END LOOP;

    -- Drop all existing policies on work_orders table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'work_orders' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON work_orders';
    END LOOP;

    -- Drop all existing policies on appointments table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'appointments' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON appointments';
    END LOOP;
END $$;

-- Enable RLS on core tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Add missing foreign key constraints (with proper error handling)
DO $$ 
BEGIN
    -- Add foreign key for appointments -> customers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_customer_id_fkey' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments 
        ADD CONSTRAINT appointments_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for appointments -> vehicles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_vehicle_id_fkey' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments 
        ADD CONSTRAINT appointments_vehicle_id_fkey 
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
    END IF;

    -- Add foreign key for work_orders -> customers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'work_orders_customer_id_fkey' 
        AND table_name = 'work_orders'
    ) THEN
        ALTER TABLE work_orders 
        ADD CONSTRAINT work_orders_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for work_orders -> vehicles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'work_orders_vehicle_id_fkey' 
        AND table_name = 'work_orders'
    ) THEN
        ALTER TABLE work_orders 
        ADD CONSTRAINT work_orders_vehicle_id_fkey 
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
    END IF;

    -- Add foreign key for vehicles -> customers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'vehicles_customer_id_fkey' 
        AND table_name = 'vehicles'
    ) THEN
        ALTER TABLE vehicles 
        ADD CONSTRAINT vehicles_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create clean, simple RLS policies for customers
CREATE POLICY "customers_shop_access" ON customers
FOR ALL TO authenticated
USING (
    shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
)
WITH CHECK (
    shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
);

-- Create clean, simple RLS policies for vehicles
CREATE POLICY "vehicles_shop_access" ON vehicles
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM customers c 
        WHERE c.id = vehicles.customer_id 
        AND c.shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM customers c 
        WHERE c.id = vehicles.customer_id 
        AND c.shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    )
);

-- Create clean, simple RLS policies for work_orders
CREATE POLICY "work_orders_shop_access" ON work_orders
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM customers c 
        WHERE c.id = work_orders.customer_id 
        AND c.shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM customers c 
        WHERE c.id = work_orders.customer_id 
        AND c.shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    )
);

-- Create clean, simple RLS policies for appointments
CREATE POLICY "appointments_shop_access" ON appointments
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM customers c 
        WHERE c.id = appointments.customer_id 
        AND c.shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM customers c 
        WHERE c.id = appointments.customer_id 
        AND c.shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    )
);