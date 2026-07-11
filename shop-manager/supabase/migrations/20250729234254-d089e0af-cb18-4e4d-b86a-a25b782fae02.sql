-- Fix calendar events table and add sample data
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'appointment',
  status TEXT NOT NULL DEFAULT 'scheduled',
  shop_id UUID NOT NULL,
  customer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for calendar_events
CREATE POLICY "Users can view calendar events from their shop" 
ON public.calendar_events 
FOR SELECT 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert calendar events into their shop" 
ON public.calendar_events 
FOR INSERT 
WITH CHECK (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update calendar events in their shop" 
ON public.calendar_events 
FOR UPDATE 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete calendar events from their shop" 
ON public.calendar_events 
FOR DELETE 
USING (shop_id IN ( SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()));

-- Add sample appointments and calendar events for existing customers
DO $$
DECLARE
  current_shop_id UUID;
  customer_1_id UUID;
  customer_2_id UUID;
  customer_3_id UUID;
  vehicle_1_id UUID;
  vehicle_2_id UUID;
  vehicle_3_id UUID;
BEGIN
  -- Get current shop ID from profiles
  SELECT shop_id INTO current_shop_id FROM profiles LIMIT 1;
  
  IF current_shop_id IS NOT NULL THEN
    -- Get existing customer IDs
    SELECT id INTO customer_1_id FROM customers WHERE shop_id = current_shop_id AND first_name = 'Satinder' LIMIT 1;
    SELECT id INTO customer_2_id FROM customers WHERE shop_id = current_shop_id AND first_name = 'Trinnity' LIMIT 1;
    SELECT id INTO customer_3_id FROM customers WHERE shop_id = current_shop_id AND first_name = 'SACHIN' LIMIT 1;
    
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
    INSERT INTO calendar_events (shop_id, title, description, start_time, end_time, event_type, status, customer_id) VALUES
    (current_shop_id, 'Morning Team Meeting', 'Daily standup and task review', 
     date_trunc('day', now()) + interval '9 hours', 
     date_trunc('day', now()) + interval '9 hours 30 minutes', 
     'meeting', 'scheduled', NULL),
    (current_shop_id, 'Customer Service Call', 'Follow up with recent customers', 
     date_trunc('day', now()) + interval '11 hours', 
     date_trunc('day', now()) + interval '11 hours 30 minutes', 
     'call', 'scheduled', customer_1_id),
    (current_shop_id, 'Parts Delivery', 'Receive new inventory shipment', 
     date_trunc('day', now()) + interval '14 hours', 
     date_trunc('day', now()) + interval '15 hours', 
     'delivery', 'scheduled', NULL),
    (current_shop_id, 'End of Day Review', 'Review completed work and plan tomorrow', 
     date_trunc('day', now()) + interval '17 hours', 
     date_trunc('day', now()) + interval '17 hours 30 minutes', 
     'meeting', 'scheduled', NULL);
  END IF;
END $$;

-- Fix security definer functions by removing search_path modifications
-- These functions were flagged by the linter
DROP FUNCTION IF EXISTS public.update_business_industries_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION public.update_business_industries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.update_inventory_purchase_order_item_timestamp() CASCADE;
CREATE OR REPLACE FUNCTION public.update_inventory_purchase_order_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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