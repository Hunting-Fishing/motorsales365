-- Make maintenance-attachments bucket public so files can be viewed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'maintenance-attachments';

-- Allow anyone to view maintenance attachments (for business review purposes)
CREATE POLICY "Anyone can view maintenance attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'maintenance-attachments');

-- Allow authenticated users to upload maintenance attachments
CREATE POLICY "Authenticated users can upload maintenance attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-attachments');

-- Allow authenticated users to delete their own maintenance attachments
CREATE POLICY "Authenticated users can delete their own maintenance attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);