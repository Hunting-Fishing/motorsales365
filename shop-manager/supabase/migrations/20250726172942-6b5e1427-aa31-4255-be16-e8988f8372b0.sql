-- CRITICAL SECURITY FIXES - Phase 1 Continued: Work Orders and Inventory
-- Fix remaining overly permissive RLS policies

-- 3. Fix work_orders table - Remove ALL existing policies first
DO $$
BEGIN
    DROP POLICY IF EXISTS "Staff can manage work orders" ON public.work_orders;
    DROP POLICY IF EXISTS "Staff can view all work orders" ON public.work_orders;
    DROP POLICY IF EXISTS "Customers can view own work orders" ON public.work_orders;
    DROP POLICY IF EXISTS "Staff can view work orders in their shop" ON public.work_orders;
    DROP POLICY IF EXISTS "Customers can view their own work orders" ON public.work_orders;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Secure work orders policies
CREATE POLICY "Staff can view work orders in their shop"
ON public.work_orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() 
    AND r.name::text IN ('owner', 'admin', 'manager', 'service_advisor', 'technician')
  )
);

CREATE POLICY "Customers can view their own work orders"
ON public.work_orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = work_orders.customer_id 
    AND c.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Staff can manage work orders"
ON public.work_orders FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() 
    AND r.name::text IN ('owner', 'admin', 'manager', 'service_advisor', 'technician')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() 
    AND r.name::text IN ('owner', 'admin', 'manager', 'service_advisor')
  )
);

-- 4. Fix inventory_items table - Add shop-based access control if shops table exists
DO $$
BEGIN
    -- Check if shops table exists and add shop_id column if needed
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shops') THEN
        -- Add shop_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'shop_id') THEN
            ALTER TABLE public.inventory_items ADD COLUMN shop_id UUID REFERENCES public.shops(id);
            
            -- Update existing inventory items to belong to the first shop (temporary fix)
            UPDATE public.inventory_items 
            SET shop_id = (SELECT id FROM public.shops LIMIT 1)
            WHERE shop_id IS NULL;
            
            -- Make shop_id required for new items
            ALTER TABLE public.inventory_items ALTER COLUMN shop_id SET NOT NULL;
        END IF;
    END IF;
END $$;

-- Drop ALL existing inventory policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Staff can manage inventory" ON public.inventory_items;
    DROP POLICY IF EXISTS "Staff can view inventory" ON public.inventory_items;
    DROP POLICY IF EXISTS "Staff can view inventory in their shop" ON public.inventory_items;
    DROP POLICY IF EXISTS "Staff can manage inventory in their shop" ON public.inventory_items;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Secure inventory policies (with or without shop_id)
CREATE POLICY "Staff can view inventory"
ON public.inventory_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() 
    AND r.name::text IN ('owner', 'admin', 'manager', 'parts_manager', 'service_advisor', 'technician')
  )
);

CREATE POLICY "Staff can manage inventory"
ON public.inventory_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() 
    AND r.name::text IN ('owner', 'admin', 'manager', 'parts_manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() 
    AND r.name::text IN ('owner', 'admin', 'manager', 'parts_manager')
  )
);