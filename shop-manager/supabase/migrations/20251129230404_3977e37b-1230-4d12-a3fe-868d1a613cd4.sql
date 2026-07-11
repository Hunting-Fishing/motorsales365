-- Add new columns to maintenance_budgets for expanded budget categories
ALTER TABLE maintenance_budgets ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES budget_categories(id);
ALTER TABLE maintenance_budgets ADD COLUMN IF NOT EXISTS equipment_id UUID;
ALTER TABLE maintenance_budgets ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE maintenance_budgets ADD COLUMN IF NOT EXISTS safety_budget NUMERIC(12,2) DEFAULT 0;
ALTER TABLE maintenance_budgets ADD COLUMN IF NOT EXISTS tools_budget NUMERIC(12,2) DEFAULT 0;
ALTER TABLE maintenance_budgets ADD COLUMN IF NOT EXISTS fuel_budget NUMERIC(12,2) DEFAULT 0;
ALTER TABLE maintenance_budgets ADD COLUMN IF NOT EXISTS ppe_budget NUMERIC(12,2) DEFAULT 0;
ALTER TABLE maintenance_budgets ADD COLUMN IF NOT EXISTS safety_spent NUMERIC(12,2) DEFAULT 0;
ALTER TABLE maintenance_budgets ADD COLUMN IF NOT EXISTS tools_spent NUMERIC(12,2) DEFAULT 0;
ALTER TABLE maintenance_budgets ADD COLUMN IF NOT EXISTS fuel_spent NUMERIC(12,2) DEFAULT 0;
ALTER TABLE maintenance_budgets ADD COLUMN IF NOT EXISTS ppe_spent NUMERIC(12,2) DEFAULT 0;

-- Insert standard budget categories
INSERT INTO budget_categories (id, shop_id, name, description, is_active, created_by)
SELECT 
  gen_random_uuid(),
  s.id,
  category.name,
  category.description,
  true,
  (SELECT id FROM auth.users LIMIT 1)
FROM shops s
CROSS JOIN (
  VALUES 
    ('Safety & PPE', 'Personal protective equipment, safety gear, compliance items'),
    ('Tools & Equipment', 'Hand tools, power tools, diagnostic equipment, specialty tools'),
    ('Fuels & Lubricants', 'Diesel, gasoline, oils, greases, hydraulic fluids'),
    ('Parts & Materials', 'Replacement parts, consumables, raw materials'),
    ('Maintenance Services', 'External contractor services, specialized repairs'),
    ('Fleet & Vehicles', 'Vehicle-specific maintenance, repairs, inspections'),
    ('Marine Equipment', 'Vessel maintenance, marine-specific parts and services'),
    ('Facility & Buildings', 'Building maintenance, HVAC, electrical, plumbing')
) AS category(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM budget_categories bc 
  WHERE bc.shop_id = s.id AND bc.name = category.name
);