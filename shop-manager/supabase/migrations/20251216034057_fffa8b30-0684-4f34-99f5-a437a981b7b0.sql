
-- =====================================================
-- PHASE 1: FUEL MANAGEMENT & WARRANTY TRACKING SYSTEM
-- =====================================================

-- ===================
-- FUEL MANAGEMENT
-- ===================

-- Fuel Cards table
CREATE TABLE public.fuel_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  card_number VARCHAR(50) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  assigned_equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE SET NULL,
  assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  assigned_employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pin_hash VARCHAR(255),
  credit_limit DECIMAL(10,2),
  current_balance DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'lost', 'stolen')),
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Fuel Stations table
CREATE TABLE public.fuel_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  phone VARCHAR(50),
  accepted_card_types TEXT[],
  is_preferred BOOLEAN DEFAULT false,
  notes TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel Budgets table
CREATE TABLE public.fuel_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  budget_period VARCHAR(20) NOT NULL CHECK (budget_period IN ('monthly', 'quarterly', 'annual')),
  budget_amount DECIMAL(10,2) NOT NULL,
  alert_threshold_percent INTEGER DEFAULT 80,
  fiscal_year INTEGER,
  month INTEGER,
  quarter INTEGER,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Add columns to existing fuel_entries if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_entries' AND column_name = 'fuel_card_id') THEN
    ALTER TABLE public.fuel_entries ADD COLUMN fuel_card_id UUID REFERENCES public.fuel_cards(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_entries' AND column_name = 'fuel_station_id') THEN
    ALTER TABLE public.fuel_entries ADD COLUMN fuel_station_id UUID REFERENCES public.fuel_stations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_entries' AND column_name = 'receipt_image_url') THEN
    ALTER TABLE public.fuel_entries ADD COLUMN receipt_image_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fuel_entries' AND column_name = 'mpg_calculated') THEN
    ALTER TABLE public.fuel_entries ADD COLUMN mpg_calculated DECIMAL(6,2);
  END IF;
END $$;

-- ===================
-- WARRANTY TRACKING
-- ===================

-- Asset Warranties table (equipment & vehicle level)
CREATE TABLE public.asset_warranties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  warranty_name VARCHAR(200) NOT NULL,
  manufacturer VARCHAR(200),
  warranty_type VARCHAR(50) NOT NULL CHECK (warranty_type IN ('manufacturer', 'extended', 'powertrain', 'bumper_to_bumper', 'parts', 'labor', 'comprehensive')),
  coverage_description TEXT,
  policy_number VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  mileage_limit INTEGER,
  hours_limit INTEGER,
  deductible DECIMAL(10,2),
  contact_name VARCHAR(200),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(200),
  claim_phone VARCHAR(50),
  document_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  CONSTRAINT asset_warranty_check CHECK (equipment_id IS NOT NULL OR vehicle_id IS NOT NULL)
);

-- Part Warranties table (individual part tracking)
CREATE TABLE public.part_warranties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  part_name VARCHAR(200) NOT NULL,
  part_number VARCHAR(100),
  serial_number VARCHAR(100),
  manufacturer VARCHAR(200),
  installed_date DATE NOT NULL,
  warranty_months INTEGER,
  warranty_miles INTEGER,
  warranty_hours INTEGER,
  expiry_date DATE NOT NULL,
  purchase_price DECIMAL(10,2),
  warranty_value DECIMAL(10,2),
  coverage_description TEXT,
  document_url TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'claimed', 'voided')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Warranty Claims table
CREATE TABLE public.warranty_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  claim_number VARCHAR(50) NOT NULL,
  asset_warranty_id UUID REFERENCES public.asset_warranties(id) ON DELETE SET NULL,
  part_warranty_id UUID REFERENCES public.part_warranties(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_description TEXT NOT NULL,
  failure_date DATE,
  mileage_at_failure INTEGER,
  hours_at_failure INTEGER,
  repair_description TEXT,
  parts_cost DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  amount_claimed DECIMAL(10,2) NOT NULL,
  amount_approved DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'denied', 'paid', 'closed')),
  submitted_date DATE,
  resolved_date DATE,
  denial_reason TEXT,
  reference_number VARCHAR(100),
  contact_name VARCHAR(200),
  notes TEXT,
  documents TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  CONSTRAINT warranty_claim_check CHECK (asset_warranty_id IS NOT NULL OR part_warranty_id IS NOT NULL)
);

-- ===================
-- RLS POLICIES
-- ===================

-- Enable RLS
ALTER TABLE public.fuel_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;

-- Fuel Cards policies
CREATE POLICY "Users can view fuel cards in their shop" ON public.fuel_cards
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can create fuel cards in their shop" ON public.fuel_cards
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can update fuel cards in their shop" ON public.fuel_cards
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can delete fuel cards in their shop" ON public.fuel_cards
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- Fuel Stations policies
CREATE POLICY "Users can view fuel stations in their shop" ON public.fuel_stations
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can create fuel stations in their shop" ON public.fuel_stations
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can update fuel stations in their shop" ON public.fuel_stations
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can delete fuel stations in their shop" ON public.fuel_stations
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- Fuel Budgets policies
CREATE POLICY "Users can view fuel budgets in their shop" ON public.fuel_budgets
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can create fuel budgets in their shop" ON public.fuel_budgets
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can update fuel budgets in their shop" ON public.fuel_budgets
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can delete fuel budgets in their shop" ON public.fuel_budgets
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- Asset Warranties policies
CREATE POLICY "Users can view asset warranties in their shop" ON public.asset_warranties
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can create asset warranties in their shop" ON public.asset_warranties
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can update asset warranties in their shop" ON public.asset_warranties
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can delete asset warranties in their shop" ON public.asset_warranties
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- Part Warranties policies
CREATE POLICY "Users can view part warranties in their shop" ON public.part_warranties
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can create part warranties in their shop" ON public.part_warranties
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can update part warranties in their shop" ON public.part_warranties
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can delete part warranties in their shop" ON public.part_warranties
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- Warranty Claims policies
CREATE POLICY "Users can view warranty claims in their shop" ON public.warranty_claims
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can create warranty claims in their shop" ON public.warranty_claims
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can update warranty claims in their shop" ON public.warranty_claims
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can delete warranty claims in their shop" ON public.warranty_claims
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- ===================
-- INDEXES
-- ===================

CREATE INDEX idx_fuel_cards_shop_id ON public.fuel_cards(shop_id);
CREATE INDEX idx_fuel_cards_status ON public.fuel_cards(status);
CREATE INDEX idx_fuel_stations_shop_id ON public.fuel_stations(shop_id);
CREATE INDEX idx_fuel_budgets_shop_id ON public.fuel_budgets(shop_id);
CREATE INDEX idx_fuel_budgets_equipment_id ON public.fuel_budgets(equipment_id);
CREATE INDEX idx_asset_warranties_shop_id ON public.asset_warranties(shop_id);
CREATE INDEX idx_asset_warranties_end_date ON public.asset_warranties(end_date);
CREATE INDEX idx_asset_warranties_equipment_id ON public.asset_warranties(equipment_id);
CREATE INDEX idx_asset_warranties_vehicle_id ON public.asset_warranties(vehicle_id);
CREATE INDEX idx_part_warranties_shop_id ON public.part_warranties(shop_id);
CREATE INDEX idx_part_warranties_expiry_date ON public.part_warranties(expiry_date);
CREATE INDEX idx_warranty_claims_shop_id ON public.warranty_claims(shop_id);
CREATE INDEX idx_warranty_claims_status ON public.warranty_claims(status);

-- ===================
-- TRIGGERS
-- ===================

CREATE TRIGGER update_fuel_cards_updated_at BEFORE UPDATE ON public.fuel_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fuel_stations_updated_at BEFORE UPDATE ON public.fuel_stations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fuel_budgets_updated_at BEFORE UPDATE ON public.fuel_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_asset_warranties_updated_at BEFORE UPDATE ON public.asset_warranties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_part_warranties_updated_at BEFORE UPDATE ON public.part_warranties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_warranty_claims_updated_at BEFORE UPDATE ON public.warranty_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
