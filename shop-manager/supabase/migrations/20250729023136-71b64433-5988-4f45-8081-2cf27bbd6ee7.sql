-- Emergency Policy Cleanup: Remove all conflicting RLS policies and implement simple, consistent rules

-- Drop all existing policies from profiles table
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners and admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners and admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners and admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin users can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Users can read profiles in their shop" ON public.profiles;

-- Drop all existing policies from user_roles table
DROP POLICY IF EXISTS "Authenticated users can read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners and admins can manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners and admins can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners and admins can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners and admins can delete user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view user roles in their shop" ON public.user_roles;

-- Clean up work_orders policies (keeping essential ones only)
DROP POLICY IF EXISTS "Staff can view all work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Staff can manage work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Customers can view own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can view work orders in their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Users can manage work orders in their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Admins can manage work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Service advisors can manage work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Technicians can view assigned work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Owners can manage all work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Managers can manage work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Reception can view work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete work orders in their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Users can insert work orders into their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update work orders in their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Users can view work orders from their shop" ON public.work_orders;

-- Create simple, consistent policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles in their shop" 
ON public.profiles FOR SELECT 
USING (is_admin_or_owner_secure(auth.uid()));

CREATE POLICY "Admins can manage all profiles in their shop" 
ON public.profiles FOR ALL 
USING (is_admin_or_owner_secure(auth.uid()));

-- Create simple, consistent policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles in their shop" 
ON public.user_roles FOR SELECT 
USING (is_admin_or_owner_secure(auth.uid()));

CREATE POLICY "Admins can manage all roles in their shop" 
ON public.user_roles FOR ALL 
USING (is_admin_or_owner_secure(auth.uid()));

-- Create simple, consistent policies for work_orders
CREATE POLICY "Staff can view work orders in their shop" 
ON public.work_orders FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.shop_id = work_orders.shop_id
  )
);

CREATE POLICY "Staff can manage work orders in their shop" 
ON public.work_orders FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.shop_id = work_orders.shop_id
  )
);

CREATE POLICY "Customers can view their own work orders" 
ON public.work_orders FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.customers c 
    WHERE c.id = work_orders.customer_id 
    AND c.auth_user_id = auth.uid()
  )
);

-- Ensure RLS is enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;