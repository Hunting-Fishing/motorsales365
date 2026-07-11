-- Clean up problematic customer policies that reference profiles table
DROP POLICY IF EXISTS "Users can delete customers in their shop" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers into their shop" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers in their shop" ON public.customers;
DROP POLICY IF EXISTS "Users can view customers from their shop" ON public.customers;
DROP POLICY IF EXISTS "Users can view customers in their shop" ON public.customers;

-- Create simpler policies that don't reference profiles table to avoid infinite recursion
CREATE POLICY "Authenticated users can view customers" 
ON public.customers 
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create customers" 
ON public.customers 
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update customers" 
ON public.customers 
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete customers" 
ON public.customers 
FOR DELETE
USING (auth.uid() IS NOT NULL);