-- CRITICAL SECURITY FIXES: Address RLS policy gaps for existing tables only
-- This migration adds basic RLS policies to tables that exist and have RLS enabled but no policies

-- Fix existing tables with RLS enabled but no policies

-- 1. Customer and communication tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Staff can view all customers" ON public.customers;
    DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;
    
    CREATE POLICY "Staff can view all customers" 
    ON public.customers FOR SELECT 
    TO authenticated USING (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'owner') OR
      public.has_role(auth.uid(), 'manager')
    );

    CREATE POLICY "Staff can manage customers" 
    ON public.customers FOR ALL 
    TO authenticated USING (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'owner') OR
      public.has_role(auth.uid(), 'manager')
    );
  END IF;
END
$$;

-- 2. Departments and team management
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;
    DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
    
    CREATE POLICY "Authenticated users can view departments" 
    ON public.departments FOR SELECT 
    TO authenticated USING (true);

    CREATE POLICY "Admins can manage departments" 
    ON public.departments FOR ALL 
    TO authenticated USING (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'owner')
    );
  END IF;
END
$$;

-- 3. Inventory categories
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_categories' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Authenticated users can view inventory categories" ON public.inventory_categories;
    DROP POLICY IF EXISTS "Staff can manage inventory categories" ON public.inventory_categories;
    
    CREATE POLICY "Authenticated users can view inventory categories" 
    ON public.inventory_categories FOR SELECT 
    TO authenticated USING (true);

    CREATE POLICY "Staff can manage inventory categories" 
    ON public.inventory_categories FOR ALL 
    TO authenticated USING (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'owner') OR
      public.has_role(auth.uid(), 'manager')
    );
  END IF;
END
$$;

-- 4. Vehicle management
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Staff can view all vehicles" ON public.vehicles;
    DROP POLICY IF EXISTS "Customers can view their own vehicles" ON public.vehicles;
    DROP POLICY IF EXISTS "Staff can manage vehicles" ON public.vehicles;
    
    CREATE POLICY "Staff can view all vehicles" 
    ON public.vehicles FOR SELECT 
    TO authenticated USING (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'owner') OR
      public.has_role(auth.uid(), 'manager') OR
      public.has_role(auth.uid(), 'technician')
    );

    CREATE POLICY "Customers can view their own vehicles" 
    ON public.vehicles FOR SELECT 
    TO authenticated USING (
      owner_type = 'customer' AND customer_id IN (
        SELECT id FROM customers WHERE auth_user_id = auth.uid()
      )
    );

    CREATE POLICY "Staff can manage vehicles" 
    ON public.vehicles FOR ALL 
    TO authenticated USING (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'owner') OR
      public.has_role(auth.uid(), 'manager')
    );
  END IF;
END
$$;

-- 5. Work order activities
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_order_activities' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Staff can view work order activities" ON public.work_order_activities;
    DROP POLICY IF EXISTS "Staff can create work order activities" ON public.work_order_activities;
    
    CREATE POLICY "Staff can view work order activities" 
    ON public.work_order_activities FOR SELECT 
    TO authenticated USING (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'owner') OR
      public.has_role(auth.uid(), 'manager') OR
      public.has_role(auth.uid(), 'technician')
    );

    CREATE POLICY "Staff can create work order activities" 
    ON public.work_order_activities FOR INSERT 
    TO authenticated WITH CHECK (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'owner') OR
      public.has_role(auth.uid(), 'manager') OR
      public.has_role(auth.uid(), 'technician')
    );
  END IF;
END
$$;

-- 6. Work order parts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_order_parts' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Staff can view work order parts" ON public.work_order_parts;
    DROP POLICY IF EXISTS "Staff can manage work order parts" ON public.work_order_parts;
    
    CREATE POLICY "Staff can view work order parts" 
    ON public.work_order_parts FOR SELECT 
    TO authenticated USING (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'owner') OR
      public.has_role(auth.uid(), 'manager') OR
      public.has_role(auth.uid(), 'technician')
    );

    CREATE POLICY "Staff can manage work order parts" 
    ON public.work_order_parts FOR ALL 
    TO authenticated USING (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'owner') OR
      public.has_role(auth.uid(), 'manager') OR
      public.has_role(auth.uid(), 'technician')
    );
  END IF;
END
$$;

-- 7. Service sectors (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_sectors' AND table_schema = 'public') THEN
    -- These already have policies, but ensure they're correct
    DROP POLICY IF EXISTS "Authenticated users can read service_sectors" ON public.service_sectors;
    DROP POLICY IF EXISTS "Admins can manage service_sectors" ON public.service_sectors;
    
    CREATE POLICY "Authenticated users can read service_sectors" 
    ON public.service_sectors FOR SELECT 
    TO authenticated USING (true);

    CREATE POLICY "Admins can manage service_sectors" 
    ON public.service_sectors FOR ALL 
    TO authenticated USING (
      public.has_role(auth.uid(), 'owner') OR 
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'manager')
    );
  END IF;
END
$$;

-- 8. Security hardening for existing audit tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
    
    CREATE POLICY "Admins can view audit logs" 
    ON public.audit_logs FOR SELECT 
    TO authenticated USING (
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'owner')
    );

    CREATE POLICY "System can insert audit logs" 
    ON public.audit_logs FOR INSERT 
    TO authenticated WITH CHECK (true);
  END IF;
END
$$;

-- Add comprehensive security logging function
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (action, resource, details, created_at)
  VALUES (event_type, 'SECURITY', details, now())
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  -- Fail silently to prevent blocking operations
  NULL;
END;
$$;

-- Log this security fix
SELECT public.log_security_event(
  'RLS_SECURITY_FIX', 
  jsonb_build_object(
    'message', 'Applied RLS policies to unprotected tables',
    'timestamp', now(),
    'fixed_by', 'system_migration'
  )
);

-- Verify security policies are in place
DO $$
DECLARE
  unprotected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unprotected_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
  );
  
  IF unprotected_count > 0 THEN
    RAISE NOTICE 'WARNING: % tables still have RLS enabled but no policies', unprotected_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All RLS-enabled tables now have policies';
  END IF;
END
$$;