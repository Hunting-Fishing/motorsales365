-- Phase 1: Complete Database Structure Fixes (Corrected)

-- Add proper foreign key constraint between work_orders.technician_id and profiles.id
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

-- Ensure we have some sample technician profiles if none exist
INSERT INTO profiles (id, first_name, last_name, email, job_title, department, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Technician',
    'User ' || generate_series,
    'tech' || generate_series || '@example.com',
    'Automotive Technician',
    'Service',
    now(),
    now()
FROM generate_series(1, 3)
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE job_title LIKE '%Technician%')
ON CONFLICT (id) DO NOTHING;

-- Update work orders to have technician assignments from existing profiles
UPDATE work_orders 
SET technician_id = (
    SELECT id FROM profiles WHERE job_title LIKE '%Technician%' LIMIT 1
)
WHERE technician_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE job_title LIKE '%Technician%');

-- Create some sample customers if very few exist
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
WHERE (SELECT COUNT(*) FROM customers) < 5
ON CONFLICT (id) DO NOTHING;

-- Update work orders to have customer assignments from existing customers
UPDATE work_orders 
SET customer_id = (
    SELECT id FROM customers ORDER BY created_at LIMIT 1
)
WHERE customer_id IS NULL AND EXISTS (SELECT 1 FROM customers);

-- Create some sample vehicles if none exist
INSERT INTO vehicles (id, customer_id, make, model, year, vin, license_plate, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM customers ORDER BY created_at LIMIT 1),
    CASE generate_series % 4
        WHEN 0 THEN 'Toyota'
        WHEN 1 THEN 'Honda'
        WHEN 2 THEN 'Ford'
        ELSE 'Chevrolet'
    END,
    'Model ' || generate_series,
    2020 + (generate_series % 5),
    '1HGBH41JXMN' || LPAD(generate_series::text, 6, '0'),
    'ABC' || LPAD(generate_series::text, 4, '0'),
    now(),
    now()
FROM generate_series(1, 3)
WHERE NOT EXISTS (SELECT 1 FROM vehicles)
ON CONFLICT (id) DO NOTHING;

-- Update work orders to have vehicle assignments
UPDATE work_orders 
SET vehicle_id = (
    SELECT id FROM vehicles LIMIT 1
)
WHERE vehicle_id IS NULL AND EXISTS (SELECT 1 FROM vehicles);

-- Ensure work orders have realistic and varied data
UPDATE work_orders 
SET 
    status = CASE 
        WHEN random() < 0.2 THEN 'completed'
        WHEN random() < 0.5 THEN 'in_progress'
        WHEN random() < 0.8 THEN 'pending'
        ELSE 'assigned'
    END,
    estimated_hours = COALESCE(estimated_hours, (random() * 8 + 1)::numeric(5,2)),
    total_cost = COALESCE(NULLIF(total_cost, 0), (random() * 800 + 200)::numeric(10,2)),
    urgency_level = COALESCE(urgency_level, 
        CASE 
            WHEN random() < 0.2 THEN 'high'
            WHEN random() < 0.7 THEN 'medium'
            ELSE 'low'
        END
    ),
    description = COALESCE(description, 'Sample work order ' || SUBSTRING(id::text, 1, 8))
WHERE id IS NOT NULL;