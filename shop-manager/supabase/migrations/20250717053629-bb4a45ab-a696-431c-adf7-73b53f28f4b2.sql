-- Fix the infinite recursion in user_roles policy
-- Drop the problematic policy and recreate it properly

DROP POLICY IF EXISTS "Users can view their roles" ON public.user_roles;

-- Create a security definer function to check if user has admin/owner role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
AS $$
  SELECT r.name 
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

-- Create a simple policy for user_roles without recursion
CREATE POLICY "Users can view roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.get_current_user_role() IN ('admin', 'owner')
);

-- Also fix inventory column name issue
-- Check if the correct column exists and create an alias if needed
DO $$
BEGIN
  -- Check if quantity column exists instead of quantity_in_stock
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' 
    AND column_name = 'quantity'
    AND table_schema = 'public'
  ) THEN
    -- Create a view or function to handle the column name difference
    CREATE OR REPLACE VIEW public.inventory_stock_view AS
    SELECT 
      *,
      quantity as quantity_in_stock
    FROM public.inventory_items;
  END IF;
END $$;