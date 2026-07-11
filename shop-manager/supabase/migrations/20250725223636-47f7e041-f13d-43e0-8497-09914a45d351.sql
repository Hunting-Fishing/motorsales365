-- Drop ALL existing policies on profiles to clean slate
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read profiles in same shop" ON public.profiles;
DROP POLICY IF EXISTS "Users can read other profiles in same shop" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Shop owners can view all profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Admin users can view all profiles" ON public.profiles;

-- Create simple, non-recursive policies that avoid referencing profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users with admin/manager/owner roles to view all profiles
CREATE POLICY "Admin users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('admin', 'manager', 'owner')
  )
);