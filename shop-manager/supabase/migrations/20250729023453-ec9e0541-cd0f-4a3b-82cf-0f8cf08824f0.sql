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

-- Ensure RLS is enabled on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;