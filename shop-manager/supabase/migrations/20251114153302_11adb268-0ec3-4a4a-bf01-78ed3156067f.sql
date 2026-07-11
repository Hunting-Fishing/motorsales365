-- Add Marine Tugboat Services
DO $$
DECLARE
  v_sector_id uuid;
  v_cat_id uuid;
  v_subcat_id uuid;
BEGIN
  -- Get Marine sector
  SELECT id INTO v_sector_id FROM service_sectors WHERE name = 'Marine';
  
  -- Add Tugboat Services category
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Tugboat Services', 'Specialized tugboat maintenance and operations', 10)
  RETURNING id INTO v_cat_id;
  
  -- Towing & Deck Equipment subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Towing & Deck Equipment', 'Winches, tow lines, and deck machinery', 1)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Tow Winch Overhaul', 'Complete overhaul of towing winch system', 480, 3500.00, 1),
  (v_subcat_id, 'Tow Wire Replacement', 'Replace main towing wire/cable', 240, 2800.00, 2),
  (v_subcat_id, 'Tow Hook Inspection & Service', 'Inspect and service tow hooks', 120, 450.00, 3),
  (v_subcat_id, 'Deck Winch Repair', 'Repair or rebuild deck winch', 300, 1850.00, 4),
  (v_subcat_id, 'Capstan Motor Replacement', 'Replace capstan motor and controls', 180, 1200.00, 5),
  (v_subcat_id, 'Towing Bitts Reinforcement', 'Reinforce or replace towing bitts', 360, 2500.00, 6),
  (v_subcat_id, 'Fairlead Replacement', 'Replace deck fairleads', 120, 850.00, 7),
  (v_subcat_id, 'H-Bitt Installation', 'Install or replace H-bitts', 240, 1950.00, 8);
  
  -- Hull & Fendering subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Hull & Fendering', 'Hull protection and fender systems', 2)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Fender System Replacement', 'Replace bow or side fender system', 360, 4500.00, 1),
  (v_subcat_id, 'Tire Fender Installation', 'Install tire fender protection', 180, 1200.00, 2),
  (v_subcat_id, 'Bow Knees Fabrication', 'Fabricate and install bow knees', 480, 5500.00, 3),
  (v_subcat_id, 'Hull Push Knee Repair', 'Repair or replace push knees', 360, 3200.00, 4),
  (v_subcat_id, 'Rub Rail Replacement', 'Replace steel rub rail', 240, 2100.00, 5),
  (v_subcat_id, 'Hull Plating Repair', 'Repair damaged hull plating', 420, 3800.00, 6),
  (v_subcat_id, 'Fendering System Inspection', 'Complete fendering system inspection', 120, 550.00, 7);
  
  -- Propulsion & Steering subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Propulsion & Steering', 'Main engines and steering systems', 3)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Z-Drive Service', 'Service azimuth thruster Z-drive', 600, 8500.00, 1),
  (v_subcat_id, 'Kort Nozzle Inspection', 'Inspect and service Kort nozzle', 240, 1850.00, 2),
  (v_subcat_id, 'Rudder System Overhaul', 'Complete rudder system overhaul', 480, 4200.00, 3),
  (v_subcat_id, 'Flanking Rudder Service', 'Service flanking rudder system', 300, 2400.00, 4),
  (v_subcat_id, 'Steering Gear Hydraulics Service', 'Service steering hydraulic system', 360, 2850.00, 5),
  (v_subcat_id, 'Bow Thruster Overhaul', 'Overhaul bow thruster unit', 720, 9500.00, 6),
  (v_subcat_id, 'Stern Thruster Service', 'Service stern thruster system', 540, 6800.00, 7),
  (v_subcat_id, 'Controllable Pitch Propeller Service', 'Service CPP hub mechanism', 840, 12500.00, 8);
  
  -- Towing Machinery & Hydraulics subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Towing Machinery & Hydraulics', 'Hydraulic systems for towing operations', 4)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Hydraulic Towing Winch Pump Replacement', 'Replace hydraulic pump for towing winch', 240, 3200.00, 1),
  (v_subcat_id, 'Winch Hydraulic Motor Rebuild', 'Rebuild hydraulic motor for winch', 360, 2800.00, 2),
  (v_subcat_id, 'Towing Winch Brake System Service', 'Service winch braking system', 180, 1450.00, 3),
  (v_subcat_id, 'Hydraulic Hose Replacement - Towing System', 'Replace hydraulic hoses on towing gear', 240, 1850.00, 4),
  (v_subcat_id, 'Render-Recovery Winch Service', 'Service render-recovery winch system', 300, 2400.00, 5),
  (v_subcat_id, 'Hydraulic Control Valve Overhaul', 'Overhaul hydraulic control valves', 240, 1950.00, 6),
  (v_subcat_id, 'Towing Pin Release System Service', 'Service quick-release pin system', 120, 850.00, 7);
  
  -- Deck Systems & Safety subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Deck Systems & Safety', 'Deck equipment and safety systems', 5)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Tow Line Handler System Service', 'Service automatic tow line handler', 180, 1550.00, 1),
  (v_subcat_id, 'Deck Crane Inspection & Certification', 'Annual crane inspection and certification', 240, 1850.00, 2),
  (v_subcat_id, 'Mooring Winch Service', 'Service mooring winches', 180, 1200.00, 3),
  (v_subcat_id, 'Fire Monitor System Service', 'Service deck fire monitors', 120, 950.00, 4),
  (v_subcat_id, 'Tugger Winch Repair', 'Repair small tugger winch', 120, 750.00, 5),
  (v_subcat_id, 'Deck Lighting System Upgrade', 'Upgrade deck working lights', 180, 1450.00, 6),
  (v_subcat_id, 'Bollard Pull Test & Certification', 'Perform bollard pull test', 480, 3500.00, 7),
  (v_subcat_id, 'Emergency Tow Release System Test', 'Test emergency release systems', 120, 650.00, 8);

END $$;