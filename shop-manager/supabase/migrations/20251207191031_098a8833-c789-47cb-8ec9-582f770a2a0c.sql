-- Fix RLS Bootstrap Problem: Allow new users to complete onboarding

-- 1. Organizations: Allow authenticated users to create organizations
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Shops: Allow creating first shop (only if user doesn't already have one)
CREATE POLICY "Authenticated users can create their first shop"
ON public.shops
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE (id = auth.uid() OR user_id = auth.uid()) 
    AND shop_id IS NOT NULL
  )
);

-- 3. User Roles: Allow users to assign themselves owner role during onboarding
-- Only works if they don't already have any roles
CREATE POLICY "Users can assign owner role during onboarding"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role_id IN (SELECT id FROM public.roles WHERE name = 'owner')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
  )
);

-- 4. Profiles: Allow users to update their own profile (including shop_id)
-- Drop existing restrictive policy if it exists and recreate
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid() OR user_id = auth.uid())
WITH CHECK (id = auth.uid() OR user_id = auth.uid());