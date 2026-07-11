
-- Septic Regulatory Classifications: province/state-specific system type definitions
CREATE TABLE IF NOT EXISTS septic_regulatory_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  province_state text NOT NULL,
  country text NOT NULL DEFAULT 'CA',
  classification_code text NOT NULL,
  classification_name text NOT NULL,
  description text,
  treatment_level text,
  dispersal_method text,
  requires_disinfection boolean DEFAULT false,
  requires_additional_treatment boolean DEFAULT false,
  effluent_quality_standard text,
  regulatory_body text,
  regulatory_reference text,
  typical_components text[],
  maintenance_requirements text,
  inspection_frequency_months integer,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, province_state, classification_code)
);

ALTER TABLE septic_regulatory_classifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'septic_regulatory_classifications' AND policyname = 'septic_regulatory_classifications_shop_isolation') THEN
    CREATE POLICY septic_regulatory_classifications_shop_isolation ON septic_regulatory_classifications
      FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- Link system types to regulatory classifications
ALTER TABLE septic_system_types ADD COLUMN IF NOT EXISTS regulatory_classification_id uuid REFERENCES septic_regulatory_classifications(id);
ALTER TABLE septic_system_types ADD COLUMN IF NOT EXISTS province_state text;
