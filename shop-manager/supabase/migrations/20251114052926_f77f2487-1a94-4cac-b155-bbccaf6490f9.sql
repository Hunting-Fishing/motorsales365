-- Populate Heavy Duty Sector with Categories, Subcategories, and Jobs
DO $$
DECLARE
  v_sector_id uuid;
  v_cat_id uuid;
  v_subcat_id uuid;
BEGIN
  -- Get Heavy Duty sector ID
  SELECT id INTO v_sector_id FROM service_sectors WHERE name = 'Heavy Duty';

  -- DIESEL ENGINE SERVICES
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Diesel Engine Services', 'Heavy duty diesel engine repair and maintenance', 1)
  RETURNING id INTO v_cat_id;

  -- Engine Diagnostics
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Engine Diagnostics', 'Diagnostic services for diesel engines', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Complete Engine Diagnostic', 'Full diagnostic scan and analysis', 120, 250.00, 1),
  (v_subcat_id, 'Computer Diagnostic', 'Electronic control system diagnostic', 60, 150.00, 2),
  (v_subcat_id, 'Compression Test', 'Cylinder compression testing', 90, 200.00, 3);

  -- Engine Repair
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Engine Repair', 'Major and minor engine repairs', 2)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Engine Overhaul', 'Complete engine rebuild', 2400, 8500.00, 1),
  (v_subcat_id, 'Head Gasket Replacement', 'Cylinder head gasket service', 480, 2500.00, 2),
  (v_subcat_id, 'Turbocharger Replacement', 'Remove and replace turbocharger', 360, 3200.00, 3),
  (v_subcat_id, 'Injector Replacement', 'Fuel injector replacement', 240, 1800.00, 4),
  (v_subcat_id, 'EGR System Service', 'EGR valve and cooler service', 180, 850.00, 5);

  -- TRANSMISSION SERVICES
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Heavy Duty Transmission', 'Transmission services for commercial vehicles', 2)
  RETURNING id INTO v_cat_id;

  -- Manual Transmission
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Manual Transmission', 'Heavy duty manual transmission services', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Clutch Replacement', 'Replace clutch assembly', 360, 2200.00, 1),
  (v_subcat_id, 'Transmission Overhaul', 'Complete transmission rebuild', 960, 5500.00, 2),
  (v_subcat_id, 'Shift Linkage Adjustment', 'Adjust gear shift linkage', 60, 125.00, 3);

  -- Automatic Transmission
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Automatic Transmission', 'Heavy duty automatic transmission services', 2)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Transmission Fluid Service', 'Drain and refill transmission fluid', 120, 450.00, 1),
  (v_subcat_id, 'Transmission Rebuild', 'Complete automatic transmission rebuild', 1200, 6500.00, 2),
  (v_subcat_id, 'Torque Converter Replacement', 'Replace torque converter', 480, 2800.00, 3);

  -- BRAKE SYSTEMS
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Air Brake Systems', 'Air brake system services', 3)
  RETURNING id INTO v_cat_id;

  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Air Brake Service', 'Air brake maintenance and repair', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Air Brake Adjustment', 'Adjust air brake system', 90, 175.00, 1),
  (v_subcat_id, 'Brake Chamber Replacement', 'Replace brake chambers', 240, 850.00, 2),
  (v_subcat_id, 'Air Compressor Service', 'Service air compressor', 180, 650.00, 3),
  (v_subcat_id, 'Slack Adjuster Replacement', 'Replace automatic slack adjusters', 120, 425.00, 4);

  -- HYDRAULIC SYSTEMS
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Hydraulic Systems', 'Hydraulic system services', 4)
  RETURNING id INTO v_cat_id;

  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Hydraulic Repair', 'Hydraulic system maintenance', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Hydraulic Pump Replacement', 'Replace hydraulic pump', 300, 1850.00, 1),
  (v_subcat_id, 'Hydraulic Hose Replacement', 'Replace hydraulic hoses', 120, 425.00, 2),
  (v_subcat_id, 'Hydraulic Cylinder Rebuild', 'Rebuild hydraulic cylinders', 360, 1200.00, 3),
  (v_subcat_id, 'Hydraulic Fluid Service', 'Flush and refill hydraulic fluid', 150, 550.00, 4);

END $$;