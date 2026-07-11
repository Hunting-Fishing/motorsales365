-- Add sample appointments and calendar events with valid data
DO $$
DECLARE
  customer_1_id UUID;
  customer_2_id UUID;
  customer_3_id UUID;
  vehicle_1_id UUID;
  vehicle_2_id UUID;
  vehicle_3_id UUID;
BEGIN
  -- Get existing customer IDs
  SELECT id INTO customer_1_id FROM customers WHERE first_name = 'Satinder' LIMIT 1;
  SELECT id INTO customer_2_id FROM customers WHERE first_name = 'Trinnity' LIMIT 1;
  SELECT id INTO customer_3_id FROM customers WHERE first_name = 'SACHIN' LIMIT 1;
  
  -- Get existing vehicle IDs for each customer
  SELECT id INTO vehicle_1_id FROM vehicles WHERE customer_id = customer_1_id LIMIT 1;
  SELECT id INTO vehicle_2_id FROM vehicles WHERE customer_id = customer_2_id LIMIT 1;
  SELECT id INTO vehicle_3_id FROM vehicles WHERE customer_id = customer_3_id LIMIT 1;
  
  -- Insert sample appointments for the next week
  IF customer_1_id IS NOT NULL AND vehicle_1_id IS NOT NULL THEN
    INSERT INTO appointments (customer_id, vehicle_id, date, notes, duration, status) VALUES
    (customer_1_id, vehicle_1_id, now() + interval '1 day', 'Oil change and inspection', 120, 'scheduled'),
    (customer_1_id, vehicle_1_id, now() + interval '3 days', 'Brake service follow-up', 90, 'scheduled');
  END IF;
  
  IF customer_2_id IS NOT NULL AND vehicle_2_id IS NOT NULL THEN
    INSERT INTO appointments (customer_id, vehicle_id, date, notes, duration, status) VALUES
    (customer_2_id, vehicle_2_id, now() + interval '2 days', 'Tire rotation and alignment', 90, 'scheduled'),
    (customer_2_id, vehicle_2_id, now() + interval '5 days', 'Annual inspection', 60, 'scheduled');
  END IF;
  
  IF customer_3_id IS NOT NULL AND vehicle_3_id IS NOT NULL THEN
    INSERT INTO appointments (customer_id, vehicle_id, date, notes, duration, status) VALUES
    (customer_3_id, vehicle_3_id, now() + interval '4 days', 'Engine diagnostics', 150, 'scheduled');
  END IF;
  
  -- Insert sample calendar events for today's schedule using 'appointment' as event_type
  INSERT INTO calendar_events (title, description, start_time, end_time, event_type, status, customer_id) VALUES
  ('Morning Team Meeting', 'Daily standup and task review', 
   date_trunc('day', now()) + interval '9 hours', 
   date_trunc('day', now()) + interval '9 hours 30 minutes', 
   'appointment', 'scheduled', NULL),
  ('Customer Service Call', 'Follow up with recent customers', 
   date_trunc('day', now()) + interval '11 hours', 
   date_trunc('day', now()) + interval '11 hours 30 minutes', 
   'appointment', 'scheduled', customer_1_id),
  ('Parts Delivery', 'Receive new inventory shipment', 
   date_trunc('day', now()) + interval '14 hours', 
   date_trunc('day', now()) + interval '15 hours', 
   'appointment', 'scheduled', NULL),
  ('End of Day Review', 'Review completed work and plan tomorrow', 
   date_trunc('day', now()) + interval '17 hours', 
   date_trunc('day', now()) + interval '17 hours 30 minutes', 
   'appointment', 'scheduled', NULL);
END $$;