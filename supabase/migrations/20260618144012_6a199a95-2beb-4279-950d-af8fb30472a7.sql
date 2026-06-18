
CREATE POLICY "Auth read share-kit-templates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'share-kit-templates');

CREATE POLICY "Admins insert share-kit-templates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'share-kit-templates' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update share-kit-templates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'share-kit-templates' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete share-kit-templates"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'share-kit-templates' AND public.has_role(auth.uid(), 'admin'::app_role));
