-- Create vessel inspection templates table (generic forms per equipment type)
CREATE TABLE public.vessel_inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type TEXT NOT NULL,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_key TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create vessel inspections table (main inspection record)
CREATE TABLE public.vessel_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id),
  vessel_id UUID NOT NULL REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES public.profiles(id),
  inspector_name TEXT NOT NULL,
  inspection_date TIMESTAMPTZ DEFAULT now(),
  current_hours NUMERIC(10,2),
  overall_status TEXT DEFAULT 'pending' CHECK (overall_status IN ('pending', 'pass', 'fail', 'attention')),
  safe_to_operate BOOLEAN DEFAULT false,
  general_notes TEXT,
  signature_data TEXT,
  has_concerns BOOLEAN DEFAULT false,
  concern_acknowledged BOOLEAN DEFAULT false,
  concern_acknowledged_by UUID REFERENCES public.profiles(id),
  concern_acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create vessel inspection items table (individual item results)
CREATE TABLE public.vessel_inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.vessel_inspections(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment_assets(id),
  template_id UUID REFERENCES public.vessel_inspection_templates(id),
  item_key TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL CHECK (status IN ('good', 'attention', 'bad', 'na')),
  notes TEXT,
  location TEXT,
  hours_at_inspection NUMERIC(10,2),
  photos TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create equipment locations table
CREATE TABLE public.equipment_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_equipment_id UUID NOT NULL REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  location_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_equipment_id, equipment_id)
);

-- Enable RLS
ALTER TABLE public.vessel_inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessel_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessel_inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vessel_inspection_templates (read by all authenticated)
CREATE POLICY "Anyone can view inspection templates" ON public.vessel_inspection_templates
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage inspection templates" ON public.vessel_inspection_templates
  FOR ALL USING (public.is_owner_or_admin(auth.uid()));

-- RLS Policies for vessel_inspections
CREATE POLICY "Users can view vessel inspections in their shop" ON public.vessel_inspections
  FOR SELECT USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
  );

CREATE POLICY "Users can create vessel inspections" ON public.vessel_inspections
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
  );

CREATE POLICY "Users can update vessel inspections in their shop" ON public.vessel_inspections
  FOR UPDATE USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
  );

CREATE POLICY "Users can delete vessel inspections in their shop" ON public.vessel_inspections
  FOR DELETE USING (
    shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
  );

-- RLS Policies for vessel_inspection_items
CREATE POLICY "Users can view inspection items" ON public.vessel_inspection_items
  FOR SELECT USING (
    inspection_id IN (
      SELECT id FROM public.vessel_inspections 
      WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create inspection items" ON public.vessel_inspection_items
  FOR INSERT WITH CHECK (
    inspection_id IN (
      SELECT id FROM public.vessel_inspections 
      WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update inspection items" ON public.vessel_inspection_items
  FOR UPDATE USING (
    inspection_id IN (
      SELECT id FROM public.vessel_inspections 
      WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete inspection items" ON public.vessel_inspection_items
  FOR DELETE USING (
    inspection_id IN (
      SELECT id FROM public.vessel_inspections 
      WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
    )
  );

-- RLS Policies for equipment_locations
CREATE POLICY "Users can view equipment locations" ON public.equipment_locations
  FOR SELECT USING (true);

CREATE POLICY "Users can manage equipment locations" ON public.equipment_locations
  FOR ALL USING (
    parent_equipment_id IN (
      SELECT id FROM public.equipment_assets 
      WHERE shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
    )
  );

-- Indexes
CREATE INDEX idx_vessel_inspections_vessel ON public.vessel_inspections(vessel_id);
CREATE INDEX idx_vessel_inspections_date ON public.vessel_inspections(inspection_date DESC);
CREATE INDEX idx_vessel_inspection_items_inspection ON public.vessel_inspection_items(inspection_id);
CREATE INDEX idx_vessel_inspection_templates_type ON public.vessel_inspection_templates(equipment_type);
CREATE INDEX idx_equipment_locations_parent ON public.equipment_locations(parent_equipment_id);

-- Update trigger for timestamps
CREATE TRIGGER update_vessel_inspections_updated_at
  BEFORE UPDATE ON public.vessel_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_boat_inspections_updated_at();

CREATE TRIGGER update_vessel_inspection_templates_updated_at
  BEFORE UPDATE ON public.vessel_inspection_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_boat_inspections_updated_at();

-- Seed default inspection templates
INSERT INTO public.vessel_inspection_templates (equipment_type, category, item_name, item_key, display_order) VALUES
-- Vessel general items
('vessel', 'Hull & Structure', 'Hull Condition', 'hull_condition', 1),
('vessel', 'Hull & Structure', 'Deck Condition', 'deck_condition', 2),
('vessel', 'Hull & Structure', 'Transom', 'transom', 3),
('vessel', 'Hull & Structure', 'Gunwales', 'gunwales', 4),
('vessel', 'Hull & Structure', 'Hatches & Covers', 'hatches_covers', 5),
('vessel', 'Navigation', 'Port Nav Light', 'port_nav_light', 10),
('vessel', 'Navigation', 'Starboard Nav Light', 'starboard_nav_light', 11),
('vessel', 'Navigation', 'Stern Light', 'stern_light', 12),
('vessel', 'Navigation', 'Anchor Light', 'anchor_light', 13),
('vessel', 'Navigation', 'Horn/Whistle', 'horn_whistle', 14),
('vessel', 'Safety Equipment', 'Life Jackets', 'life_jackets', 20),
('vessel', 'Safety Equipment', 'Throwable PFD', 'throwable_pfd', 21),
('vessel', 'Safety Equipment', 'First Aid Kit', 'first_aid_kit', 22),
('vessel', 'Safety Equipment', 'Flares', 'flares', 23),
('vessel', 'Electrical', 'Bilge Pump', 'bilge_pump', 30),
('vessel', 'Electrical', 'Battery Condition', 'battery_condition', 31),
('vessel', 'Electrical', 'Wiring', 'wiring', 32),
-- Outboard/Engine items
('outboard', 'Fluids', 'Oil Level', 'oil_level', 1),
('outboard', 'Fluids', 'Coolant Level', 'coolant_level', 2),
('outboard', 'Fluids', 'Gear Oil', 'gear_oil', 3),
('outboard', 'Engine', 'Belts', 'belts', 10),
('outboard', 'Engine', 'Hoses', 'hoses', 11),
('outboard', 'Engine', 'Prop Condition', 'prop_condition', 12),
('outboard', 'Engine', 'Lower Unit', 'lower_unit', 13),
('outboard', 'Engine', 'Anodes', 'anodes', 14),
('outboard', 'Fuel System', 'Fuel Lines', 'fuel_lines', 20),
('outboard', 'Fuel System', 'Fuel Filter', 'fuel_filter', 21),
('outboard', 'Fuel System', 'Primer Bulb', 'primer_bulb', 22),
('outboard', 'Controls', 'Throttle', 'throttle', 30),
('outboard', 'Controls', 'Shift', 'shift', 31),
('outboard', 'Controls', 'Steering', 'steering', 32),
-- Fire Extinguisher items
('fire_extinguisher', 'General', 'Pressure Gauge', 'pressure_gauge', 1),
('fire_extinguisher', 'General', 'Pin & Seal Intact', 'pin_seal', 2),
('fire_extinguisher', 'General', 'Hose Condition', 'hose_condition', 3),
('fire_extinguisher', 'General', 'Mount Bracket', 'mount_bracket', 4),
('fire_extinguisher', 'General', 'Expiration Date', 'expiration_date', 5),
-- Inboard Engine items
('inboard', 'Fluids', 'Oil Level', 'oil_level', 1),
('inboard', 'Fluids', 'Coolant Level', 'coolant_level', 2),
('inboard', 'Fluids', 'Transmission Fluid', 'transmission_fluid', 3),
('inboard', 'Engine', 'Belts', 'belts', 10),
('inboard', 'Engine', 'Hoses', 'hoses', 11),
('inboard', 'Engine', 'Exhaust System', 'exhaust_system', 12),
('inboard', 'Engine', 'Raw Water Strainer', 'raw_water_strainer', 13),
('inboard', 'Engine', 'Impeller', 'impeller', 14),
-- Life Raft items
('life_raft', 'General', 'Container Condition', 'container_condition', 1),
('life_raft', 'General', 'Hydrostatic Release', 'hydrostatic_release', 2),
('life_raft', 'General', 'Service Date', 'service_date', 3),
('life_raft', 'General', 'Mounting', 'mounting', 4),
-- Generator items
('generator', 'Fluids', 'Oil Level', 'oil_level', 1),
('generator', 'Fluids', 'Coolant Level', 'coolant_level', 2),
('generator', 'Engine', 'Belts', 'belts', 10),
('generator', 'Engine', 'Exhaust', 'exhaust', 11),
('generator', 'Electrical', 'Output Test', 'output_test', 20);