-- Create storage bucket for equipment attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment_attachments', 'equipment_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for equipment attachments
CREATE POLICY "Anyone can view equipment attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'equipment_attachments');

CREATE POLICY "Authenticated users can upload equipment attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'equipment_attachments' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update equipment attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'equipment_attachments' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete equipment attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'equipment_attachments' 
  AND auth.role() = 'authenticated'
);