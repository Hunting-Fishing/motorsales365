CREATE POLICY "Owner reads own listing docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner uploads own listing docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner updates own listing docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner deletes own listing docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins read all listing docs storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'listing-documents' AND public.has_role(auth.uid(), 'admin'));