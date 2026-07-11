-- Create maintenance_item_presets table for smart autocomplete
CREATE TABLE public.maintenance_item_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  is_system_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_maintenance_item_presets_shop_id ON public.maintenance_item_presets(shop_id);
CREATE INDEX idx_maintenance_item_presets_name ON public.maintenance_item_presets(name);
CREATE INDEX idx_maintenance_item_presets_category ON public.maintenance_item_presets(category);

-- Enable RLS
ALTER TABLE public.maintenance_item_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can see system defaults OR their shop's presets
CREATE POLICY "Users can view system defaults and their shop presets"
ON public.maintenance_item_presets
FOR SELECT
USING (
  is_system_default = TRUE 
  OR shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can insert presets for their shop"
ON public.maintenance_item_presets
FOR INSERT
WITH CHECK (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update their shop presets"
ON public.maintenance_item_presets
FOR UPDATE
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
  AND is_system_default = FALSE
);

CREATE POLICY "Users can delete their shop presets"
ON public.maintenance_item_presets
FOR DELETE
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
  AND is_system_default = FALSE
);

-- Insert system default presets (no shop_id = available to all)
INSERT INTO public.maintenance_item_presets (name, category, description, is_system_default) VALUES
-- Engines
('Port Engine', 'engine', 'Port side main engine', TRUE),
('Starboard Engine', 'engine', 'Starboard side main engine', TRUE),
('Main Engine', 'engine', 'Primary single engine', TRUE),
('Generator', 'engine', 'Generator engine/unit', TRUE),
('Auxiliary Engine', 'engine', 'Auxiliary power engine', TRUE),
('Wing Engine', 'engine', 'Wing engine for maneuvering', TRUE),

-- Marine Equipment
('Fire Pump', 'marine', 'Fire suppression pump', TRUE),
('Bilge Pump', 'marine', 'Bilge water pump', TRUE),
('Hydraulic System', 'marine', 'Hydraulic power system', TRUE),
('Bow Thruster', 'marine', 'Bow thruster motor', TRUE),
('Stern Thruster', 'marine', 'Stern thruster motor', TRUE),
('Deck Winch', 'marine', 'Deck winch system', TRUE),
('Anchor Windlass', 'marine', 'Anchor windlass system', TRUE),
('Steering System', 'marine', 'Vessel steering system', TRUE),
('Rudder', 'marine', 'Rudder assembly', TRUE),
('Propeller', 'marine', 'Propeller/screw', TRUE),
('Shaft', 'marine', 'Propeller shaft', TRUE),

-- Safety Equipment
('Fire Extinguisher', 'safety', 'Portable fire extinguisher', TRUE),
('Life Raft', 'safety', 'Emergency life raft', TRUE),
('EPIRB', 'safety', 'Emergency Position Indicating Radio Beacon', TRUE),
('Flare Kit', 'safety', 'Emergency flare kit', TRUE),
('First Aid Kit', 'safety', 'Medical first aid kit', TRUE),
('Life Jackets', 'safety', 'Personal flotation devices', TRUE),
('Smoke Detectors', 'safety', 'Fire/smoke detection system', TRUE),
('CO Detector', 'safety', 'Carbon monoxide detector', TRUE),

-- Filters & Fluids
('Oil Filter', 'filters', 'Engine oil filter', TRUE),
('Fuel Filter', 'filters', 'Fuel filter element', TRUE),
('Air Filter', 'filters', 'Engine air filter', TRUE),
('Hydraulic Filter', 'filters', 'Hydraulic fluid filter', TRUE),
('Coolant Filter', 'filters', 'Coolant/water filter', TRUE),
('Transmission Filter', 'filters', 'Transmission fluid filter', TRUE),

-- Common Components
('Transmission', 'component', 'Transmission/gearbox', TRUE),
('Alternator', 'component', 'Electrical alternator', TRUE),
('Starter Motor', 'component', 'Engine starter motor', TRUE),
('Water Pump', 'component', 'Cooling water pump', TRUE),
('Fuel Pump', 'component', 'Fuel injection pump', TRUE),
('Turbocharger', 'component', 'Turbocharger unit', TRUE),
('Exhaust System', 'component', 'Exhaust manifold/system', TRUE),
('Batteries', 'component', 'Battery bank/system', TRUE),
('Belt Drive', 'component', 'Drive belt system', TRUE),
('Impeller', 'component', 'Water pump impeller', TRUE),
('Heat Exchanger', 'component', 'Cooling heat exchanger', TRUE),
('Zincs/Anodes', 'component', 'Sacrificial anodes', TRUE);

-- Create trigger for updated_at
CREATE TRIGGER update_maintenance_item_presets_updated_at
BEFORE UPDATE ON public.maintenance_item_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();