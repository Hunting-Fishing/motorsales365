-- Add Heavy Duty Cooling System services
DO $$
DECLARE
  v_sector_id uuid;
  v_cat_id uuid;
  v_subcat_id uuid;
BEGIN
  -- Get Heavy Duty sector
  SELECT id INTO v_sector_id FROM service_sectors WHERE name = 'Heavy Duty';
  
  -- Add Cooling System category
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Cooling System', 'Heavy-duty cooling and radiator services', 11)
  RETURNING id INTO v_cat_id;
  
  -- Coolant Services subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Coolant Services', 'Coolant maintenance and flush services', 1)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Coolant System Flush', 'Complete coolant system flush and fill', 120, 225.00, 1),
  (v_subcat_id, 'Coolant Level Check', 'Inspect and top off coolant level', 15, 25.00, 2),
  (v_subcat_id, 'Coolant Filter Replacement', 'Replace inline coolant filter', 45, 85.00, 3),
  (v_subcat_id, 'Extended Life Coolant Service', 'Service with ELC coolant', 90, 195.00, 4),
  (v_subcat_id, 'Coolant Analysis Test', 'Lab analysis of coolant condition', 30, 75.00, 5),
  (v_subcat_id, 'Coolant Additive Service', 'Add SCA or DCA additives', 20, 45.00, 6);
  
  -- Radiator Services subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Radiator Services', 'Radiator repair and replacement', 2)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Radiator Replacement', 'Replace complete radiator assembly', 240, 850.00, 1),
  (v_subcat_id, 'Radiator Repair', 'Repair radiator leaks or damage', 180, 325.00, 2),
  (v_subcat_id, 'Radiator Hose Replacement', 'Replace upper/lower radiator hoses', 60, 125.00, 3),
  (v_subcat_id, 'Radiator Pressure Test', 'Pressure test cooling system', 30, 55.00, 4),
  (v_subcat_id, 'Charge Air Cooler Service', 'Service or replace CAC/intercooler', 180, 425.00, 5),
  (v_subcat_id, 'Radiator Core Cleaning', 'External radiator core cleaning', 90, 150.00, 6);
  
  -- Cooling Components subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Cooling Components', 'Water pump, thermostat, and fan services', 3)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Water Pump Replacement', 'Replace engine water pump', 300, 675.00, 1),
  (v_subcat_id, 'Thermostat Replacement', 'Replace coolant thermostat', 120, 185.00, 2),
  (v_subcat_id, 'Fan Clutch Replacement', 'Replace viscous fan clutch', 150, 425.00, 3),
  (v_subcat_id, 'Cooling Fan Replacement', 'Replace engine cooling fan', 90, 295.00, 4),
  (v_subcat_id, 'Fan Belt Replacement', 'Replace fan or serpentine belt', 45, 95.00, 5),
  (v_subcat_id, 'Belt Tensioner Replacement', 'Replace automatic belt tensioner', 75, 165.00, 6),
  (v_subcat_id, 'Coolant Temperature Sensor', 'Replace coolant temp sensor', 60, 125.00, 7);

END $$;