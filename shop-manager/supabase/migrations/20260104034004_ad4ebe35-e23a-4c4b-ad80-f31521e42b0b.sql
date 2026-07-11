-- Create gunsmith-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gunsmith-documents',
  'gunsmith-documents',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- RLS policies for gunsmith-documents bucket
CREATE POLICY "Authenticated users can view gunsmith documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'gunsmith-documents');

CREATE POLICY "Authenticated users can upload gunsmith documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gunsmith-documents');

CREATE POLICY "Authenticated users can update their gunsmith documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gunsmith-documents');

CREATE POLICY "Authenticated users can delete gunsmith documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gunsmith-documents');