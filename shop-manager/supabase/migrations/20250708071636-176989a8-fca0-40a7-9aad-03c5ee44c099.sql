-- Phase 1: Complete Database Structure Fixes

-- Add proper foreign key constraint between work_orders.technician_id and profiles.id
-- First check if constraint already exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'work_orders_technician_id_fkey' 
        AND table_name = 'work_orders'
    ) THEN
        ALTER TABLE work_orders 
        ADD CONSTRAINT work_orders_technician_id_fkey 
        FOREIGN KEY (technician_id) REFERENCES profiles(id);
    END IF;
END $$;

-- Add foreign key for customer relationship if it doesn't exist
DO $$
BEGIN
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

-- Add foreign key for vehicle relationship if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'work_orders_vehicle_id_fkey' 
        AND table_name = 'work_orders'
    ) THEN
        ALTER TABLE work_orders 
        ADD CONSTRAINT work_orders_vehicle_id_fkey 
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);
    END IF;
END $$;

-- Ensure we have some sample profiles (technicians) if none exist
INSERT INTO profiles (id, display_name, role, email, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Tech ' || generate_series,
    'technician',
    'tech' || generate_series || '@example.com',
    now(),
    now()
FROM generate_series(1, 3)
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'technician')
ON CONFLICT (id) DO NOTHING;

-- Update work orders to have technician assignments from existing profiles
UPDATE work_orders 
SET technician_id = (
    SELECT id FROM profiles WHERE role = 'technician' LIMIT 1
)
WHERE technician_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE role = 'technician');

-- Create some sample customers if none exist
INSERT INTO customers (id, first_name, last_name, email, phone, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Customer',
    'Name ' || generate_series,
    'customer' || generate_series || '@example.com',
    '+1234567890' || generate_series,
    now(),
    now()
FROM generate_series(1, 5)
WHERE NOT EXISTS (SELECT 1 FROM customers)
ON CONFLICT (id) DO NOTHING;

-- Update work orders to have customer assignments from existing customers
UPDATE work_orders 
SET customer_id = (
    SELECT id FROM customers ORDER BY created_at LIMIT 1
)
WHERE customer_id IS NULL AND EXISTS (SELECT 1 FROM customers);

-- Ensure work orders have realistic data with proper status values
UPDATE work_orders 
SET 
    status = CASE 
        WHEN random() < 0.3 THEN 'completed'
        WHEN random() < 0.6 THEN 'in_progress'
        ELSE 'pending'
    END,
    estimated_hours = CASE 
        WHEN estimated_hours IS NULL THEN (random() * 8 + 1)::numeric(5,2)
        ELSE estimated_hours
    END,
    total_cost = CASE 
        WHEN total_cost IS NULL OR total_cost = 0 THEN 
            (random() * 500 + 100)::numeric(10,2)
        ELSE total_cost
    END,
    start_time = CASE 
        WHEN start_time IS NULL THEN 
            created_at + (random() * interval '7 days')
        ELSE start_time
    END,
    end_time = CASE 
        WHEN end_time IS NULL THEN 
            created_at + (random() * interval '14 days')
        ELSE end_time
    END,
    urgency_level = CASE 
        WHEN urgency_level IS NULL THEN 
            CASE 
                WHEN random() < 0.2 THEN 'high'
                WHEN random() < 0.7 THEN 'medium'
                ELSE 'low'
            END
        ELSE urgency_level
    END
WHERE id IS NOT NULL;