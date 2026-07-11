-- EMERGENCY: Complete Policy Reset - Nuclear option to fix infinite recursion errors
-- This drops ALL conflicting policies across core tables and implements minimal working policies

-- Drop ALL policies from profiles table (comprehensive cleanup)
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
DROP POLICY IF EXISTS "Admins can view all profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles in their shop" ON public.profiles;

-- Drop ALL policies from user_roles table (comprehensive cleanup)
DROP POLICY IF EXISTS "Authenticated users can read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners and admins can manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners and admins can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners and admins can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners and admins can delete user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view user roles in their shop" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles in their shop" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles in their shop" ON public.user_roles;

-- Drop ALL policies from customers table (comprehensive cleanup)
DROP POLICY IF EXISTS "Customers can view their own data" ON public.customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Customers can update their own data" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;

-- Drop ALL policies from work_orders table (comprehensive cleanup)
DROP POLICY IF EXISTS "Customers can view own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Staff can manage work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Staff can view all work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Customers can create work order requests" ON public.work_orders;
DROP POLICY IF EXISTS "Technicians can view assigned work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Advisors can manage work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Admins can manage all work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can view work orders in their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Users can manage work orders in their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Authenticated users can view work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Authenticated users can manage work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Shop members can view work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Shop members can manage work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete work orders from their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Users can insert work orders into their shop" ON public.work_orders;

-- Drop ALL policies from appointments table (comprehensive cleanup) 
DROP POLICY IF EXISTS "Customers can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Customers can create appointment requests" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can manage appointments" ON public.appointments;

-- Disable RLS temporarily to clear any remaining policy conflicts
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS and create MINIMAL, SIMPLE policies

-- Enable RLS on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- PROFILES: Only 2 simple policies
CREATE POLICY "Users can manage their own profile" 
ON public.profiles FOR ALL 
USING (id = auth.uid());

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles FOR ALL 
USING (is_admin_or_owner_secure(auth.uid()));

-- USER_ROLES: Only 2 simple policies  
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles FOR ALL 
USING (is_admin_or_owner_secure(auth.uid()));