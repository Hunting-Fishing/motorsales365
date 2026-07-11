-- Populate Small Engines, Motorcycle, and RV Sectors
DO $$
DECLARE
  v_sector_id uuid;
  v_cat_id uuid;
  v_subcat_id uuid;
BEGIN
  -- SMALL ENGINES SECTOR
  SELECT id INTO v_sector_id FROM service_sectors WHERE name = 'Small Engines';

  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Lawn Equipment', 'Lawn mowers and yard equipment', 1)
  RETURNING id INTO v_cat_id;

  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Mower Service', 'Lawn mower maintenance and repair', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Spring Tune-Up', 'Complete spring maintenance service', 90, 125.00, 1),
  (v_subcat_id, 'Blade Sharpening', 'Sharpen and balance mower blades', 30, 35.00, 2),
  (v_subcat_id, 'Carburetor Cleaning', 'Clean and adjust carburetor', 60, 85.00, 3),
  (v_subcat_id, 'Engine Rebuild', 'Complete engine overhaul', 360, 450.00, 4);

  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Power Equipment', 'Generators, pressure washers, and power tools', 2)
  RETURNING id INTO v_cat_id;

  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Generator Service', 'Generator maintenance and repair', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Generator Annual Service', 'Complete annual maintenance', 120, 185.00, 1),
  (v_subcat_id, 'Oil Change Service', 'Engine oil and filter change', 45, 75.00, 2),
  (v_subcat_id, 'Voltage Regulator Replacement', 'Replace voltage regulator', 90, 225.00, 3);

  -- MOTORCYCLE SECTOR
  SELECT id INTO v_sector_id FROM service_sectors WHERE name = 'Motorcycle';

  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Motorcycle Maintenance', 'Regular motorcycle maintenance', 1)
  RETURNING id INTO v_cat_id;

  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Basic Service', 'Routine motorcycle service', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Oil Change', 'Engine oil and filter change', 60, 95.00, 1),
  (v_subcat_id, 'Chain Adjustment', 'Adjust and lubricate chain', 30, 45.00, 2),
  (v_subcat_id, 'Brake Pad Replacement', 'Replace front or rear brake pads', 90, 175.00, 3),
  (v_subcat_id, 'Tire Replacement', 'Remove and replace tire', 60, 125.00, 4);

  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Engine & Performance', 'Engine work and performance upgrades', 2)
  RETURNING id INTO v_cat_id;

  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Engine Service', 'Engine maintenance and repair', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Valve Adjustment', 'Adjust valve clearances', 180, 325.00, 1),
  (v_subcat_id, 'Carburetor Sync', 'Synchronize carburetors', 120, 185.00, 2),
  (v_subcat_id, 'Clutch Replacement', 'Replace clutch assembly', 240, 650.00, 3);

  -- RV SECTOR
  SELECT id INTO v_sector_id FROM service_sectors WHERE name = 'RV/Recreational Vehicle';

  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'RV Maintenance', 'RV and motorhome maintenance', 1)
  RETURNING id INTO v_cat_id;

  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Routine Service', 'Regular RV maintenance', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Pre-Trip Inspection', 'Complete safety inspection', 120, 185.00, 1),
  (v_subcat_id, 'Winterization Service', 'Prepare RV for winter storage', 180, 325.00, 2),
  (v_subcat_id, 'De-Winterization Service', 'Prepare RV for season', 150, 275.00, 3),
  (v_subcat_id, 'Generator Service', 'RV generator maintenance', 120, 225.00, 4);

  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'RV Systems', 'Plumbing, electrical, and HVAC systems', 2)
  RETURNING id INTO v_cat_id;

  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Plumbing & Water', 'Water system services', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Water Heater Service', 'Service water heater', 90, 165.00, 1),
  (v_subcat_id, 'Water Pump Replacement', 'Replace water pump', 120, 285.00, 2),
  (v_subcat_id, 'Leak Repair', 'Locate and repair water leaks', 180, 425.00, 3);

  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'HVAC Systems', 'Heating and air conditioning', 2)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'AC Service', 'Service roof air conditioner', 120, 225.00, 1),
  (v_subcat_id, 'Furnace Service', 'Service propane furnace', 90, 185.00, 2),
  (v_subcat_id, 'Refrigerator Service', 'Service RV refrigerator', 150, 275.00, 3);

END $$;