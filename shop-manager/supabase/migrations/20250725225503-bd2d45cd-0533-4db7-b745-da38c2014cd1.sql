-- Clean up problematic work order policies that might reference profiles table
DROP POLICY IF EXISTS "Staff can manage work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Staff can view work orders" ON public.work_orders;

-- Create simpler policies that don't reference profiles table
CREATE POLICY "Authenticated users can view work orders" 
ON public.work_orders 
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create work orders" 
ON public.work_orders 
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update work orders" 
ON public.work_orders 
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete work orders" 
ON public.work_orders 
FOR DELETE
USING (auth.uid() IS NOT NULL);