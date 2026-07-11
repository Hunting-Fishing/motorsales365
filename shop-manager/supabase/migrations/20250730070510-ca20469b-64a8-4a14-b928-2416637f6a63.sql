-- Fix calendar events table and add sample data
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'appointment',
  status TEXT NOT NULL DEFAULT 'scheduled',
  customer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on calendar_events (can be accessed by all authenticated users for now)
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policy for calendar_events
CREATE POLICY "Authenticated users can view calendar events" 
ON public.calendar_events 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage calendar events" 
ON public.calendar_events 
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Add sample appointments for existing customers
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
  
  -- Get existing vehicle IDs
  SELECT id INTO vehicle_1_id FROM vehicles WHERE customer_id = customer_1_id LIMIT 1;
  SELECT id INTO vehicle_2_id FROM vehicles WHERE customer_id = customer_2_id LIMIT 1;
  SELECT id INTO vehicle_3_id FROM vehicles WHERE customer_id = customer_3_id LIMIT 1;
  
  -- Insert sample appointments for the next week
  IF customer_1_id IS NOT NULL THEN
    INSERT INTO appointments (customer_id, vehicle_id, date, notes, duration, status) VALUES
    (customer_1_id, vehicle_1_id, now() + interval '1 day', 'Oil change and inspection', 120, 'scheduled'),
    (customer_1_id, vehicle_1_id, now() + interval '3 days', 'Brake service follow-up', 90, 'scheduled');
  END IF;
  
  IF customer_2_id IS NOT NULL THEN
    INSERT INTO appointments (customer_id, vehicle_2_id, date, notes, duration, status) VALUES
    (customer_2_id, vehicle_2_id, now() + interval '2 days', 'Tire rotation and alignment', 90, 'scheduled'),
    (customer_2_id, vehicle_2_id, now() + interval '5 days', 'Annual inspection', 60, 'scheduled');
  END IF;
  
  IF customer_3_id IS NOT NULL THEN
    INSERT INTO appointments (customer_id, vehicle_3_id, date, notes, duration, status) VALUES
    (customer_3_id, vehicle_3_id, now() + interval '4 days', 'Engine diagnostics', 150, 'scheduled');
  END IF;
  
  -- Insert sample calendar events for today's schedule
  INSERT INTO calendar_events (title, description, start_time, end_time, event_type, status, customer_id) VALUES
  ('Morning Team Meeting', 'Daily standup and task review', 
   date_trunc('day', now()) + interval '9 hours', 
   date_trunc('day', now()) + interval '9 hours 30 minutes', 
   'meeting', 'scheduled', NULL),
  ('Customer Service Call', 'Follow up with recent customers', 
   date_trunc('day', now()) + interval '11 hours', 
   date_trunc('day', now()) + interval '11 hours 30 minutes', 
   'call', 'scheduled', customer_1_id),
  ('Parts Delivery', 'Receive new inventory shipment', 
   date_trunc('day', now()) + interval '14 hours', 
   date_trunc('day', now()) + interval '15 hours', 
   'delivery', 'scheduled', NULL),
  ('End of Day Review', 'Review completed work and plan tomorrow', 
   date_trunc('day', now()) + interval '17 hours', 
   date_trunc('day', now()) + interval '17 hours 30 minutes', 
   'meeting', 'scheduled', NULL);
END $$;

-- Add trigger for calendar_events updated_at
CREATE OR REPLACE FUNCTION public.update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_calendar_events_updated_at();