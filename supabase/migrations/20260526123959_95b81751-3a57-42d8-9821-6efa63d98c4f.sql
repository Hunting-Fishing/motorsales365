
DROP POLICY IF EXISTS "Ad media public read" ON storage.objects;
DROP POLICY IF EXISTS "Ride media public read" ON storage.objects;

CREATE POLICY "Ad media public read by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-media' AND name IS NOT NULL);

CREATE POLICY "Ride media public read by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ride-media' AND name IS NOT NULL);
