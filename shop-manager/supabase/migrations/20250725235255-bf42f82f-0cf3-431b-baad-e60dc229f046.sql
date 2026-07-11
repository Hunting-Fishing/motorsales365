-- Fix database security issues (handling existing policies)

-- Drop existing policies first, then recreate
DROP POLICY IF EXISTS "Customers can view own data" ON public.customers;
DROP POLICY IF EXISTS "Customers can update own data" ON public.customers;

-- Improve RLS policies for customers table to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can read all customers" ON public.customers;
CREATE POLICY "Staff can view customers" 
ON public.customers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('owner', 'admin', 'manager', 'service_advisor', 'reception')
  )
);

DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
CREATE POLICY "Staff can create customers" 
ON public.customers FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('owner', 'admin', 'manager', 'service_advisor', 'reception')
  )
);

DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
CREATE POLICY "Staff can update customers" 
ON public.customers FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('owner', 'admin', 'manager', 'service_advisor', 'reception')
  )
);

-- Allow customers to view and update their own data
CREATE POLICY "Customers can view own data" 
ON public.customers FOR SELECT 
USING (auth_user_id = auth.uid());

CREATE POLICY "Customers can update own data" 
ON public.customers FOR UPDATE 
USING (auth_user_id = auth.uid());