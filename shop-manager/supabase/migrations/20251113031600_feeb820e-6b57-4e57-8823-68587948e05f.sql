-- Fix critical security issue: profiles table must filter by shop_id
-- This prevents different business owners from seeing each other's team members

-- Drop ALL existing policies on profiles
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
END $$;

-- Create secure helper function to check if user is in same shop
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
    WHERE p1.id = auth.uid()
      AND p2.id = target_user_id
      AND p1.shop_id = p2.shop_id
      AND p1.shop_id IS NOT NULL
  );
$$;

-- Policy 1: Users can always see their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 3: Admins/owners can see profiles in their shop only
CREATE POLICY "Admins can view same shop profiles"
  ON public.profiles
  FOR SELECT
  USING (
    is_admin_or_owner_secure(auth.uid()) 
    AND is_same_shop(id)
  );

-- Policy 4: Admins/owners can update profiles in their shop only
CREATE POLICY "Admins can update same shop profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    is_admin_or_owner_secure(auth.uid()) 
    AND is_same_shop(id)
  )
  WITH CHECK (
    is_admin_or_owner_secure(auth.uid()) 
    AND is_same_shop(id)
  );

-- Policy 5: Admins/owners can insert profiles in their shop only  
CREATE POLICY "Admins can insert same shop profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    is_admin_or_owner_secure(auth.uid()) 
    AND is_same_shop(id)
  );

-- Policy 6: Admins/owners can delete profiles in their shop only
CREATE POLICY "Admins can delete same shop profiles"
  ON public.profiles
  FOR DELETE
  USING (
    is_admin_or_owner_secure(auth.uid()) 
    AND is_same_shop(id)
  );

-- Add comment explaining the security model
COMMENT ON FUNCTION public.is_same_shop IS 'Security function: checks if target user belongs to same shop as current user. Critical for multi-tenant data isolation.';