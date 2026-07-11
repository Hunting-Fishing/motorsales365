-- Add octane_rating column for gasoline variants
ALTER TABLE fuel_delivery_products
ADD COLUMN IF NOT EXISTS octane_rating INTEGER,
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'fuel';

-- Update existing products with proper octane ratings and add new fuel types
UPDATE fuel_delivery_products SET octane_rating = 87, grade = 'Regular' WHERE product_code = 'REG';
UPDATE fuel_delivery_products SET octane_rating = 91, grade = 'Premium' WHERE product_code = 'PREM';

-- Add comment for column documentation
COMMENT ON COLUMN fuel_delivery_products.octane_rating IS 'Octane rating for gasoline products (87, 89, 91, 93, 94)';
COMMENT ON COLUMN fuel_delivery_products.grade IS 'Grade designation for fuels (Regular, Mid-Grade, Premium, etc.)';
COMMENT ON COLUMN fuel_delivery_products.category IS 'Fuel category: gasoline, diesel, biodiesel, propane, heating_oil, other';