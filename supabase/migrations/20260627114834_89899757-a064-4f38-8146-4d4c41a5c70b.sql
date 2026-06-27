
-- Public upload (applicants submit docs without account), admin-only read/delete
CREATE POLICY "Anyone can upload supplier docs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'supplier-docs');

CREATE POLICY "Admins can read supplier docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'supplier-docs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete supplier docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'supplier-docs' AND public.has_role(auth.uid(), 'admin'));
