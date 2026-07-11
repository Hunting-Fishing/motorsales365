-- Fix Foreign Key Relationships and RLS Policies

-- First, let's clean up existing problematic policies
DROP POLICY IF EXISTS "appointments_shop_access" ON appointments;
DROP POLICY IF EXISTS "Enable read access for users based on shop_id" ON work_orders;
DROP POLICY IF EXISTS "Enable insert for users in their shop" ON work_orders;
DROP POLICY IF EXISTS "Enable update for users in their shop" ON work_orders;
DROP POLICY IF EXISTS "Enable delete for users in their shop" ON work_orders;
DROP POLICY IF EXISTS "Users can view vehicles from their shop" ON vehicles;
DROP POLICY IF EXISTS "Users can insert vehicles into their shop" ON vehicles;
DROP POLICY IF EXISTS "Users can update vehicles in their shop" ON vehicles;
DROP POLICY IF EXISTS "Users can delete vehicles from their shop" ON vehicles;
DROP POLICY IF EXISTS "Users can view customers from their shop" ON customers;
DROP POLICY IF EXISTS "Users can insert customers into their shop" ON customers;
DROP POLICY IF EXISTS "Users can update customers in their shop" ON customers;
DROP POLICY IF EXISTS "Users can delete customers from their shop" ON customers;

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

-- Fix security functions with proper search path
CREATE OR REPLACE FUNCTION public.get_user_shop_id_secure(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT shop_id FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner_secure(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_uuid 
    AND r.name::text IN ('admin', 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.check_user_role_secure(check_user_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = check_user_id AND r.name::text = required_role
  );
$$;