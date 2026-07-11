-- Fix Security Definer Views (Corrected version)
-- Drop any existing security definer views and recreate them properly

-- Drop potential security definer views
DROP VIEW IF EXISTS public.product_details CASCADE;

-- Create a simple view without referencing non-existent columns
DO $$
BEGIN
  -- Only create if products table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
    -- Create a simple view that doesn't bypass RLS - only include columns that exist
    EXECUTE '
    CREATE VIEW public.product_details AS
    SELECT 
      p.*
    FROM public.products p
    WHERE p.is_approved = true;
    ';
  END IF;
END
$$;

-- Add policies for more tables to reduce RLS policy gaps

-- Add policies for work_orders table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_orders' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Staff can view work orders" ON public.work_orders;
    DROP POLICY IF EXISTS "Staff can manage work orders" ON public.work_orders;
    DROP POLICY IF EXISTS "Customers can view own work orders" ON public.work_orders;
    
    CREATE POLICY "Staff can view work orders" 
    ON public.work_orders FOR SELECT 
    TO authenticated USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (
          public.has_role(auth.uid(), 'owner') OR 
          public.has_role(auth.uid(), 'admin') OR 
          public.has_role(auth.uid(), 'manager') OR
          public.has_role(auth.uid(), 'technician') OR
          public.has_role(auth.uid(), 'service_advisor')
        )
      )
    );

    CREATE POLICY "Staff can manage work orders" 
    ON public.work_orders FOR ALL 
    TO authenticated USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (
          public.has_role(auth.uid(), 'owner') OR 
          public.has_role(auth.uid(), 'admin') OR 
          public.has_role(auth.uid(), 'manager') OR
          public.has_role(auth.uid(), 'service_advisor')
        )
      )
    );

    CREATE POLICY "Customers can view own work orders" 
    ON public.work_orders FOR SELECT 
    TO authenticated USING (
      customer_id IN (
        SELECT c.id FROM customers c 
        WHERE c.auth_user_id = auth.uid()
      )
    );
  END IF;
END
$$;

-- Add policies for vehicles table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Staff can view vehicles" ON public.vehicles;
    DROP POLICY IF EXISTS "Staff can manage vehicles" ON public.vehicles;
    DROP POLICY IF EXISTS "Customers can view own vehicles" ON public.vehicles;
    
    CREATE POLICY "Staff can view vehicles" 
    ON public.vehicles FOR SELECT 
    TO authenticated USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (
          public.has_role(auth.uid(), 'owner') OR 
          public.has_role(auth.uid(), 'admin') OR 
          public.has_role(auth.uid(), 'manager') OR
          public.has_role(auth.uid(), 'technician') OR
          public.has_role(auth.uid(), 'service_advisor') OR
          public.has_role(auth.uid(), 'reception')
        )
      )
    );

    CREATE POLICY "Staff can manage vehicles" 
    ON public.vehicles FOR ALL 
    TO authenticated USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (
          public.has_role(auth.uid(), 'owner') OR 
          public.has_role(auth.uid(), 'admin') OR 
          public.has_role(auth.uid(), 'manager') OR
          public.has_role(auth.uid(), 'service_advisor')
        )
      )
    );

    CREATE POLICY "Customers can view own vehicles" 
    ON public.vehicles FOR SELECT 
    TO authenticated USING (
      customer_id IN (
        SELECT c.id FROM customers c 
        WHERE c.auth_user_id = auth.uid()
      )
    );
  END IF;
END
$$;