
CREATE OR REPLACE FUNCTION public.export_set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TABLE public.export_ports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  port_name TEXT NOT NULL,
  port_code TEXT,
  country TEXT NOT NULL,
  port_type TEXT NOT NULL DEFAULT 'sea',
  city TEXT,
  timezone TEXT,
  handling_capabilities TEXT[] DEFAULT '{}',
  average_transit_days JSONB DEFAULT '{}',
  terminal_info TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  operating_hours TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_ports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own shop ports" ON public.export_ports FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE TRIGGER set_updated_at_export_ports BEFORE UPDATE ON public.export_ports FOR EACH ROW EXECUTE FUNCTION public.export_set_updated_at();

CREATE TABLE public.export_bonded_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  warehouse_name TEXT NOT NULL,
  warehouse_type TEXT NOT NULL DEFAULT 'bonded',
  license_number TEXT,
  license_expiry DATE,
  location TEXT,
  country TEXT,
  capacity_total NUMERIC(12,2) DEFAULT 0,
  capacity_used NUMERIC(12,2) DEFAULT 0,
  storage_rate_per_day NUMERIC(10,2) DEFAULT 0,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  customs_office TEXT,
  bond_amount NUMERIC(12,2),
  bond_expiry DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_bonded_warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own shop bonded warehouses" ON public.export_bonded_warehouses FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE TRIGGER set_updated_at_export_bonded_warehouses BEFORE UPDATE ON public.export_bonded_warehouses FOR EACH ROW EXECUTE FUNCTION public.export_set_updated_at();

CREATE TABLE public.export_transport_legs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  shipment_reference TEXT,
  leg_number INTEGER NOT NULL DEFAULT 1,
  transport_mode TEXT NOT NULL DEFAULT 'sea',
  carrier_name TEXT,
  vessel_or_vehicle TEXT,
  origin_location TEXT NOT NULL,
  destination_location TEXT NOT NULL,
  departure_date TIMESTAMPTZ,
  arrival_date TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned',
  tracking_number TEXT,
  cost NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  container_number TEXT,
  weight_kg NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_transport_legs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own shop transport legs" ON public.export_transport_legs FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE TRIGGER set_updated_at_export_transport_legs BEFORE UPDATE ON public.export_transport_legs FOR EACH ROW EXECUTE FUNCTION public.export_set_updated_at();

CREATE TABLE public.export_shipment_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  shipment_reference TEXT NOT NULL,
  order_reference TEXT,
  customer_name TEXT,
  revenue NUMERIC(12,2) DEFAULT 0,
  product_cost NUMERIC(12,2) DEFAULT 0,
  freight_cost NUMERIC(12,2) DEFAULT 0,
  insurance_cost NUMERIC(12,2) DEFAULT 0,
  customs_duties NUMERIC(12,2) DEFAULT 0,
  handling_cost NUMERIC(12,2) DEFAULT 0,
  packaging_cost NUMERIC(12,2) DEFAULT 0,
  commission_cost NUMERIC(12,2) DEFAULT 0,
  banking_fees NUMERIC(12,2) DEFAULT 0,
  other_costs NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(12,2) GENERATED ALWAYS AS (product_cost + freight_cost + insurance_cost + customs_duties + handling_cost + packaging_cost + commission_cost + banking_fees + other_costs) STORED,
  profit NUMERIC(12,2) GENERATED ALWAYS AS (revenue - (product_cost + freight_cost + insurance_cost + customs_duties + handling_cost + packaging_cost + commission_cost + banking_fees + other_costs)) STORED,
  margin_pct NUMERIC(5,2) GENERATED ALWAYS AS (CASE WHEN revenue > 0 THEN ((revenue - (product_cost + freight_cost + insurance_cost + customs_duties + handling_cost + packaging_cost + commission_cost + banking_fees + other_costs)) / revenue * 100) ELSE 0 END) STORED,
  currency TEXT DEFAULT 'USD',
  shipment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_shipment_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own shop shipment costs" ON public.export_shipment_costs FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE TRIGGER set_updated_at_export_shipment_costs BEFORE UPDATE ON public.export_shipment_costs FOR EACH ROW EXECUTE FUNCTION public.export_set_updated_at();

CREATE TABLE public.export_trade_finance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  open_lc_count INTEGER DEFAULT 0,
  open_lc_value NUMERIC(14,2) DEFAULT 0,
  active_guarantees_count INTEGER DEFAULT 0,
  active_guarantees_value NUMERIC(14,2) DEFAULT 0,
  total_receivables NUMERIC(14,2) DEFAULT 0,
  overdue_receivables NUMERIC(14,2) DEFAULT 0,
  total_credit_exposure NUMERIC(14,2) DEFAULT 0,
  available_credit NUMERIC(14,2) DEFAULT 0,
  pending_duty_drawbacks NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_trade_finance_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own shop trade finance" ON public.export_trade_finance_snapshots FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE TABLE public.export_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'commercial_invoice',
  description TEXT,
  header_fields JSONB DEFAULT '[]',
  body_fields JSONB DEFAULT '[]',
  footer_fields JSONB DEFAULT '[]',
  logo_url TEXT,
  default_terms TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own shop doc templates" ON public.export_document_templates FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE TRIGGER set_updated_at_export_document_templates BEFORE UPDATE ON public.export_document_templates FOR EACH ROW EXECUTE FUNCTION public.export_set_updated_at();

CREATE TABLE public.export_customs_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  declaration_number TEXT,
  declaration_type TEXT NOT NULL DEFAULT 'export',
  filing_type TEXT DEFAULT 'AES',
  itn_number TEXT,
  shipment_reference TEXT,
  exporter_name TEXT,
  consignee_name TEXT,
  destination_country TEXT,
  origin_country TEXT,
  total_value NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  hs_codes TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  filed_date DATE,
  accepted_date DATE,
  customs_broker TEXT,
  broker_reference TEXT,
  port_of_export TEXT,
  port_of_entry TEXT,
  transport_mode TEXT,
  license_exceptions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_customs_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own shop customs declarations" ON public.export_customs_declarations FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE TRIGGER set_updated_at_export_customs_declarations BEFORE UPDATE ON public.export_customs_declarations FOR EACH ROW EXECUTE FUNCTION public.export_set_updated_at();

CREATE TABLE public.export_trade_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'info',
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  action_url TEXT,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.export_trade_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own shop trade alerts" ON public.export_trade_alerts FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
