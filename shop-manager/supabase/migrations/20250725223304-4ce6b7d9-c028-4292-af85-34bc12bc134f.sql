-- Drop ALL existing policies on profiles to clean slate
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read profiles in same shop" ON public.profiles;
DROP POLICY IF EXISTS "Users can read other profiles in same shop" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can manage their own profile" 
ON public.profiles 
FOR ALL
USING (auth.uid() = id);

-- For shop access, use a simpler approach that doesn't reference profiles table
CREATE POLICY "Shop owners can view all profiles in their shop" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = profiles.shop_id
    AND s.owner_id = auth.uid()
  )
);

-- Allow users with admin/manager roles to view profiles (avoiding recursion)
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