-- Seed power washing services with common service types
INSERT INTO power_washing_services (shop_id, name, description, category, base_price_per_sqft, minimum_price, estimated_time_minutes, requires_chemicals, is_active, display_order)
SELECT 
  shops.id as shop_id,
  services.name,
  services.description,
  services.category,
  services.base_price_per_sqft,
  services.minimum_price,
  services.estimated_time_minutes,
  services.requires_chemicals,
  true as is_active,
  services.display_order
FROM shops
CROSS JOIN (
  VALUES 
    ('House Wash', 'Complete exterior soft wash for residential homes', 'residential', 0.15, 199.00, 120, true, 1),
    ('Driveway Cleaning', 'High-pressure concrete and paver cleaning', 'concrete', 0.25, 99.00, 60, false, 2),
    ('Deck & Patio Wash', 'Wood and composite deck cleaning and brightening', 'wood', 0.35, 149.00, 90, true, 3),
    ('Roof Cleaning', 'Soft wash for shingle and tile roofs', 'roof', 0.20, 299.00, 180, true, 4),
    ('Commercial Exterior', 'Full building wash for commercial properties', 'commercial', 0.12, 399.00, 240, true, 5),
    ('Fleet Wash', 'Vehicle fleet cleaning service', 'fleet', NULL, 49.00, 30, false, 6),
    ('Fence Cleaning', 'Wood, vinyl, and metal fence cleaning', 'fence', 0.10, 129.00, 75, true, 7),
    ('Gutter Brightening', 'Exterior gutter cleaning and oxidation removal', 'residential', NULL, 149.00, 90, true, 8)
) AS services(name, description, category, base_price_per_sqft, minimum_price, estimated_time_minutes, requires_chemicals, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM power_washing_services WHERE power_washing_services.shop_id = shops.id AND power_washing_services.name = services.name
);