
-- Check the current structure of inventory_suppliers table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'inventory_suppliers' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
ALTER TABLE public.inventory_suppliers 
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing records to set is_active = true if it's null
UPDATE public.inventory_suppliers SET is_active = true WHERE is_active IS NULL;

-- Make is_active NOT NULL after setting default values
ALTER TABLE public.inventory_suppliers ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.inventory_suppliers ALTER COLUMN is_active SET NOT NULL;

-- Enable RLS if not already enabled
ALTER TABLE public.inventory_suppliers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inventory_suppliers;
CREATE POLICY "Enable read access for all users" ON public.inventory_suppliers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.inventory_suppliers;
CREATE POLICY "Enable insert for authenticated users" ON public.inventory_suppliers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.inventory_suppliers;
CREATE POLICY "Enable update for authenticated users" ON public.inventory_suppliers
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.inventory_suppliers;
CREATE POLICY "Enable delete for authenticated users" ON public.inventory_suppliers
    FOR DELETE USING (auth.role() = 'authenticated');

-- Insert sample data, updating existing records or inserting new ones
INSERT INTO public.inventory_suppliers (name, contact_name, email, phone, is_active) 
VALUES 
    ('NAPA Auto Parts', 'John Smith', 'orders@napacanada.com', '1-800-387-6272', true),
    ('AutoZone', 'Jane Doe', 'commercial@autozone.com', '1-800-288-6966', true),
    ('Advance Auto Parts', 'Mike Johnson', 'commercial@advanceautoparts.com', '1-877-238-2623', true),
    ('O''Reilly Auto Parts', 'Sarah Wilson', 'commercial@oreillyauto.com', '1-800-755-6759', true),
    ('Parts Plus', 'David Brown', 'orders@partsplus.com', '1-800-626-7278', true),
    ('Genuine Parts Company', 'Lisa Garcia', 'orders@genpt.com', '1-770-818-4500', true),
    ('Federal-Mogul', 'Tom Anderson', 'orders@federalmogul.com', '1-248-354-7700', true),
    ('AC Delco', 'Jennifer Lee', 'orders@acdelco.com', '1-800-223-3526', true),
    ('Bosch', 'Robert Taylor', 'orders@bosch.com', '1-800-26-BOSCH', true),
    ('Denso', 'Michelle Davis', 'orders@denso.com', '1-248-350-7500', true),
    ('NGK', 'Chris Martinez', 'orders@ngk.com', '1-847-524-0014', true),
    ('Fram', 'Amanda White', 'orders@fram.com', '1-800-890-2075', true),
    ('Castrol', 'Kevin Thompson', 'orders@castrol.com', '1-888-castrol', true),
    ('Mobil 1', 'Rachel Green', 'orders@mobil.com', '1-800-mobil-1', true),
    ('Valvoline', 'Daniel Clark', 'orders@valvoline.com', '1-800-team-val', true)
ON CONFLICT (name) DO UPDATE SET
    contact_name = EXCLUDED.contact_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active;
