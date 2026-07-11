-- Insert Store section with proper order (adjust existing Settings and Support display orders)
UPDATE navigation_sections SET display_order = 10 WHERE title = 'Settings';
UPDATE navigation_sections SET display_order = 11 WHERE title = 'Support';

-- Insert Store section
INSERT INTO navigation_sections (id, title, description, display_order, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Store',
  'E-commerce shopping and orders',
  9,
  true,
  now(),
  now()
);

-- Get the Store section ID for navigation items
DO $$
DECLARE
  store_section_id uuid;
  inventory_section_id uuid;
  operations_section_id uuid;
  services_section_id uuid;
BEGIN
  -- Get section IDs
  SELECT id INTO store_section_id FROM navigation_sections WHERE title = 'Store';
  SELECT id INTO inventory_section_id FROM navigation_sections WHERE title = 'Inventory';
  SELECT id INTO operations_section_id FROM navigation_sections WHERE title = 'Operations';
  SELECT id INTO services_section_id FROM navigation_sections WHERE title = 'Services';
  
  -- Insert Store navigation items
  INSERT INTO navigation_items (id, section_id, title, href, icon, description, display_order, required_roles, is_active, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), store_section_id, 'Shopping', '/shopping', 'ShoppingBag', 'Browse and shop products', 1, ARRAY['customer'], true, now(), now()),
    (gen_random_uuid(), store_section_id, 'Shopping Cart', '/cart', 'ShoppingCart', 'View shopping cart', 2, ARRAY['customer'], true, now(), now()),
    (gen_random_uuid(), store_section_id, 'Wishlist', '/wishlist', 'Heart', 'Saved products wishlist', 3, ARRAY['customer'], true, now(), now()),
    (gen_random_uuid(), store_section_id, 'Orders', '/orders', 'Package', 'Order history and tracking', 4, ARRAY['customer'], true, now(), now());
    
  -- Insert missing Inventory items
  INSERT INTO navigation_items (id, section_id, title, href, icon, description, display_order, required_roles, is_active, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), inventory_section_id, 'Inventory Manager', '/inventory-manager', 'Database', 'Advanced inventory management', 2, ARRAY['owner','admin','manager','parts_manager'], true, now(), now()),
    (gen_random_uuid(), inventory_section_id, 'Purchase Orders', '/purchase-orders', 'FileSpreadsheet', 'Manage purchase orders', 3, ARRAY['owner','admin','manager','parts_manager'], true, now(), now()),
    (gen_random_uuid(), inventory_section_id, 'Locations', '/locations', 'MapPin', 'Inventory locations', 4, ARRAY['owner','admin','manager','parts_manager'], true, now(), now()),
    (gen_random_uuid(), inventory_section_id, 'Suppliers', '/suppliers', 'Truck', 'Supplier management', 5, ARRAY['owner','admin','manager','parts_manager'], true, now(), now());
    
  -- Insert missing Operations items
  INSERT INTO navigation_items (id, section_id, title, href, icon, description, display_order, required_roles, is_active, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), operations_section_id, 'Payments', '/payments', 'CreditCard', 'Payment processing', 5, ARRAY['owner','admin','manager','service_advisor'], true, now(), now());
    
  -- Insert missing Services items
  INSERT INTO navigation_items (id, section_id, title, href, icon, description, display_order, required_roles, is_active, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), services_section_id, 'Repair Plans', '/repair-plans', 'Clipboard', 'Service repair plans', 3, ARRAY['owner','admin','manager','service_advisor'], true, now(), now());
    
END $$;