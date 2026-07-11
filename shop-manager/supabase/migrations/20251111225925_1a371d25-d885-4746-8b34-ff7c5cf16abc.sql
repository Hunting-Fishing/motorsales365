-- Create storage bucket for maintenance request attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-attachments', 'maintenance-attachments', false);

-- RLS policies for maintenance attachments bucket
CREATE POLICY "Users can upload their own maintenance attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'maintenance-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view maintenance attachments in their shop"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'maintenance-attachments' AND
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p1.shop_id = p2.shop_id
    WHERE p1.id = auth.uid()
    AND p2.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can delete their own maintenance attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'maintenance-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add attachments column to maintenance_requests if it doesn't exist
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;