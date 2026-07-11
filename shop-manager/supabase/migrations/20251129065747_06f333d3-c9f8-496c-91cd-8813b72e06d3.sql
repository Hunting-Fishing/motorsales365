-- Step 1: Create helper function to get current user's shop_id supporting both patterns
CREATE OR REPLACE FUNCTION public.get_current_user_shop_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id 
  FROM public.profiles 
  WHERE id = auth.uid() OR user_id = auth.uid()
  LIMIT 1;
$$;

-- Step 2: Update is_same_shop function to support both patterns
CREATE OR REPLACE FUNCTION public.is_same_shop(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p1
    CROSS JOIN public.profiles p2
    WHERE (p1.id = auth.uid() OR p1.user_id = auth.uid())
      AND (p2.id = target_user_id OR p2.user_id = target_user_id)
      AND p1.shop_id = p2.shop_id
      AND p1.shop_id IS NOT NULL
  );
$$;

-- Step 3: Update get_user_shop_id function to support both patterns
CREATE OR REPLACE FUNCTION public.get_user_shop_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id 
  FROM public.profiles 
  WHERE id = user_id OR profiles.user_id = user_id
  LIMIT 1;
$$;

-- Step 4: Update user_belongs_to_shop function to support both patterns
CREATE OR REPLACE FUNCTION public.user_belongs_to_shop(check_user_id uuid, check_shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (id = check_user_id OR user_id = check_user_id)
    AND shop_id = check_shop_id
  );
$$;

-- Step 5: Drop and recreate RLS policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view same shop profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Users can view same shop profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    shop_id = public.get_current_user_shop_id()
    OR id = auth.uid() 
    OR user_id = auth.uid()
  );

-- Step 6: Fix equipment_assets RLS policies
DROP POLICY IF EXISTS "Users can update equipment in their shop" ON public.equipment_assets;
DROP POLICY IF EXISTS "Users can insert equipment in their shop" ON public.equipment_assets;
DROP POLICY IF EXISTS "Users can delete equipment in their shop" ON public.equipment_assets;
DROP POLICY IF EXISTS "Users can view equipment in their shop" ON public.equipment_assets;
DROP POLICY IF EXISTS "Users can manage equipment in their shop" ON public.equipment_assets;
DROP POLICY IF EXISTS "Shop members can view equipment" ON public.equipment_assets;
DROP POLICY IF EXISTS "Shop members can manage equipment" ON public.equipment_assets;

CREATE POLICY "Users can view equipment in their shop" ON public.equipment_assets
  FOR SELECT TO authenticated
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert equipment in their shop" ON public.equipment_assets
  FOR INSERT TO authenticated
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update equipment in their shop" ON public.equipment_assets
  FOR UPDATE TO authenticated
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete equipment in their shop" ON public.equipment_assets
  FOR DELETE TO authenticated
  USING (shop_id = public.get_current_user_shop_id());