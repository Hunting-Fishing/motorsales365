-- Emergency RLS Fix: Remove circular dependencies and restore user access
-- This fixes the "infinite recursion detected in policy" errors

-- Step 1: Drop all problematic policies that cause circular references
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners and admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners and admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners and admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners and admins can manage user_roles" ON public.user_roles;

-- Step 2: Create secure helper functions that bypass RLS using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_user_shop_id_secure(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT shop_id FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner_secure(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_uuid 
    AND r.name::text IN ('admin', 'owner')
  );
$$;

-- Step 3: Create simple, non-recursive policies for profiles
CREATE POLICY "Users can view own profile and admins can view all"
ON public.profiles FOR SELECT
USING (
  id = auth.uid() OR 
  public.is_admin_or_owner_secure(auth.uid())
);

CREATE POLICY "Users can update own profile and admins can update all"
ON public.profiles FOR UPDATE
USING (
  id = auth.uid() OR 
  public.is_admin_or_owner_secure(auth.uid())
);

CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (
  public.is_admin_or_owner_secure(auth.uid())
);

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (
  public.is_admin_or_owner_secure(auth.uid())
);

-- Step 4: Create simple policies for user_roles
CREATE POLICY "Users can view their own roles and admins can view all"
ON public.user_roles FOR SELECT
USING (
  user_id = auth.uid() OR 
  public.is_admin_or_owner_secure(auth.uid())
);

CREATE POLICY "Only admins can insert user roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  public.is_admin_or_owner_secure(auth.uid())
);

CREATE POLICY "Only admins can update user roles"
ON public.user_roles FOR UPDATE
USING (
  public.is_admin_or_owner_secure(auth.uid())
);

CREATE POLICY "Only admins can delete user roles"
ON public.user_roles FOR DELETE
USING (
  public.is_admin_or_owner_secure(auth.uid())
);

-- Step 5: Update existing helper functions to be secure
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.is_admin_or_owner_secure(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_user_shop_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.get_user_shop_id_secure(auth.uid());
$$;