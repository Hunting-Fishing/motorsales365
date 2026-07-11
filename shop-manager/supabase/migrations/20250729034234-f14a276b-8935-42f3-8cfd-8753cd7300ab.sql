-- EMERGENCY: Nuclear Policy Reset - Drop all policies and start fresh
-- Step 1: Drop ALL existing policies across all core tables

-- Get all policy names for core tables and drop them
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on profiles table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.profiles';
    END LOOP;
    
    -- Drop all policies on user_roles table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.user_roles';
    END LOOP;
    
    -- Drop all policies on customers table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'customers' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.customers';
    END LOOP;
    
    -- Drop all policies on work_orders table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'work_orders' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.work_orders';
    END LOOP;
    
    -- Drop all policies on appointments table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'appointments' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.appointments';
    END LOOP;
END
$$;

-- Step 2: Disable RLS temporarily to clear conflicts
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS and create minimal, working policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- PROFILES: Only 2 simple policies (no conflicts)
CREATE POLICY "profile_own_access" 
ON public.profiles FOR ALL 
USING (id = auth.uid());

CREATE POLICY "profile_admin_access" 
ON public.profiles FOR ALL 
USING (is_admin_or_owner_secure(auth.uid()));

-- USER_ROLES: Only 2 simple policies (no conflicts)
CREATE POLICY "roles_own_view" 
ON public.user_roles FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "roles_admin_manage" 
ON public.user_roles FOR ALL 
USING (is_admin_or_owner_secure(auth.uid()));