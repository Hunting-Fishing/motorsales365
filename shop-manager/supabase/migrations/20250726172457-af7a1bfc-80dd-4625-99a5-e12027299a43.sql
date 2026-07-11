-- CRITICAL SECURITY FIXES - Phase 1: RLS Policy Updates (Fixed)
-- Fix overly permissive RLS policies that allow unauthorized access

-- 1. Fix user_roles table - Remove ALL existing policies first
DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can read user_roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Owners and admins can manage user_roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Only owners can manage user roles" ON public.user_roles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- New secure policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name::text IN ('owner', 'admin')
  )
);

CREATE POLICY "Only owners can manage user roles"
ON public.user_roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name::text = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name::text = 'owner'
  )
);

-- 2. Fix profiles table - Remove ALL existing policies first
DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Owners and admins can insert profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Owners and admins can update profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Owners and admins can delete profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can view profiles in their shop" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can manage profiles in their shop" ON public.profiles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- New secure policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view profiles in their shop"
ON public.profiles FOR SELECT
TO authenticated
USING (
  shop_id IN (
    SELECT p.shop_id FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() 
    AND r.name::text IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage profiles in their shop"
ON public.profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() 
    AND p.shop_id = profiles.shop_id
    AND r.name::text IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() 
    AND p.shop_id = profiles.shop_id
    AND r.name::text IN ('owner', 'admin')
  )
);