-- Populate Lawn Care, Agricultural, and Industrial sectors
DO $$
DECLARE
  v_sector_id uuid;
  v_cat_id uuid;
  v_subcat_id uuid;
BEGIN
  -- LAWN CARE SECTOR
  SELECT id INTO v_sector_id FROM service_sectors WHERE name = 'Lawn Care';
  
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Landscaping Services', 'Professional landscaping and lawn care', 1)
  RETURNING id INTO v_cat_id;
  
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Lawn Maintenance', 'Regular lawn care services', 1)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Lawn Mowing', 'Regular lawn mowing service', 60, 50.00, 1),
  (v_subcat_id, 'Edging & Trimming', 'Edge and trim lawn borders', 30, 35.00, 2),
  (v_subcat_id, 'Fertilization', 'Lawn fertilization treatment', 45, 75.00, 3),
  (v_subcat_id, 'Aeration', 'Core aeration service', 90, 125.00, 4);

  -- AGRICULTURAL SECTOR
  SELECT id INTO v_sector_id FROM service_sectors WHERE name = 'Agricultural';
  
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Farm Equipment', 'Agricultural equipment services', 1)
  RETURNING id INTO v_cat_id;
  
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Tractor Service', 'Tractor maintenance and repair', 1)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Tractor Oil Change', 'Engine oil and filter service', 120, 250.00, 1),
  (v_subcat_id, 'Hydraulic System Service', 'Service hydraulic systems', 180, 450.00, 2),
  (v_subcat_id, 'PTO Service', 'Power take-off inspection and service', 90, 175.00, 3);

  -- INDUSTRIAL SECTOR
  SELECT id INTO v_sector_id FROM service_sectors WHERE name = 'Industrial';
  
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Factory Equipment', 'Industrial machinery services', 1)
  RETURNING id INTO v_cat_id;
  
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Preventive Maintenance', 'Scheduled equipment maintenance', 1)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Equipment Inspection', 'Complete equipment safety inspection', 120, 300.00, 1),
  (v_subcat_id, 'Lubrication Service', 'Lubricate all moving parts', 90, 150.00, 2),
  (v_subcat_id, 'Belt & Chain Replacement', 'Replace drive belts and chains', 180, 425.00, 3);

END $$;