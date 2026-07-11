
-- Create the main inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Information
    name text NOT NULL,
    sku text NOT NULL UNIQUE,
    description text,
    part_number text,
    barcode text,
    category text,
    subcategory text,
    manufacturer text,
    vehicle_compatibility text,
    
    -- Location and Status
    location text,
    status text DEFAULT 'active',
    supplier text,
    
    -- Inventory Management
    quantity integer DEFAULT 0,
    measurement_unit text,
    on_hold integer DEFAULT 0,
    on_order integer DEFAULT 0,
    reorder_point integer DEFAULT 0,
    min_stock_level integer DEFAULT 0,
    max_stock_level integer DEFAULT 0,
    
    -- Pricing
    unit_price numeric DEFAULT 0,
    sell_price_per_unit numeric DEFAULT 0,
    cost_per_unit numeric DEFAULT 0,
    margin_markup numeric DEFAULT 0,
    
    -- Taxes & Fees
    tax_rate numeric DEFAULT 0,
    tax_exempt boolean DEFAULT false,
    environmental_fee numeric DEFAULT 0,
    core_charge numeric DEFAULT 0,
    hazmat_fee numeric DEFAULT 0,
    
    -- Product Details
    weight numeric DEFAULT 0,
    dimensions text,
    color text,
    material text,
    model_year text,
    oem_part_number text,
    universal_part boolean DEFAULT false,
    warranty_period text,
    
    -- Additional Info
    date_bought text,
    date_last text,
    notes text,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create an update trigger for the updated_at field
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_updated_at_trigger
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_updated_at();

-- Add some indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON public.inventory(supplier);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON public.inventory(location);

-- Enable RLS (Row Level Security)
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (you may want to adjust these based on your security requirements)
CREATE POLICY "Enable read access for all users" ON public.inventory
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.inventory
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.inventory
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.inventory
    FOR DELETE USING (auth.role() = 'authenticated');
