-- Fix Missing Foreign Key Relationships and Restore RLS (Safe Version)
-- This migration addresses the 400 Bad Request errors in UpcomingAppointments

-- Step 1: Add missing foreign key constraints (only if they don't exist)
DO $$
BEGIN
    -- Check and add appointments foreign keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_appointments_customer' 
                   AND table_name = 'appointments') THEN
        ALTER TABLE public.appointments 
        ADD CONSTRAINT fk_appointments_customer 
        FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_appointments_vehicle' 
                   AND table_name = 'appointments') THEN
        ALTER TABLE public.appointments 
        ADD CONSTRAINT fk_appointments_vehicle 
        FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_appointments_advisor' 
                   AND table_name = 'appointments') THEN
        ALTER TABLE public.appointments 
        ADD CONSTRAINT fk_appointments_advisor 
        FOREIGN KEY (advisor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Check and add work_orders foreign keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_work_orders_customer' 
                   AND table_name = 'work_orders') THEN
        ALTER TABLE public.work_orders 
        ADD CONSTRAINT fk_work_orders_customer 
        FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_work_orders_vehicle' 
                   AND table_name = 'work_orders') THEN
        ALTER TABLE public.work_orders 
        ADD CONSTRAINT fk_work_orders_vehicle 
        FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;
    END IF;

    -- Check and add vehicles foreign key
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_vehicles_customer' 
                   AND table_name = 'vehicles') THEN
        ALTER TABLE public.vehicles 
        ADD CONSTRAINT fk_vehicles_customer 
        FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- Step 2: Re-enable RLS and create simple policies for core tables

-- CUSTOMERS table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_shop_access" 
ON public.customers FOR ALL 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- APPOINTMENTS table  
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_shop_access" 
ON public.appointments FOR ALL 
USING (customer_id IN (SELECT id FROM customers WHERE shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())));

-- WORK_ORDERS table
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_orders_shop_access" 
ON public.work_orders FOR ALL 
USING (customer_id IN (SELECT id FROM customers WHERE shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())));

-- VEHICLES table
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_shop_access" 
ON public.vehicles FOR ALL 
USING (customer_id IN (SELECT id FROM customers WHERE shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())));