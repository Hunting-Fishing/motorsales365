
CREATE POLICY "Anyone can read buyer guides"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'buyer-guides');

CREATE POLICY "Admins upload buyer guides"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'buyer-guides' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update buyer guides"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'buyer-guides' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete buyer guides"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'buyer-guides' AND public.has_role(auth.uid(), 'admin'));
