
-- 1. Shipment Tracker (consolidated real-time tracking)
CREATE TABLE public.export_shipment_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  shipment_id UUID REFERENCES public.export_shipments(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.export_orders(id) ON DELETE SET NULL,
  current_status TEXT NOT NULL DEFAULT 'pending',
  origin_port TEXT,
  destination_port TEXT,
  current_location TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  vessel_name TEXT,
  container_number TEXT,
  etd TIMESTAMPTZ,
  eta TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  delay_days INTEGER DEFAULT 0,
  milestone_log JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Vendor Scorecard
CREATE TABLE public.export_vendor_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_type TEXT NOT NULL DEFAULT 'supplier',
  on_time_delivery_pct NUMERIC DEFAULT 0,
  quality_score NUMERIC DEFAULT 0,
  responsiveness_score NUMERIC DEFAULT 0,
  cost_competitiveness NUMERIC DEFAULT 0,
  overall_score NUMERIC GENERATED ALWAYS AS (
    (COALESCE(on_time_delivery_pct,0) + COALESCE(quality_score,0) + COALESCE(responsiveness_score,0) + COALESCE(cost_competitiveness,0)) / 4
  ) STORED,
  review_period TEXT,
  total_orders INTEGER DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  notes TEXT,
  last_review_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Demand Forecasting
CREATE TABLE public.export_demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  product_id UUID REFERENCES public.export_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  region TEXT,
  forecast_period TEXT NOT NULL,
  forecast_qty NUMERIC NOT NULL DEFAULT 0,
  actual_qty NUMERIC DEFAULT 0,
  variance_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN forecast_qty > 0 THEN ((COALESCE(actual_qty,0) - forecast_qty) / forecast_qty * 100) ELSE 0 END
  ) STORED,
  method TEXT DEFAULT 'manual',
  confidence_level NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Container Load Planning
CREATE TABLE public.export_container_load_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  plan_name TEXT NOT NULL,
  container_type TEXT NOT NULL DEFAULT '40ft',
  max_weight_kg NUMERIC DEFAULT 28000,
  max_volume_cbm NUMERIC DEFAULT 67.7,
  planned_weight_kg NUMERIC DEFAULT 0,
  planned_volume_cbm NUMERIC DEFAULT 0,
  utilization_weight_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN max_weight_kg > 0 THEN (COALESCE(planned_weight_kg,0) / max_weight_kg * 100) ELSE 0 END
  ) STORED,
  utilization_volume_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN max_volume_cbm > 0 THEN (COALESCE(planned_volume_cbm,0) / max_volume_cbm * 100) ELSE 0 END
  ) STORED,
  items JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft',
  shipment_id UUID REFERENCES public.export_shipments(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Multi-Currency P&L Consolidation
CREATE TABLE public.export_consolidated_pl (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  report_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  total_revenue NUMERIC DEFAULT 0,
  total_cogs NUMERIC DEFAULT 0,
  total_freight NUMERIC DEFAULT 0,
  total_duties NUMERIC DEFAULT 0,
  total_insurance NUMERIC DEFAULT 0,
  total_commissions NUMERIC DEFAULT 0,
  total_other_costs NUMERIC DEFAULT 0,
  gross_profit NUMERIC GENERATED ALWAYS AS (
    COALESCE(total_revenue,0) - COALESCE(total_cogs,0) - COALESCE(total_freight,0) - COALESCE(total_duties,0) - COALESCE(total_insurance,0) - COALESCE(total_commissions,0) - COALESCE(total_other_costs,0)
  ) STORED,
  fx_gain_loss NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  breakdown_by_currency JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. AR/AP Aging
CREATE TABLE public.export_aging_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('receivable','payable')),
  counterparty_name TEXT NOT NULL,
  counterparty_id UUID,
  total_outstanding NUMERIC DEFAULT 0,
  current_amount NUMERIC DEFAULT 0,
  days_30 NUMERIC DEFAULT 0,
  days_60 NUMERIC DEFAULT 0,
  days_90 NUMERIC DEFAULT 0,
  days_120_plus NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Landed Cost Calculator
CREATE TABLE public.export_landed_cost_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  calculation_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_cost NUMERIC DEFAULT 0,
  quantity NUMERIC DEFAULT 1,
  freight_cost NUMERIC DEFAULT 0,
  insurance_cost NUMERIC DEFAULT 0,
  customs_duty_rate NUMERIC DEFAULT 0,
  customs_duty_amount NUMERIC GENERATED ALWAYS AS (
    COALESCE(product_cost,0) * COALESCE(quantity,1) * COALESCE(customs_duty_rate,0) / 100
  ) STORED,
  handling_cost NUMERIC DEFAULT 0,
  other_costs NUMERIC DEFAULT 0,
  total_landed_cost NUMERIC GENERATED ALWAYS AS (
    (COALESCE(product_cost,0) * COALESCE(quantity,1)) + COALESCE(freight_cost,0) + COALESCE(insurance_cost,0) + (COALESCE(product_cost,0) * COALESCE(quantity,1) * COALESCE(customs_duty_rate,0) / 100) + COALESCE(handling_cost,0) + COALESCE(other_costs,0)
  ) STORED,
  unit_landed_cost NUMERIC GENERATED ALWAYS AS (
    CASE WHEN COALESCE(quantity,1) > 0 THEN
      ((COALESCE(product_cost,0) * COALESCE(quantity,1)) + COALESCE(freight_cost,0) + COALESCE(insurance_cost,0) + (COALESCE(product_cost,0) * COALESCE(quantity,1) * COALESCE(customs_duty_rate,0) / 100) + COALESCE(handling_cost,0) + COALESCE(other_costs,0)) / COALESCE(quantity,1)
    ELSE 0 END
  ) STORED,
  currency TEXT DEFAULT 'USD',
  destination_country TEXT,
  hs_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Messaging Templates
CREATE TABLE public.export_messaging_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  category TEXT NOT NULL DEFAULT 'order',
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  language TEXT DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Customer Portal Access
CREATE TABLE public.export_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  customer_id UUID REFERENCES public.export_customers(id) ON DELETE CASCADE,
  access_token TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  permissions JSONB DEFAULT '{"view_orders":true,"view_shipments":true,"download_documents":true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. EDI/API Hub
CREATE TABLE public.export_edi_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  connection_name TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  connection_type TEXT NOT NULL DEFAULT 'API',
  endpoint_url TEXT,
  protocol TEXT DEFAULT 'REST',
  auth_type TEXT DEFAULT 'api_key',
  status TEXT DEFAULT 'inactive',
  last_sync_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Trade Lane Analytics
CREATE TABLE public.export_trade_lanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  origin_country TEXT NOT NULL,
  origin_port TEXT,
  destination_country TEXT NOT NULL,
  destination_port TEXT,
  total_shipments INTEGER DEFAULT 0,
  total_volume_cbm NUMERIC DEFAULT 0,
  total_weight_kg NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  avg_transit_days NUMERIC DEFAULT 0,
  avg_cost_per_kg NUMERIC DEFAULT 0,
  primary_transport_mode TEXT DEFAULT 'sea',
  period TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. KPI Dashboard
CREATE TABLE public.export_kpi_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  widget_name TEXT NOT NULL,
  kpi_type TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '%',
  period TEXT DEFAULT 'monthly',
  trend TEXT DEFAULT 'stable',
  trend_value NUMERIC DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.export_shipment_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_vendor_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_container_load_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_consolidated_pl ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_aging_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_landed_cost_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_messaging_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_edi_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_trade_lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_kpi_widgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'export_shipment_tracker','export_vendor_scorecards','export_demand_forecasts',
    'export_container_load_plans','export_consolidated_pl','export_aging_reports',
    'export_landed_cost_calculations','export_messaging_templates','export_portal_access',
    'export_edi_connections','export_trade_lanes','export_kpi_widgets'
  ]) LOOP
    EXECUTE format('CREATE POLICY "shop_isolation_%s" ON public.%I FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id())', tbl, tbl);
  END LOOP;
END $$;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_export_extra_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'export_shipment_tracker','export_vendor_scorecards','export_demand_forecasts',
    'export_container_load_plans','export_consolidated_pl','export_aging_reports',
    'export_landed_cost_calculations','export_messaging_templates','export_portal_access',
    'export_edi_connections','export_trade_lanes','export_kpi_widgets'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER set_updated_at_%s BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_export_extra_updated_at()', tbl, tbl);
  END LOOP;
END $$;
