
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-media', 'vehicle-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Vehicle media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-media');

CREATE POLICY "Vehicle media owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Vehicle media owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'vehicle-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Vehicle media owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'vehicle-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
