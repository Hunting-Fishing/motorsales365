
ALTER TABLE public.septic_equipment
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS manual_urls JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS warranty_expiry DATE,
  ADD COLUMN IF NOT EXISTS warranty_status TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS vin_number TEXT,
  ADD COLUMN IF NOT EXISTS plate_number TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES public.septic_employees(id),
  ADD COLUMN IF NOT EXISTS current_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS current_mileage NUMERIC;

INSERT INTO storage.buckets (id, name, public)
VALUES ('septic-equipment-photos', 'septic-equipment-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload equipment photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'septic-equipment-photos');

CREATE POLICY "Anyone can view equipment photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'septic-equipment-photos');

CREATE POLICY "Authenticated users can delete equipment photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'septic-equipment-photos');
