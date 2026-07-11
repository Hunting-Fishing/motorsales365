-- Create storage bucket for equipment manuals
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'equipment-manuals',
  'equipment-manuals',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create equipment_manuals table
CREATE TABLE IF NOT EXISTS equipment_manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  manufacturer TEXT,
  model TEXT,
  manual_type TEXT, -- e.g., 'service', 'parts', 'operator', 'installation', 'maintenance'
  document_number TEXT, -- Official document/part number from manufacturer
  version TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create equipment_manual_links junction table (many-to-many)
CREATE TABLE IF NOT EXISTS equipment_manual_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id TEXT NOT NULL, -- Matches equipment_assets.id which is TEXT
  manual_id UUID NOT NULL REFERENCES equipment_manuals(id) ON DELETE CASCADE,
  linked_by UUID REFERENCES auth.users(id),
  notes TEXT, -- Specific notes about why this manual applies to this equipment
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(equipment_id, manual_id)
);

-- Enable RLS on equipment_manuals
ALTER TABLE equipment_manuals ENABLE ROW LEVEL SECURITY;

-- RLS policies for equipment_manuals
CREATE POLICY "Users can view manuals"
  ON equipment_manuals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create manuals"
  ON equipment_manuals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update manuals"
  ON equipment_manuals FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete manuals"
  ON equipment_manuals FOR DELETE
  TO authenticated
  USING (true);

-- Enable RLS on equipment_manual_links
ALTER TABLE equipment_manual_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for equipment_manual_links
CREATE POLICY "Users can view manual links"
  ON equipment_manual_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create manual links"
  ON equipment_manual_links FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update manual links"
  ON equipment_manual_links FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete manual links"
  ON equipment_manual_links FOR DELETE
  TO authenticated
  USING (true);

-- Storage policies for equipment-manuals bucket
CREATE POLICY "Users can view manual files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'equipment-manuals');

CREATE POLICY "Users can upload manual files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'equipment-manuals');

CREATE POLICY "Users can update manual files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'equipment-manuals');

CREATE POLICY "Users can delete manual files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'equipment-manuals');

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_manuals_manufacturer ON equipment_manuals(manufacturer);
CREATE INDEX IF NOT EXISTS idx_equipment_manuals_model ON equipment_manuals(model);
CREATE INDEX IF NOT EXISTS idx_equipment_manuals_type ON equipment_manuals(manual_type);
CREATE INDEX IF NOT EXISTS idx_equipment_manuals_tags ON equipment_manuals USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_manual_links_equipment ON equipment_manual_links(equipment_id);
CREATE INDEX IF NOT EXISTS idx_manual_links_manual ON equipment_manual_links(manual_id);

-- Create trigger for updated_at on equipment_manuals
CREATE OR REPLACE FUNCTION update_equipment_manuals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_manuals_updated_at
  BEFORE UPDATE ON equipment_manuals
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_manuals_updated_at();