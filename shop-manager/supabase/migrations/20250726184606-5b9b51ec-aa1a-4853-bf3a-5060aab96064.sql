-- Emergency RLS Fix: Remove circular dependencies and restore user access
-- This fixes the "infinite recursion detected in policy" errors

-- Step 1: Drop all problematic policies that cause circular references
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Step 2: Create secure helper functions that bypass RLS
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
    AND r.name IN ('admin', 'owner')
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

-- Step 4: Create simple policies for user_roles
CREATE POLICY "Users can view their own roles and admins can view all"
ON public.user_roles FOR SELECT
USING (
  user_id = auth.uid() OR 
  public.is_admin_or_owner_secure(auth.uid())
);

CREATE POLICY "Only admins can manage user roles"
ON public.user_roles FOR ALL
USING (
  public.is_admin_or_owner_secure(auth.uid())
)
WITH CHECK (
  public.is_admin_or_owner_secure(auth.uid())
);

-- Step 5: Fix work_orders policies to use secure functions
DROP POLICY IF EXISTS "Users can view work orders from their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Users can insert work orders into their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update work orders in their shop" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete work orders from their shop" ON public.work_orders;

CREATE POLICY "Users can view work orders from their shop"
ON public.work_orders FOR SELECT
USING (
  shop_id = public.get_user_shop_id_secure(auth.uid()) OR
  public.is_admin_or_owner_secure(auth.uid())
);

CREATE POLICY "Users can insert work orders into their shop"
ON public.work_orders FOR INSERT
WITH CHECK (
  shop_id = public.get_user_shop_id_secure(auth.uid()) OR
  public.is_admin_or_owner_secure(auth.uid())
);

CREATE POLICY "Users can update work orders in their shop"
ON public.work_orders FOR UPDATE
USING (
  shop_id = public.get_user_shop_id_secure(auth.uid()) OR
  public.is_admin_or_owner_secure(auth.uid())
);

CREATE POLICY "Users can delete work orders from their shop"
ON public.work_orders FOR DELETE
USING (
  shop_id = public.get_user_shop_id_secure(auth.uid()) OR
  public.is_admin_or_owner_secure(auth.uid())
);

-- Step 6: Fix inventory policies
DROP POLICY IF EXISTS "Users can view inventory from their shop" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can insert inventory into their shop" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can update inventory in their shop" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can delete inventory from their shop" ON public.inventory_items;

CREATE POLICY "Users can view inventory from their shop"
ON public.inventory_items FOR SELECT
USING (
  shop_id = public.get_user_shop_id_secure(auth.uid()) OR
  public.is_admin_or_owner_secure(auth.uid())
);

CREATE POLICY "Users can insert inventory into their shop"
ON public.inventory_items FOR INSERT
WITH CHECK (
  shop_id = public.get_user_shop_id_secure(auth.uid()) OR
  public.is_admin_or_owner_secure(auth.uid())
);

CREATE POLICY "Users can update inventory in their shop"
ON public.inventory_items FOR UPDATE
USING (
  shop_id = public.get_user_shop_id_secure(auth.uid()) OR
  public.is_admin_or_owner_secure(auth.uid())
);

CREATE POLICY "Users can delete inventory from their shop"
ON public.inventory_items FOR DELETE
USING (
  shop_id = public.get_user_shop_id_secure(auth.uid()) OR
  public.is_admin_or_owner_secure(auth.uid())
);

-- Step 7: Update existing helper functions to be secure
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