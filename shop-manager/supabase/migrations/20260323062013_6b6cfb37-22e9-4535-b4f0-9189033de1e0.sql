-- Add new columns to septic_customers
ALTER TABLE septic_customers
  ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'residential',
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS business_contact text,
  ADD COLUMN IF NOT EXISTS preferred_payment_method text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS tax_exempt boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS parcel_number text,
  ADD COLUMN IF NOT EXISTS well_distance_ft integer,
  ADD COLUMN IF NOT EXISTS water_source text,
  ADD COLUMN IF NOT EXISTS occupants integer,
  ADD COLUMN IF NOT EXISTS year_built integer;

-- septic_customer_notes
CREATE TABLE IF NOT EXISTS septic_customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES septic_customers(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  note_type text NOT NULL DEFAULT 'general',
  title text,
  content text NOT NULL,
  priority text DEFAULT 'low',
  status text DEFAULT 'open',
  created_by uuid REFERENCES profiles(id),
  assigned_to uuid REFERENCES profiles(id),
  estimated_cost numeric,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE septic_customer_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_customer_notes' AND policyname = 'septic_customer_notes_shop_isolation') THEN
    CREATE POLICY septic_customer_notes_shop_isolation ON septic_customer_notes FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- septic_environmental_records
CREATE TABLE IF NOT EXISTS septic_environmental_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES septic_customers(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  record_type text NOT NULL DEFAULT 'concern',
  severity text DEFAULT 'low',
  title text NOT NULL,
  description text,
  regulatory_body text,
  citation_number text,
  date_identified date,
  date_resolved date,
  remediation_plan text,
  remediation_cost numeric,
  status text DEFAULT 'open',
  photos text[],
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE septic_environmental_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_environmental_records' AND policyname = 'septic_environmental_records_shop_isolation') THEN
    CREATE POLICY septic_environmental_records_shop_isolation ON septic_environmental_records FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- septic_cost_recommendations
CREATE TABLE IF NOT EXISTS septic_cost_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES septic_customers(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL DEFAULT 'cost_saving',
  title text NOT NULL,
  description text,
  current_annual_cost numeric,
  projected_annual_cost numeric,
  estimated_savings numeric,
  implementation_cost numeric,
  payback_period_months integer,
  priority text DEFAULT 'medium',
  status text DEFAULT 'proposed',
  accepted_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE septic_cost_recommendations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_cost_recommendations' AND policyname = 'septic_cost_recommendations_shop_isolation') THEN
    CREATE POLICY septic_cost_recommendations_shop_isolation ON septic_cost_recommendations FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;