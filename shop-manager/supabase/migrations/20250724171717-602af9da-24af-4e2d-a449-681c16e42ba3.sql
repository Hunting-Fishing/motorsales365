-- Fix infinite recursion in RLS policies by creating security definer functions
-- and dropping ALL existing problematic policies first

-- Create security definer functions to break recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT r.name::text 
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_shop_id()
RETURNS UUID AS $$
  SELECT shop_id 
  FROM public.profiles 
  WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop ALL existing policies on profiles table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- Drop ALL existing policies on user_roles table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.user_roles';
    END LOOP;
END $$;

-- Create new simplified, non-recursive policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE 
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT 
USING (public.is_admin_or_owner());

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL 
USING (public.is_admin_or_owner());

-- Create new simplified, non-recursive policies for user_roles
CREATE POLICY "Users can view user roles"
ON public.user_roles FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage user roles"
ON public.user_roles FOR ALL 
USING (public.is_admin_or_owner());