-- CRITICAL FIX: Infinite recursion in user_roles policies (Fixed version)
-- Fix the infinite recursion issue by creating a security definer function and updating policies

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

-- Create a security definer function to check if a user has a specific role
-- This bypasses RLS policies and prevents infinite recursion
-- Fixed: Cast text to app_role enum
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1 AND r.name = $2::app_role
  );
$$;

-- Create new policies using the security definer function
CREATE POLICY "Users can view own roles" 
ON public.user_roles FOR SELECT 
TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user roles" 
ON public.user_roles FOR ALL 
TO authenticated USING (
  public.has_role(auth.uid(), 'owner') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Also update any other policies that might be causing recursion
-- Update inventory_items policies to use the new function
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Staff can manage inventory" ON public.inventory_items;
    
    CREATE POLICY "Staff can manage inventory" 
    ON public.inventory_items FOR ALL 
    TO authenticated USING (
      shop_id IN (
        SELECT profiles.shop_id FROM profiles 
        WHERE profiles.id = auth.uid()
      ) AND (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'manager')
      )
    );
  END IF;
END
$$;

-- Update products policies to use the new function
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
    
    CREATE POLICY "Admins can manage products" 
    ON public.products FOR ALL 
    TO authenticated USING (
      public.has_role(auth.uid(), 'owner') OR 
      public.has_role(auth.uid(), 'admin') OR 
      public.has_role(auth.uid(), 'manager')
    );
  END IF;
END
$$;