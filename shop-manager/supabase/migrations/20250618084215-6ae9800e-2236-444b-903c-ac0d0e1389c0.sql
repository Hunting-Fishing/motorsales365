
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.parts_categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.parts_categories;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.parts_categories;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.parts_categories;

-- Enable RLS on parts_categories table (this is safe to run even if already enabled)
ALTER TABLE public.parts_categories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all users to read parts categories
-- Since this is reference data for part categorization, it should be publicly readable
CREATE POLICY "Enable read access for all users" ON public.parts_categories
    FOR SELECT USING (true);

-- Allow authenticated users to insert new categories (for admin functionality)
CREATE POLICY "Enable insert for authenticated users" ON public.parts_categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update categories (for admin functionality)
CREATE POLICY "Enable update for authenticated users" ON public.parts_categories
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete categories (for admin functionality)
CREATE POLICY "Enable delete for authenticated users" ON public.parts_categories
    FOR DELETE USING (auth.role() = 'authenticated');
