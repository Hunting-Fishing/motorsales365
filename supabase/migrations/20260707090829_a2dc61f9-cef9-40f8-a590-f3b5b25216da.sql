
-- 1. Attachment columns on staff_dms
ALTER TABLE public.staff_dms
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_size integer;

-- Allow body to be empty when there is an attachment
ALTER TABLE public.staff_dms
  ALTER COLUMN body DROP NOT NULL;

-- Ensure either text or attachment is present
ALTER TABLE public.staff_dms
  DROP CONSTRAINT IF EXISTS staff_dms_body_or_attachment_chk;
ALTER TABLE public.staff_dms
  ADD CONSTRAINT staff_dms_body_or_attachment_chk
  CHECK (
    (body IS NOT NULL AND length(btrim(body)) > 0)
    OR attachment_path IS NOT NULL
  );

-- 2. Storage RLS for the private staff-dm-attachments bucket.
-- Only @365motorsales.com staff, and only into their own {uid}/ folder.
DROP POLICY IF EXISTS "Staff can upload own DM attachments" ON storage.objects;
CREATE POLICY "Staff can upload own DM attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'staff-dm-attachments'
  AND (auth.jwt() ->> 'email') ILIKE '%@365motorsales.com'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Staff can read own DM attachments" ON storage.objects;
CREATE POLICY "Staff can read own DM attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff-dm-attachments'
  AND (auth.jwt() ->> 'email') ILIKE '%@365motorsales.com'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Staff can delete own DM attachments" ON storage.objects;
CREATE POLICY "Staff can delete own DM attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'staff-dm-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
