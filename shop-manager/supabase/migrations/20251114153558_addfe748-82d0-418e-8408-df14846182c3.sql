-- Expand Marine Tugboat Services with additional specialized categories
DO $$
DECLARE
  v_cat_id uuid;
  v_subcat_id uuid;
BEGIN
  -- Get existing Tugboat Services category
  SELECT c.id INTO v_cat_id 
  FROM service_categories c
  JOIN service_sectors s ON s.id = c.sector_id
  WHERE s.name = 'Marine' AND c.name = 'Tugboat Services';
  
  -- Add Escort & Ship Assist Operations subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Escort & Ship Assist Operations', 'Escort towing and ship handling services', 6)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Escort Towing System Inspection', 'Inspect escort towing configuration', 180, 1250.00, 1),
  (v_subcat_id, 'Gog Rope Replacement', 'Replace gog rope for escort towing', 120, 950.00, 2),
  (v_subcat_id, 'Towing Pad Eye Installation', 'Install or replace towing pad eyes', 240, 1850.00, 3),
  (v_subcat_id, 'Ship Assist Fender Configuration', 'Configure fenders for ship assist', 90, 650.00, 4),
  (v_subcat_id, 'Indirect Towing Bridle Setup', 'Setup indirect towing bridle system', 180, 1450.00, 5);
  
  -- Add Fire Fighting Systems subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Fire Fighting Systems', 'Fire fighting equipment and systems', 7)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Fire Pump Overhaul', 'Overhaul main fire fighting pump', 480, 5500.00, 1),
  (v_subcat_id, 'Fire Monitor Installation', 'Install deck fire monitor', 240, 3200.00, 2),
  (v_subcat_id, 'FiFi System Testing & Certification', 'Test and certify fire fighting system', 360, 2850.00, 3),
  (v_subcat_id, 'Fire Main Piping Repair', 'Repair fire main piping system', 300, 2400.00, 4),
  (v_subcat_id, 'Foam System Service', 'Service foam fire suppression system', 240, 1950.00, 5),
  (v_subcat_id, 'Fire Hose & Nozzle Replacement', 'Replace fire hoses and nozzles', 120, 850.00, 6),
  (v_subcat_id, 'Deluge System Testing', 'Test deck deluge system', 180, 1350.00, 7);
  
  -- Add Anchor Handling & Mooring subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Anchor Handling & Mooring', 'Anchor and mooring equipment', 8)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Anchor Windlass Overhaul', 'Complete overhaul of anchor windlass', 600, 6500.00, 1),
  (v_subcat_id, 'Anchor Chain Replacement', 'Replace anchor chain', 360, 4200.00, 2),
  (v_subcat_id, 'Hawse Pipe Repair', 'Repair or replace hawse pipe', 240, 1850.00, 3),
  (v_subcat_id, 'Chain Stopper Service', 'Service chain stopper mechanism', 180, 1200.00, 4),
  (v_subcat_id, 'Mooring Line Winch Service', 'Service mooring line winch', 240, 1650.00, 5),
  (v_subcat_id, 'Rope Reel Installation', 'Install synthetic rope reel system', 300, 2800.00, 6),
  (v_subcat_id, 'Anchor Shackle & Chain Inspection', 'Inspect and certify anchor gear', 180, 950.00, 7);
  
  -- Add Communication & Navigation subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Communication & Navigation', 'Marine electronics and navigation', 9)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'VHF Radio System Installation', 'Install marine VHF radio system', 180, 1450.00, 1),
  (v_subcat_id, 'Radar System Upgrade', 'Upgrade navigation radar system', 360, 4500.00, 2),
  (v_subcat_id, 'GPS/DGPS Installation', 'Install GPS positioning system', 240, 2200.00, 3),
  (v_subcat_id, 'AIS Transponder Service', 'Service AIS transponder', 120, 850.00, 4),
  (v_subcat_id, 'Searchlight System Repair', 'Repair deck searchlight system', 180, 1350.00, 5),
  (v_subcat_id, 'Electronic Chart System Installation', 'Install ECDIS or chart plotter', 300, 3500.00, 6),
  (v_subcat_id, 'Sound Signal System Service', 'Service horn and whistle system', 120, 750.00, 7);
  
  -- Add Specialty Towing Equipment subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Specialty Towing Equipment', 'Specialized towing configurations', 10)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Towing Staple Installation', 'Install heavy-duty towing staple', 360, 3800.00, 1),
  (v_subcat_id, 'Shark Jaw Tow Hook Service', 'Service shark jaw quick-release hook', 180, 1650.00, 2),
  (v_subcat_id, 'Towing Bridle Assembly', 'Fabricate custom towing bridle', 240, 2200.00, 3),
  (v_subcat_id, 'Tow Cable Tensioner Service', 'Service automatic cable tensioner', 180, 1450.00, 4),
  (v_subcat_id, 'Pelican Hook Replacement', 'Replace pelican hook quick release', 120, 950.00, 5),
  (v_subcat_id, 'Towing Pennant Wire Splice', 'Splice or replace towing pennant', 180, 1250.00, 6),
  (v_subcat_id, 'Tow Pin Quick Release Service', 'Service hydraulic tow pin release', 150, 1350.00, 7);

END $$;