-- Create asset_insurance table for comprehensive policy tracking
CREATE TABLE IF NOT EXISTS public.asset_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  equipment_id UUID REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  
  -- Policy Information
  policy_number TEXT NOT NULL,
  insurance_provider TEXT NOT NULL,
  insurance_type TEXT NOT NULL DEFAULT 'comprehensive',
  coverage_description TEXT,
  coverage_amount NUMERIC(12,2),
  deductible NUMERIC(10,2),
  
  -- Cost & Dates
  premium_amount NUMERIC(10,2) NOT NULL,
  payment_frequency TEXT DEFAULT 'annual',
  effective_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  renewal_reminder_days INTEGER DEFAULT 30,
  
  -- Status
  status TEXT DEFAULT 'active',
  auto_renew BOOLEAN DEFAULT false,
  
  -- Contact & Documents
  agent_name TEXT,
  agent_phone TEXT,
  agent_email TEXT,
  policy_document_url TEXT,
  
  -- Audit
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add registration fields to equipment_assets
ALTER TABLE public.equipment_assets 
ADD COLUMN IF NOT EXISTS plate_number TEXT,
ADD COLUMN IF NOT EXISTS registration_state TEXT,
ADD COLUMN IF NOT EXISTS registration_expiry DATE,
ADD COLUMN IF NOT EXISTS vin_number TEXT,
ADD COLUMN IF NOT EXISTS title_number TEXT,
ADD COLUMN IF NOT EXISTS title_status TEXT DEFAULT 'owned';

-- Add insurance budget columns to maintenance_budgets
ALTER TABLE public.maintenance_budgets 
ADD COLUMN IF NOT EXISTS insurance_budget NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_spent NUMERIC(12,2) DEFAULT 0;

-- Enable RLS on asset_insurance
ALTER TABLE public.asset_insurance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for asset_insurance
CREATE POLICY "Users can view insurance policies for their shop"
ON public.asset_insurance FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create insurance policies for their shop"
ON public.asset_insurance FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update insurance policies for their shop"
ON public.asset_insurance FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete insurance policies for their shop"
ON public.asset_insurance FOR DELETE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_insurance_shop_id ON public.asset_insurance(shop_id);
CREATE INDEX IF NOT EXISTS idx_asset_insurance_equipment_id ON public.asset_insurance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_asset_insurance_vehicle_id ON public.asset_insurance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_asset_insurance_expiration ON public.asset_insurance(expiration_date);
CREATE INDEX IF NOT EXISTS idx_asset_insurance_status ON public.asset_insurance(status);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_asset_insurance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_asset_insurance_updated_at ON public.asset_insurance;
CREATE TRIGGER update_asset_insurance_updated_at
BEFORE UPDATE ON public.asset_insurance
FOR EACH ROW
EXECUTE FUNCTION public.update_asset_insurance_updated_at();