
-- Add supplier onboarding fields for auto parts stores
ALTER TABLE public.parts_supplier_applications
  ADD COLUMN IF NOT EXISTS legal_business_name TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS province_state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
  ADD COLUMN IF NOT EXISTS warehouse_locations TEXT,
  ADD COLUMN IF NOT EXISTS ships_nationwide BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS catalog_feed_url TEXT,
  ADD COLUMN IF NOT EXISTS catalog_feed_format TEXT,
  ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS agreed_terms BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreed_terms_at TIMESTAMPTZ;
