-- Add user_id column to customers table to link with auth
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);

-- Create RLS policy for customers to view their own record
CREATE POLICY "Customers can view their own record"
ON public.customers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy for customers to update their own basic info
CREATE POLICY "Customers can update their own basic info"
ON public.customers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS policy for customers to view their own firearms
CREATE POLICY "Customers can view their own firearms"
ON public.gunsmith_firearms
FOR SELECT
TO authenticated
USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- RLS policy for customers to view their own work orders (jobs)
CREATE POLICY "Customers can view their own jobs"
ON public.gunsmith_jobs
FOR SELECT
TO authenticated
USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- RLS policy for customers to view their own invoices
CREATE POLICY "Customers can view their own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));