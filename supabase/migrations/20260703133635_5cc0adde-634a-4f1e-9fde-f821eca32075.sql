
-- Storage RLS: club-docs (private)
CREATE POLICY "Club admins read own club docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-docs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id::text = split_part(name, '/', 1)
          AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
      )
    )
  );

CREATE POLICY "Club admins upload club docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-docs'
    AND EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id::text = split_part(name, '/', 1)
        AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
    )
  );

CREATE POLICY "Club admins delete club docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-docs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id::text = split_part(name, '/', 1)
          AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
      )
    )
  );

-- Storage RLS: business-media, path prefix clubs/{club_id}/...
CREATE POLICY "Club admins upload club media in business-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-media'
    AND split_part(name, '/', 1) = 'clubs'
    AND EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id::text = split_part(name, '/', 2)
        AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
    )
  );

CREATE POLICY "Club admins update club media in business-media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-media'
    AND split_part(name, '/', 1) = 'clubs'
    AND EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id::text = split_part(name, '/', 2)
        AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
    )
  );

CREATE POLICY "Club admins delete club media in business-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-media'
    AND split_part(name, '/', 1) = 'clubs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id::text = split_part(name, '/', 2)
          AND (c.owner_id = auth.uid() OR public.is_club_admin(auth.uid(), c.id))
      )
    )
  );
