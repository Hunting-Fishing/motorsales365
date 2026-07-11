-- Add expanded tugboat propulsion and running gear services
-- Get the Marine sector and Tugboat Services category IDs
DO $$
DECLARE
  v_marine_sector_id UUID;
  v_tugboat_category_id UUID;
  v_shafting_subcat_id UUID;
  v_propulsion_subcat_id UUID;
BEGIN
  -- Get Marine sector ID
  SELECT id INTO v_marine_sector_id FROM service_sectors WHERE name = 'Marine' LIMIT 1;
  
  -- Get Tugboat Services category ID
  SELECT id INTO v_tugboat_category_id 
  FROM service_categories 
  WHERE sector_id = v_marine_sector_id AND name = 'Tugboat Services' 
  LIMIT 1;
  
  -- Get existing Propulsion Systems subcategory
  SELECT id INTO v_propulsion_subcat_id
  FROM service_subcategories
  WHERE category_id = v_tugboat_category_id AND name = 'Propulsion Systems'
  LIMIT 1;

  -- Add new subcategory: Shafting & Running Gear
  INSERT INTO service_subcategories (category_id, name, description)
  VALUES (
    v_tugboat_category_id,
    'Shafting & Running Gear',
    'Shaft system maintenance, alignment, and component replacement'
  )
  RETURNING id INTO v_shafting_subcat_id;

  -- Add jobs to Shafting & Running Gear subcategory (estimated_time in minutes)
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price) VALUES
  (v_shafting_subcat_id, 'Cutlass Bearing Replacement', 'Remove and replace worn cutlass bearings', 480, 1200),
  (v_shafting_subcat_id, 'Shaft Alignment - Single Shaft', 'Precision alignment of propeller shaft', 360, 950),
  (v_shafting_subcat_id, 'Shaft Alignment - Twin Shaft', 'Precision alignment of twin propeller shafts', 600, 1600),
  (v_shafting_subcat_id, 'Shaft Seal Service & Replacement', 'Inspect, service, or replace shaft seals', 240, 650),
  (v_shafting_subcat_id, 'Shaft Seal - Mechanical Type', 'Service mechanical face shaft seals', 300, 800),
  (v_shafting_subcat_id, 'Shaft Seal - Lip Type', 'Replace lip-type shaft seals', 210, 550),
  (v_shafting_subcat_id, 'Shaft Airbag Installation', 'Install inflatable shaft airbag system', 180, 450),
  (v_shafting_subcat_id, 'Shaft Airbag Inspection & Service', 'Inspect and service existing airbag system', 120, 250),
  (v_shafting_subcat_id, 'Propeller R&R - Standard', 'Remove and reinstall propeller (up to 60")', 300, 750),
  (v_shafting_subcat_id, 'Propeller R&R - Large', 'Remove and reinstall large propeller (over 60")', 480, 1200),
  (v_shafting_subcat_id, 'Propeller Polish & Balance', 'Polish and dynamically balance propeller', 360, 900),
  (v_shafting_subcat_id, 'Propeller Blade Repair', 'Repair damaged or bent propeller blades', 240, 650),
  (v_shafting_subcat_id, 'Rudder R&R - Complete', 'Remove and reinstall complete rudder assembly', 720, 1800),
  (v_shafting_subcat_id, 'Rudder Bearing Replacement', 'Replace upper and lower rudder bearings', 480, 1200),
  (v_shafting_subcat_id, 'Rudder Stock Inspection', 'Ultrasonic inspection of rudder stock', 180, 450),
  (v_shafting_subcat_id, 'Rudder Packing Gland Service', 'Repack and adjust rudder stuffing box', 150, 350),
  (v_shafting_subcat_id, 'Shaft Withdrawal - Single', 'Pull single propeller shaft for inspection', 600, 1500),
  (v_shafting_subcat_id, 'Shaft Withdrawal - Twin', 'Pull twin propeller shafts for inspection', 960, 2400),
  (v_shafting_subcat_id, 'Shaft Ultrasonic Testing', 'UT inspection of propeller shaft', 150, 400),
  (v_shafting_subcat_id, 'Shaft Straightening', 'Straighten bent propeller shaft', 480, 1400),
  (v_shafting_subcat_id, 'Tail Shaft Seal Housing Service', 'Overhaul tail shaft seal housing', 360, 950),
  (v_shafting_subcat_id, 'Strut Bearing Replacement', 'Replace stern tube or strut bearings', 420, 1100),
  (v_shafting_subcat_id, 'Flange Bolt Replacement', 'Replace shaft flange coupling bolts', 180, 450),
  (v_shafting_subcat_id, 'Keyway Repair & Replacement', 'Repair or replace shaft keyways', 300, 800);

  -- Add more jobs to existing Propulsion Systems subcategory
  IF v_propulsion_subcat_id IS NOT NULL THEN
    INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price) VALUES
    (v_propulsion_subcat_id, 'Gearbox Alignment Check', 'Verify and adjust gearbox alignment', 240, 600),
    (v_propulsion_subcat_id, 'Thrust Bearing Inspection', 'Inspect and measure thrust bearing wear', 180, 450),
    (v_propulsion_subcat_id, 'Intermediate Shaft Bearing Service', 'Service intermediate shaft bearings', 300, 750),
    (v_propulsion_subcat_id, 'Propulsion Control Calibration', 'Calibrate electronic propulsion controls', 150, 350),
    (v_propulsion_subcat_id, 'Engine Bed Plate Inspection', 'Check engine mounting and bed plate condition', 210, 500),
    (v_propulsion_subcat_id, 'Flexible Coupling Inspection', 'Inspect flexible coupling elements', 120, 300),
    (v_propulsion_subcat_id, 'Z-Drive Service - Complete', 'Complete service of Z-drive unit', 960, 2800),
    (v_propulsion_subcat_id, 'Azimuthing Thruster Annual Service', 'Annual maintenance of azimuth thruster', 1200, 3500);
  END IF;

END $$;