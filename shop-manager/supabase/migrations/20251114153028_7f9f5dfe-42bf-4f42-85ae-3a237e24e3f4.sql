-- Add Heavy Duty Heating System services
DO $$
DECLARE
  v_sector_id uuid;
  v_cat_id uuid;
  v_subcat_id uuid;
BEGIN
  -- Get Heavy Duty sector
  SELECT id INTO v_sector_id FROM service_sectors WHERE name = 'Heavy Duty';
  
  -- Add Heating System category
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Heating System', 'HVAC heating and climate control services', 12)
  RETURNING id INTO v_cat_id;
  
  -- Heater Core & Components subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Heater Core & Components', 'Heater core and related component services', 1)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Heater Core Replacement', 'Replace heater core assembly', 360, 850.00, 1),
  (v_subcat_id, 'Heater Core Flush', 'Flush and clean heater core', 90, 165.00, 2),
  (v_subcat_id, 'Heater Hose Replacement', 'Replace heater inlet/outlet hoses', 60, 95.00, 3),
  (v_subcat_id, 'Heater Control Valve Replacement', 'Replace heater control valve', 75, 125.00, 4),
  (v_subcat_id, 'Heater Core Pressure Test', 'Pressure test heater core system', 30, 55.00, 5);
  
  -- Blower Motor & Climate Control subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Blower Motor & Climate Control', 'Blower motor and HVAC controls', 2)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Blower Motor Replacement', 'Replace HVAC blower motor', 120, 285.00, 1),
  (v_subcat_id, 'Blower Motor Resistor Replacement', 'Replace blower speed resistor', 45, 85.00, 2),
  (v_subcat_id, 'HVAC Control Module Replacement', 'Replace climate control module', 90, 395.00, 3),
  (v_subcat_id, 'Blend Door Actuator Replacement', 'Replace temperature blend door actuator', 150, 325.00, 4),
  (v_subcat_id, 'Climate Control Calibration', 'Calibrate HVAC control system', 60, 125.00, 5),
  (v_subcat_id, 'Mode Door Actuator Replacement', 'Replace airflow mode actuator', 120, 275.00, 6);
  
  -- Auxiliary & Cab Heating subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Auxiliary & Cab Heating', 'Auxiliary heaters and cab climate systems', 3)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Auxiliary Heater Installation', 'Install diesel-fired auxiliary heater', 240, 1250.00, 1),
  (v_subcat_id, 'Auxiliary Heater Repair', 'Diagnose and repair auxiliary heater', 180, 425.00, 2),
  (v_subcat_id, 'Auxiliary Heater Service', 'Service and clean auxiliary heater', 90, 185.00, 3),
  (v_subcat_id, 'Bunk Heater Replacement', 'Replace sleeper cab bunk heater', 150, 495.00, 4),
  (v_subcat_id, 'APU Heater Service', 'Service APU heating system', 120, 295.00, 5),
  (v_subcat_id, 'Engine Block Heater Installation', 'Install engine block heater', 120, 225.00, 6),
  (v_subcat_id, 'Coolant Heater Installation', 'Install inline coolant heater', 90, 195.00, 7);
  
  -- Defrost & Ventilation subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Defrost & Ventilation', 'Defrost and air circulation systems', 4)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Defrost System Repair', 'Repair windshield defrost system', 90, 165.00, 1),
  (v_subcat_id, 'Defroster Vent Replacement', 'Replace defroster vent assembly', 60, 125.00, 2),
  (v_subcat_id, 'Fresh Air Intake Service', 'Clean and service fresh air intake', 45, 75.00, 3),
  (v_subcat_id, 'Recirculation Door Repair', 'Repair cabin air recirculation door', 75, 145.00, 4),
  (v_subcat_id, 'HVAC Ductwork Repair', 'Repair or replace HVAC ductwork', 120, 225.00, 5);

END $$;