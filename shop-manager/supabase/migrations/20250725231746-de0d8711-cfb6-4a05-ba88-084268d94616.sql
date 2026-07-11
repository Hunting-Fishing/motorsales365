-- Fix profiles table RLS policies to prevent infinite recursion
-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert profiles into their shop" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete profiles from their shop" ON public.profiles;

-- Create simple, non-recursive RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- Allow authenticated users to view other profiles (needed for shop operations)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);