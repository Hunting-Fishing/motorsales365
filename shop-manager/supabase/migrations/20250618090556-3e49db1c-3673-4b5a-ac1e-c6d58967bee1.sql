
-- Add new columns to inventory_suppliers table
ALTER TABLE public.inventory_suppliers 
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS region TEXT;

-- Insert the comprehensive supplier data with type and region information
INSERT INTO public.inventory_suppliers (name, type, region, is_active) VALUES
('NAPA Auto Parts', 'Retail & Wholesale', 'North America', true),
('Carquest Auto Parts', 'Retail & Wholesale', 'North America', true),
('Advance Auto Parts', 'Retail & Wholesale', 'North America', true),
('AutoZone', 'Retail', 'North America', true),
('O''Reilly Auto Parts', 'Retail & Wholesale', 'North America', true),
('Lordco Auto Parts', 'Retail & Wholesale', 'Canada', true),
('Bumper to Bumper', 'Wholesale', 'Canada', true),
('Worldpac', 'Wholesale & Import', 'North America', true),
('Uni-Select', 'Wholesale', 'Canada', true),
('Federated Auto Parts', 'Wholesale', 'USA', true),
('Parts Authority', 'Wholesale', 'USA', true),
('Keystone Automotive', 'Wholesale', 'USA', true),
('Genuine Parts Company', 'Parent Company', 'North America', true),
('Continental Imports', 'Import Specialist', 'North America', true),
('Transtar Industries', 'Transmission Specialist', 'North America', true),
('RockAuto', 'Online Retail', 'North America', true),
('Amazon', 'Online Retail', 'Global', true),
('eBay Motors', 'Online Retail', 'Global', true),
('Motorcar Parts of America', 'Rebuilder & Supplier', 'USA', true),
('ACDelco', 'OEM/GM Parts', 'North America', true),
('Mopar', 'OEM/Chrysler', 'North America', true),
('Motorcraft', 'OEM/Ford', 'North America', true),
('Dorman Products', 'Aftermarket', 'North America', true),
('Beck/Arnley', 'Import Parts Specialist', 'North America', true),
('Bosch Auto Parts', 'OEM & Aftermarket', 'Global', true),
('Valeo Service', 'OEM & Aftermarket', 'Global', true),
('Cardone Industries', 'Remanufactured Parts', 'North America', true),
('LKQ Corporation', 'Recycled Parts', 'North America', true),
('Pull-A-Part', 'Salvage Yard', 'USA', true),
('Pick-n-Pull', 'Salvage Yard', 'North America', true)
ON CONFLICT (name) DO UPDATE SET
    type = EXCLUDED.type,
    region = EXCLUDED.region,
    is_active = EXCLUDED.is_active;
