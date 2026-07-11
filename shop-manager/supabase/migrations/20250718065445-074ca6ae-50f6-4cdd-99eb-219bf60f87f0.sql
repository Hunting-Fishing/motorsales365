-- CRITICAL SECURITY FIX: Continue with more missing RLS policies
-- Add policies for inventory and financial tables

-- Add policies for inventory_items table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can view inventory in their shop" ON public.inventory_items;
    DROP POLICY IF EXISTS "Staff can manage inventory" ON public.inventory_items;
    
    CREATE POLICY "Users can view inventory in their shop" 
    ON public.inventory_items FOR SELECT 
    TO authenticated USING (
      shop_id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    );

    CREATE POLICY "Staff can manage inventory" 
    ON public.inventory_items FOR ALL 
    TO authenticated USING (
      shop_id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      ) AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('owner', 'admin', 'manager', 'inventory')
      )
    );
  END IF;
END
$$;

-- Add policies for products table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Public can view approved products" ON public.products;
    DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
    
    CREATE POLICY "Public can view approved products" 
    ON public.products FOR SELECT 
    USING (is_approved = true);

    CREATE POLICY "Admins can manage products" 
    ON public.products FOR ALL 
    TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('owner', 'admin', 'manager')
      )
    );
  END IF;
END
$$;

-- Add policies for invoices table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Staff can manage invoices" ON public.invoices;
    DROP POLICY IF EXISTS "Customers can view own invoices" ON public.invoices;
    
    CREATE POLICY "Staff can view invoices" 
    ON public.invoices FOR SELECT 
    TO authenticated USING (
      shop_id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    );

    CREATE POLICY "Staff can manage invoices" 
    ON public.invoices FOR ALL 
    TO authenticated USING (
      shop_id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      ) AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
        AND r.name IN ('owner', 'admin', 'manager', 'service_advisor')
      )
    );

    CREATE POLICY "Customers can view own invoices" 
    ON public.invoices FOR SELECT 
    TO authenticated USING (
      customer_id IN (
        SELECT c.id FROM customers c 
        WHERE c.auth_user_id = auth.uid()
      )
    );
  END IF;
END
$$;

-- Add policies for roles and permissions tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;
    
    CREATE POLICY "Authenticated users can view roles" 
    ON public.roles FOR SELECT 
    TO authenticated USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;
    
    CREATE POLICY "Authenticated users can view permissions" 
    ON public.permissions FOR SELECT 
    TO authenticated USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
    
    CREATE POLICY "Users can view own roles" 
    ON public.user_roles FOR SELECT 
    TO authenticated USING (user_id = auth.uid());

    CREATE POLICY "Admins can manage user roles" 
    ON public.user_roles FOR ALL 
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