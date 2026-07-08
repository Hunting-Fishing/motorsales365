
-- Remove email-domain shortcut from staff academy viewer helper.
CREATE OR REPLACE FUNCTION public.is_staff_academy_viewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'moderator')
    OR public.has_role(_user_id, 'support')
    OR public.has_role(_user_id, 'sales');
$$;

-- Rebuild staff-dm-attachments storage policies to use verified staff roles
-- instead of the spoofable JWT email claim.
DROP POLICY IF EXISTS "Staff can upload own DM attachments" ON storage.objects;
CREATE POLICY "Staff can upload own DM attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'staff-dm-attachments'
  AND public.is_staff_academy_viewer(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Staff can read own DM attachments" ON storage.objects;
CREATE POLICY "Staff can read own DM attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff-dm-attachments'
  AND public.is_staff_academy_viewer(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);
