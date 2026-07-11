
-- Septic System Types (Type 1, Type 2, etc.)
CREATE TABLE public.septic_system_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  inspection_template_id UUID REFERENCES public.inspection_form_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_system_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop members can manage septic_system_types" ON public.septic_system_types
  FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE TRIGGER update_septic_system_types_updated_at
  BEFORE UPDATE ON public.septic_system_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_septic_system_types_shop ON public.septic_system_types(shop_id);

-- Required products per system type (filters, chemicals, etc.)
CREATE TABLE public.septic_system_type_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_type_id UUID NOT NULL REFERENCES public.septic_system_types(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.septic_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL DEFAULT 'general',
  quantity_needed NUMERIC NOT NULL DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_system_type_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop members can manage septic_system_type_products" ON public.septic_system_type_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.septic_system_types st
      WHERE st.id = system_type_id AND st.shop_id = public.get_current_user_shop_id()
    )
  );

CREATE TRIGGER update_septic_system_type_products_updated_at
  BEFORE UPDATE ON public.septic_system_type_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_septic_stp_system_type ON public.septic_system_type_products(system_type_id);

-- Link customer/property to a system type
CREATE TABLE public.septic_property_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  system_type_id UUID NOT NULL REFERENCES public.septic_system_types(id) ON DELETE CASCADE,
  property_address TEXT,
  tank_size_gallons NUMERIC,
  install_date DATE,
  last_service_date DATE,
  next_service_date DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_property_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop members can manage septic_property_systems" ON public.septic_property_systems
  FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE TRIGGER update_septic_property_systems_updated_at
  BEFORE UPDATE ON public.septic_property_systems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_septic_ps_shop ON public.septic_property_systems(shop_id);
CREATE INDEX idx_septic_ps_customer ON public.septic_property_systems(customer_id);
CREATE INDEX idx_septic_ps_system_type ON public.septic_property_systems(system_type_id);

-- Saved inspection form instances (completed forms linked to work orders)
CREATE TABLE public.septic_inspection_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  property_system_id UUID REFERENCES public.septic_property_systems(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.inspection_form_templates(id) ON DELETE SET NULL,
  system_type_id UUID REFERENCES public.septic_system_types(id) ON DELETE SET NULL,
  inspector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft',
  inspection_data JSONB DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  videos TEXT[] DEFAULT '{}',
  comments TEXT,
  overall_condition TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_inspection_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop members can manage septic_inspection_records" ON public.septic_inspection_records
  FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE TRIGGER update_septic_inspection_records_updated_at
  BEFORE UPDATE ON public.septic_inspection_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_septic_ir_shop ON public.septic_inspection_records(shop_id);
CREATE INDEX idx_septic_ir_work_order ON public.septic_inspection_records(work_order_id);
CREATE INDEX idx_septic_ir_customer ON public.septic_inspection_records(customer_id);

-- Inventory reorder settings per product
CREATE TABLE public.septic_inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.septic_products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  reorder_point NUMERIC NOT NULL DEFAULT 5,
  reorder_quantity NUMERIC NOT NULL DEFAULT 10,
  advance_notice_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_alert_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.septic_inventory_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop members can manage septic_inventory_alerts" ON public.septic_inventory_alerts
  FOR ALL USING (shop_id = public.get_current_user_shop_id());

CREATE TRIGGER update_septic_inventory_alerts_updated_at
  BEFORE UPDATE ON public.septic_inventory_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_septic_ia_shop ON public.septic_inventory_alerts(shop_id);
