-- Add RLS policies for equipment table
-- Allow authenticated users to insert equipment
CREATE POLICY "Authenticated users can insert equipment"
ON public.equipment
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update equipment
CREATE POLICY "Authenticated users can update equipment"
ON public.equipment
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete equipment
CREATE POLICY "Authenticated users can delete equipment"
ON public.equipment
FOR DELETE
TO authenticated
USING (true);