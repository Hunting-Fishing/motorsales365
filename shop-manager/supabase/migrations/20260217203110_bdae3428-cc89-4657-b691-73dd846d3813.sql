
-- =============================================
-- SEPTIC SERVICES MODULE - Core Tables
-- =============================================

-- 1. Septic Tanks Registry
CREATE TABLE public.septic_tanks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  location_address TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  tank_type TEXT NOT NULL DEFAULT 'concrete',
  tank_size_gallons INTEGER,
  number_of_compartments INTEGER DEFAULT 1,
  installation_date DATE,
  last_pump_date DATE,
  next_pump_due DATE,
  drain_field_type TEXT,
  drain_field_size TEXT,
  permit_number TEXT,
  system_status TEXT DEFAULT 'active',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_tanks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view septic tanks in their shop"
  ON public.septic_tanks FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert septic tanks in their shop"
  ON public.septic_tanks FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update septic tanks in their shop"
  ON public.septic_tanks FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete septic tanks in their shop"
  ON public.septic_tanks FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- 2. Septic Service Orders
CREATE TABLE public.septic_service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  order_number TEXT,
  customer_id UUID REFERENCES public.customers(id),
  tank_id UUID REFERENCES public.septic_tanks(id),
  service_type TEXT NOT NULL DEFAULT 'pump_out',
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  scheduled_date DATE,
  scheduled_time TEXT,
  completed_date TIMESTAMPTZ,
  assigned_driver_id UUID,
  assigned_truck_id UUID,
  location_address TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  gallons_pumped INTEGER,
  disposal_site TEXT,
  disposal_manifest TEXT,
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  notes TEXT,
  internal_notes TEXT,
  customer_signature TEXT,
  photos TEXT[],
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view septic orders in their shop"
  ON public.septic_service_orders FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert septic orders in their shop"
  ON public.septic_service_orders FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update septic orders in their shop"
  ON public.septic_service_orders FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete septic orders in their shop"
  ON public.septic_service_orders FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- 3. Septic Pump-Outs
CREATE TABLE public.septic_pump_outs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  tank_id UUID REFERENCES public.septic_tanks(id),
  service_order_id UUID REFERENCES public.septic_service_orders(id),
  pump_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  gallons_pumped INTEGER,
  sludge_depth_before TEXT,
  sludge_depth_after TEXT,
  scum_depth_before TEXT,
  scum_depth_after TEXT,
  liquid_level TEXT,
  pump_truck_id UUID,
  driver_id UUID,
  disposal_site TEXT,
  disposal_manifest_number TEXT,
  condition_notes TEXT,
  issues_found TEXT[],
  recommendations TEXT,
  photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_pump_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pump outs in their shop"
  ON public.septic_pump_outs FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert pump outs in their shop"
  ON public.septic_pump_outs FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update pump outs in their shop"
  ON public.septic_pump_outs FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete pump outs in their shop"
  ON public.septic_pump_outs FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- 4. Septic Inspections
CREATE TABLE public.septic_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  tank_id UUID REFERENCES public.septic_tanks(id),
  service_order_id UUID REFERENCES public.septic_service_orders(id),
  inspection_type TEXT NOT NULL DEFAULT 'routine',
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  inspector_id UUID,
  inspector_name TEXT,
  permit_number TEXT,
  regulatory_body TEXT,
  overall_condition TEXT DEFAULT 'good',
  tank_condition TEXT,
  drain_field_condition TEXT,
  baffle_condition TEXT,
  riser_condition TEXT,
  effluent_filter_condition TEXT,
  distribution_box_condition TEXT,
  groundwater_contamination BOOLEAN DEFAULT false,
  surface_ponding BOOLEAN DEFAULT false,
  odor_present BOOLEAN DEFAULT false,
  pass_fail TEXT,
  deficiencies TEXT[],
  corrective_actions TEXT,
  next_inspection_due DATE,
  report_url TEXT,
  photos TEXT[],
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inspections in their shop"
  ON public.septic_inspections FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert inspections in their shop"
  ON public.septic_inspections FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update inspections in their shop"
  ON public.septic_inspections FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete inspections in their shop"
  ON public.septic_inspections FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- 5. Septic System Components
CREATE TABLE public.septic_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  tank_id UUID REFERENCES public.septic_tanks(id),
  component_type TEXT NOT NULL,
  component_name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  install_date DATE,
  condition TEXT DEFAULT 'good',
  last_serviced DATE,
  next_service_due DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view components in their shop"
  ON public.septic_components FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert components in their shop"
  ON public.septic_components FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update components in their shop"
  ON public.septic_components FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete components in their shop"
  ON public.septic_components FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

-- 6. Storage bucket for septic documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('septic-documents', 'septic-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can view septic docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'septic-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can upload septic docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'septic-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update septic docs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'septic-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete septic docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'septic-documents' AND auth.role() = 'authenticated');

-- 7. Updated_at triggers
CREATE TRIGGER update_septic_tanks_updated_at BEFORE UPDATE ON public.septic_tanks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_service_orders_updated_at BEFORE UPDATE ON public.septic_service_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_pump_outs_updated_at BEFORE UPDATE ON public.septic_pump_outs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_inspections_updated_at BEFORE UPDATE ON public.septic_inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_septic_components_updated_at BEFORE UPDATE ON public.septic_components FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Indexes
CREATE INDEX idx_septic_tanks_shop ON public.septic_tanks(shop_id);
CREATE INDEX idx_septic_tanks_customer ON public.septic_tanks(customer_id);
CREATE INDEX idx_septic_service_orders_shop ON public.septic_service_orders(shop_id);
CREATE INDEX idx_septic_service_orders_status ON public.septic_service_orders(status);
CREATE INDEX idx_septic_service_orders_scheduled ON public.septic_service_orders(scheduled_date);
CREATE INDEX idx_septic_pump_outs_shop ON public.septic_pump_outs(shop_id);
CREATE INDEX idx_septic_pump_outs_tank ON public.septic_pump_outs(tank_id);
CREATE INDEX idx_septic_inspections_shop ON public.septic_inspections(shop_id);
CREATE INDEX idx_septic_inspections_tank ON public.septic_inspections(tank_id);
CREATE INDEX idx_septic_components_shop ON public.septic_components(shop_id);
CREATE INDEX idx_septic_components_tank ON public.septic_components(tank_id);
