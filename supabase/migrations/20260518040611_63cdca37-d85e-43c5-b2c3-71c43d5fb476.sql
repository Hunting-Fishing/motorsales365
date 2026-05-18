
-- Lock down public storage buckets so users can only write to their own user_id/ prefix.
-- Public SELECT remains open for all public buckets (listings, avatars, business logos, QR codes
-- need to be readable by anyone to render). Admins retain full write access to qr-codes since
-- staff QR posters are stored under a flat path (e.g. <row_id>.png).

-- =====================
-- listing-photos
-- =====================
DROP POLICY IF EXISTS "listing-photos public read" ON storage.objects;
DROP POLICY IF EXISTS "listing-photos owner insert" ON storage.objects;
DROP POLICY IF EXISTS "listing-photos owner update" ON storage.objects;
DROP POLICY IF EXISTS "listing-photos owner delete" ON storage.objects;

CREATE POLICY "listing-photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-photos');

CREATE POLICY "listing-photos owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "listing-photos owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "listing-photos owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- listing-videos
-- =====================
DROP POLICY IF EXISTS "listing-videos public read" ON storage.objects;
DROP POLICY IF EXISTS "listing-videos owner insert" ON storage.objects;
DROP POLICY IF EXISTS "listing-videos owner update" ON storage.objects;
DROP POLICY IF EXISTS "listing-videos owner delete" ON storage.objects;

CREATE POLICY "listing-videos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-videos');

CREATE POLICY "listing-videos owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "listing-videos owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "listing-videos owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- avatars
-- =====================
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars owner insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars owner update" ON storage.objects;
DROP POLICY IF EXISTS "avatars owner delete" ON storage.objects;

CREATE POLICY "avatars public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- business-logos
-- =====================
DROP POLICY IF EXISTS "business-logos public read" ON storage.objects;
DROP POLICY IF EXISTS "business-logos owner insert" ON storage.objects;
DROP POLICY IF EXISTS "business-logos owner update" ON storage.objects;
DROP POLICY IF EXISTS "business-logos owner delete" ON storage.objects;

CREATE POLICY "business-logos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-logos');

CREATE POLICY "business-logos owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "business-logos owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "business-logos owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- qr-codes
-- Public read. Writes: admins (staff QR posters) OR owner-prefix uploads.
-- =====================
DROP POLICY IF EXISTS "qr-codes public read" ON storage.objects;
DROP POLICY IF EXISTS "qr-codes admin or owner insert" ON storage.objects;
DROP POLICY IF EXISTS "qr-codes admin or owner update" ON storage.objects;
DROP POLICY IF EXISTS "qr-codes admin or owner delete" ON storage.objects;

CREATE POLICY "qr-codes public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'qr-codes');

CREATE POLICY "qr-codes admin or owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'qr-codes'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "qr-codes admin or owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'qr-codes'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  )
  WITH CHECK (
    bucket_id = 'qr-codes'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "qr-codes admin or owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'qr-codes'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );
