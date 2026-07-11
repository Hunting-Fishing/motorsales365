-- Create storage bucket for inspection photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for inspection photos
CREATE POLICY "Authenticated users can upload inspection photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inspection-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view inspection photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'inspection-photos');

CREATE POLICY "Users can delete their own inspection photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'inspection-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add photo_urls column to vessel_inspection_items if not exists
ALTER TABLE vessel_inspection_items 
ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';

-- Add photo_urls column to forklift_inspections for item-level photos stored as JSON
ALTER TABLE forklift_inspections
ADD COLUMN IF NOT EXISTS item_photos jsonb DEFAULT '{}';

-- Create inspection_service_alerts table for service interval tracking
CREATE TABLE IF NOT EXISTS inspection_service_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid REFERENCES equipment_assets(id) ON DELETE CASCADE,
  alert_type text NOT NULL, -- 'hours_due', 'date_due', 'overdue'
  service_item text NOT NULL,
  due_hours numeric,
  due_date timestamptz,
  current_hours numeric,
  priority text DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  is_acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE inspection_service_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for service alerts
CREATE POLICY "Authenticated users can view service alerts"
ON inspection_service_alerts FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create service alerts"
ON inspection_service_alerts FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update service alerts"
ON inspection_service_alerts FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete service alerts"
ON inspection_service_alerts FOR DELETE
USING (auth.role() = 'authenticated');