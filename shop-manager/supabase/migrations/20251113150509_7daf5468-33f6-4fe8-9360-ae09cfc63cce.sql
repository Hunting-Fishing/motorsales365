-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners and admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners and admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners and admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;

-- Allow authenticated users to view all profiles
CREATE POLICY "Authenticated users can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to insert profiles
CREATE POLICY "Authenticated users can insert profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow users to update their own profile, owners/admins can update any
CREATE POLICY "Users can update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  )
);

-- Only owners and admins can delete profiles
CREATE POLICY "Owners and admins can delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  )
);