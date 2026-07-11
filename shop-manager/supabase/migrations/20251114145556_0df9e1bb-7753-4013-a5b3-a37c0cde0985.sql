-- Expand Heavy Duty sector with lighting services
DO $$
DECLARE
  v_sector_id uuid;
  v_cat_id uuid;
  v_subcat_id uuid;
BEGIN
  -- Get Heavy Duty sector
  SELECT id INTO v_sector_id FROM service_sectors WHERE name = 'Heavy Duty';
  
  -- Add Lighting category
  INSERT INTO service_categories (sector_id, name, description, position)
  VALUES (v_sector_id, 'Lighting Systems', 'Truck and trailer lighting services', 10)
  RETURNING id INTO v_cat_id;
  
  -- Exterior Lighting subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Exterior Lighting', 'Headlights, markers, and clearance lights', 1)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Headlight Replacement', 'Replace truck headlight assembly', 60, 125.00, 1),
  (v_subcat_id, 'Marker Lamp Replacement', 'Replace side marker or clearance lamp', 30, 45.00, 2),
  (v_subcat_id, 'Tail Light Replacement', 'Replace rear tail light assembly', 45, 85.00, 3),
  (v_subcat_id, 'Reverse Light Replacement', 'Replace backup light assembly', 30, 55.00, 4),
  (v_subcat_id, 'Turn Signal Light Replacement', 'Replace turn signal light', 30, 50.00, 5),
  (v_subcat_id, 'Fog Light Installation', 'Install fog light assembly', 90, 175.00, 6),
  (v_subcat_id, 'LED Conversion', 'Convert lights to LED system', 120, 250.00, 7);
  
  -- Interior/Cab Lighting subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Interior Lighting', 'Cab and interior lighting services', 2)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Cab Interior Light Replacement', 'Replace dome or map lights', 20, 35.00, 1),
  (v_subcat_id, 'Dashboard Bulb Replacement', 'Replace instrument cluster bulbs', 45, 65.00, 2),
  (v_subcat_id, 'Sleeper Berth Light Service', 'Service sleeper compartment lighting', 30, 50.00, 3);
  
  -- Trailer Lighting subcategory
  INSERT INTO service_subcategories (category_id, name, description, position)
  VALUES (v_cat_id, 'Trailer Lighting', 'Trailer lighting and wiring services', 3)
  RETURNING id INTO v_subcat_id;
  
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price, position) VALUES
  (v_subcat_id, 'Trailer Wiring Repair', 'Diagnose and repair trailer wiring', 90, 150.00, 1),
  (v_subcat_id, 'Trailer Light Replacement', 'Replace trailer marker or tail lights', 30, 45.00, 2),
  (v_subcat_id, 'ABS Light Service', 'Service trailer ABS warning lights', 45, 75.00, 3),
  (v_subcat_id, 'Conspicuity Tape Installation', 'Install DOT reflective tape', 60, 125.00, 4);

END $$;