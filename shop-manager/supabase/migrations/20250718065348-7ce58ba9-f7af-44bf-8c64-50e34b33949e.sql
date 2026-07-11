-- CRITICAL SECURITY FIX: Continue adding missing RLS policies
-- Only add policies for tables that actually exist

-- Add policies for profiles table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
    
    CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    TO authenticated USING (id = auth.uid());

    CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    TO authenticated USING (id = auth.uid());

    CREATE POLICY "Admins can view all profiles" 
    ON public.profiles FOR SELECT 
    TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('owner', 'admin')
      )
    );
  END IF;
END
$$;

-- Add policies for shops table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shops' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can view their shop" ON public.shops;
    DROP POLICY IF EXISTS "Admins can manage their shop" ON public.shops;
    
    CREATE POLICY "Users can view their shop" 
    ON public.shops FOR SELECT 
    TO authenticated USING (
      id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    );

    CREATE POLICY "Admins can manage their shop" 
    ON public.shops FOR ALL 
    TO authenticated USING (
      id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      ) AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('owner', 'admin')
      )
    );
  END IF;
END
$$;

-- Add policies for customers table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can view customers in their shop" ON public.customers;
    DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;
    DROP POLICY IF EXISTS "Customers can view own data" ON public.customers;
    
    CREATE POLICY "Users can view customers in their shop" 
    ON public.customers FOR SELECT 
    TO authenticated USING (
      shop_id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    );

    CREATE POLICY "Staff can manage customers" 
    ON public.customers FOR ALL 
    TO authenticated USING (
      shop_id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      ) AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('owner', 'admin', 'manager', 'service_advisor', 'reception')
      )
    );

    CREATE POLICY "Customers can view own data" 
    ON public.customers FOR SELECT 
    TO authenticated USING (auth_user_id = auth.uid());
  END IF;
END
$$;

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
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('owner', 'admin', 'manager', 'service_advisor', 'technician', 'reception')
      )
    );

    CREATE POLICY "Staff can manage work orders" 
    ON public.work_orders FOR ALL 
    TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('owner', 'admin', 'manager', 'service_advisor')
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
      customer_id IN (
        SELECT c.id FROM customers c 
        JOIN profiles p ON p.shop_id = c.shop_id
        WHERE p.id = auth.uid()
      )
    );

    CREATE POLICY "Staff can manage vehicles" 
    ON public.vehicles FOR ALL 
    TO authenticated USING (
      customer_id IN (
        SELECT c.id FROM customers c 
        JOIN profiles p ON p.shop_id = c.shop_id
        WHERE p.id = auth.uid()
      ) AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('owner', 'admin', 'manager', 'service_advisor', 'reception')
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