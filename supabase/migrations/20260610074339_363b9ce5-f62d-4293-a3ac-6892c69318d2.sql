
-- Owners manage their own folder under tow-request-photos
CREATE POLICY "Tow photos: owners can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tow-request-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Tow photos: owners can update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'tow-request-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Tow photos: owners can delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tow-request-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Read access: owner, matched providers, assigned provider, admins.
-- Photo URL is stored on tow_requests row; participants of that row can read.
CREATE POLICY "Tow photos: participants can read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tow-request-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.tow_requests tr
      WHERE (
        tr.vehicle_photo_url LIKE '%/' || name
        OR name = ANY (
          SELECT regexp_replace(u, '^.*/tow-request-photos/', '')
          FROM unnest(tr.damage_photo_urls) u
        )
      )
      AND (
        auth.uid() = tr.requester_id
        OR auth.uid() = tr.provider_id
        OR auth.uid() = ANY (tr.matched_provider_ids)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  )
);
