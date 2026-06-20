
-- Allow advertising staff and admins to upload, update, and delete files anywhere in the advertisements bucket
-- (existing policy only lets advertisers manage files under their own {user_id}/ folder)
CREATE POLICY "Ad staff manage all advertisements files INSERT"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'advertisements'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advertising'::app_role))
);

CREATE POLICY "Ad staff manage all advertisements files UPDATE"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'advertisements'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advertising'::app_role))
);

CREATE POLICY "Ad staff manage all advertisements files DELETE"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'advertisements'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advertising'::app_role))
);

CREATE POLICY "Ad staff read all advertisements files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'advertisements'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advertising'::app_role))
);
