-- Insert Fuel Delivery module
INSERT INTO business_modules (name, slug, description, icon, category, is_premium, default_enabled, display_order)
VALUES (
  'Fuel Delivery',
  'fuel_delivery',
  'Fuel delivery management, tank monitoring, route optimization, and delivery scheduling',
  'fuel',
  'logistics',
  true,
  false,
  100
);