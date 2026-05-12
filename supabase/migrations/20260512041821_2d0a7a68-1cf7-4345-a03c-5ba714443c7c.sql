-- Storage RLS for qr-codes bucket: admin-only writes, public reads (bucket is already public).
CREATE POLICY "qr-codes admin insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'qr-codes' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "qr-codes admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'qr-codes' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'qr-codes' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "qr-codes admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'qr-codes' AND public.has_role(auth.uid(), 'admin'::public.app_role));