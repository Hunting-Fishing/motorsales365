
-- Fix search_path on functions
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Lock down EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
-- (RLS policies that call has_role still work because RLS executes as the table owner)

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Tighten storage SELECT: still public read of files (URLs work) but scope listing/SELECT
-- on storage.objects to either anon-via-public-URL fetches (which don't go through this policy)
-- or to the owner's folder.
DROP POLICY IF EXISTS "Public read listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read listing videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read logos" ON storage.objects;

-- Anyone (incl. anon) can read files from these public buckets via getPublicUrl,
-- but the SELECT-on-objects policy below only allows listing files within your own folder.
CREATE POLICY "Owners list listing photos" ON storage.objects FOR SELECT USING (
  bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Owners list listing videos" ON storage.objects FOR SELECT USING (
  bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Owners list avatars" ON storage.objects FOR SELECT USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Owners list business logos" ON storage.objects FOR SELECT USING (
  bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]
);
