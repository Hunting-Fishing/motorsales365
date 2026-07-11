-- Create customer_property_areas table for storing saved measurements
CREATE TABLE public.customer_property_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Area identification
  area_type TEXT NOT NULL, -- 'driveway', 'roof', 'deck', 'fence', 'exterior', 'shop', 'patio', 'sidewalk', 'garage', 'pool_deck', 'other'
  label TEXT, -- Custom label: "Front Driveway", "Back Patio", "Main Building Roof"
  
  -- Measurements
  square_footage INTEGER NOT NULL,
  length_ft NUMERIC(10,2), -- Optional: for fences or rectangular areas
  width_ft NUMERIC(10,2),  -- Optional: for rectangular areas
  height_ft NUMERIC(10,2), -- Optional: for exterior walls
  
  -- Metadata
  notes TEXT, -- Special instructions for this area
  last_serviced_at TIMESTAMPTZ, -- Auto-updated when jobs complete
  service_count INTEGER DEFAULT 0, -- Track how many times serviced
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_customer_property_areas_customer ON customer_property_areas(customer_id);
CREATE INDEX idx_customer_property_areas_shop ON customer_property_areas(shop_id);

-- Enable RLS
ALTER TABLE customer_property_areas ENABLE ROW LEVEL SECURITY;

-- RLS Policy for shop-scoped access
CREATE POLICY "Users can view property areas for their shop"
ON customer_property_areas
FOR SELECT
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create property areas for their shop"
ON customer_property_areas
FOR INSERT
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update property areas for their shop"
ON customer_property_areas
FOR UPDATE
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete property areas for their shop"
ON customer_property_areas
FOR DELETE
USING (shop_id = public.get_current_user_shop_id());

-- Trigger to update updated_at
CREATE TRIGGER update_customer_property_areas_updated_at
  BEFORE UPDATE ON customer_property_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gunsmith_updated_at();