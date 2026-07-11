-- Populate Marine Sector with Categories, Subcategories, and Jobs
DO $$
DECLARE
  v_sector_id uuid;
  v_cat_id uuid;
  v_subcat_id uuid;
BEGIN
  -- Get Marine sector ID
  SELECT id INTO v_sector_id FROM service_sectors WHERE name = 'Marine';

  -- OUTBOARD MOTORS
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Outboard Motors', 'Outboard motor services and repair', 1)
  RETURNING id INTO v_cat_id;

  -- Outboard Maintenance
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Outboard Maintenance', 'Routine outboard motor maintenance', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Outboard 100-Hour Service', 'Complete 100-hour maintenance service', 180, 450.00, 1),
  (v_subcat_id, 'Lower Unit Oil Change', 'Drain and refill lower unit oil', 45, 85.00, 2),
  (v_subcat_id, 'Spark Plug Replacement', 'Replace all spark plugs', 60, 125.00, 3),
  (v_subcat_id, 'Water Pump Impeller Replacement', 'Replace water pump impeller', 120, 275.00, 4),
  (v_subcat_id, 'Propeller Service', 'Remove, inspect, and reinstall propeller', 60, 95.00, 5);

  -- Outboard Repair
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Outboard Repair', 'Outboard motor repair services', 2)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Outboard Powerhead Rebuild', 'Complete powerhead overhaul', 1200, 4500.00, 1),
  (v_subcat_id, 'Lower Unit Rebuild', 'Complete lower unit rebuild', 480, 1850.00, 2),
  (v_subcat_id, 'Carburetor Rebuild', 'Clean and rebuild carburetors', 240, 550.00, 3),
  (v_subcat_id, 'Fuel Pump Replacement', 'Replace fuel pump', 120, 325.00, 4);

  -- INBOARD ENGINES
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Inboard Engines', 'Inboard engine services', 2)
  RETURNING id INTO v_cat_id;

  -- Inboard Maintenance
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Inboard Maintenance', 'Regular inboard engine maintenance', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Engine Oil Change', 'Engine oil and filter change', 90, 185.00, 1),
  (v_subcat_id, 'Cooling System Service', 'Flush and service cooling system', 150, 325.00, 2),
  (v_subcat_id, 'Transmission Service', 'Marine transmission service', 120, 275.00, 3),
  (v_subcat_id, 'Winterization Service', 'Complete engine winterization', 180, 425.00, 4);

  -- Inboard Repair
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Inboard Repair', 'Inboard engine repair services', 2)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Engine Overhaul', 'Complete engine rebuild', 2400, 12500.00, 1),
  (v_subcat_id, 'Head Gasket Replacement', 'Replace head gaskets', 480, 2800.00, 2),
  (v_subcat_id, 'Manifold Replacement', 'Replace exhaust manifolds', 360, 1850.00, 3),
  (v_subcat_id, 'Starter Replacement', 'Replace starter motor', 120, 650.00, 4);

  -- ELECTRICAL SYSTEMS
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Marine Electrical', 'Marine electrical systems', 3)
  RETURNING id INTO v_cat_id;

  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Electrical Service', 'Marine electrical repairs', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Battery Service', 'Test and service batteries', 60, 125.00, 1),
  (v_subcat_id, 'Alternator Replacement', 'Replace alternator', 180, 750.00, 2),
  (v_subcat_id, 'Wiring Harness Repair', 'Repair damaged wiring', 240, 550.00, 3),
  (v_subcat_id, 'Electronics Installation', 'Install marine electronics', 180, 450.00, 4);

  -- HULL AND BOTTOM
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Hull Services', 'Hull maintenance and repair', 4)
  RETURNING id INTO v_cat_id;

  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Hull Maintenance', 'Hull cleaning and protection', 1)
  RETURNING id INTO v_subcat_id;

  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Bottom Paint', 'Apply anti-fouling bottom paint', 360, 1250.00, 1),
  (v_subcat_id, 'Hull Buffing and Waxing', 'Polish and wax hull', 480, 850.00, 2),
  (v_subcat_id, 'Zinc Anode Replacement', 'Replace sacrificial anodes', 90, 175.00, 3),
  (v_subcat_id, 'Through-Hull Service', 'Service through-hull fittings', 180, 425.00, 4);

END $$;