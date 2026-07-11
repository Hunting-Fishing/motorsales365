-- Create RLS policies for inventory_categories table
CREATE POLICY "Authenticated users can view inventory categories" 
ON public.inventory_categories 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert inventory categories" 
ON public.inventory_categories 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update inventory categories" 
ON public.inventory_categories 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete inventory categories" 
ON public.inventory_categories 
FOR DELETE 
USING (auth.uid() IS NOT NULL);