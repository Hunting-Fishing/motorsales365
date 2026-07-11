-- Fix Missing Foreign Key Relationships and Restore RLS
-- This migration addresses the 400 Bad Request errors in UpcomingAppointments

-- Step 1: Add missing foreign key constraints to appointments table
ALTER TABLE public.appointments 
ADD CONSTRAINT fk_appointments_customer 
FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.appointments 
ADD CONSTRAINT fk_appointments_vehicle 
FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

ALTER TABLE public.appointments 
ADD CONSTRAINT fk_appointments_advisor 
FOREIGN KEY (advisor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Step 2: Ensure work_orders has proper foreign keys
ALTER TABLE public.work_orders 
ADD CONSTRAINT fk_work_orders_customer 
FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.work_orders 
ADD CONSTRAINT fk_work_orders_vehicle 
FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- Step 3: Ensure vehicles has proper foreign key to customers
ALTER TABLE public.vehicles 
ADD CONSTRAINT fk_vehicles_customer 
FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

-- Step 4: Re-enable RLS and create simple policies for core tables

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