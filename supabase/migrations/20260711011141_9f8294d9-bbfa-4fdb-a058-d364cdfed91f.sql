
-- 1. Remove overbroad sales UPDATE on profiles and replace with a status-only RPC.
DROP POLICY IF EXISTS "Sales update account status" ON public.profiles;

CREATE OR REPLACE FUNCTION public.sales_update_account_status(
  _profile_id uuid,
  _new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'sales'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF NOT public.is_sales_assigned_user(auth.uid(), _profile_id) THEN
    RAISE EXCEPTION 'Not assigned to this customer';
  END IF;

  IF _new_status IS NULL OR length(_new_status) = 0 OR length(_new_status) > 64 THEN
    RAISE EXCEPTION 'Invalid account status';
  END IF;

  UPDATE public.profiles
     SET account_status = _new_status
   WHERE id = _profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sales_update_account_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sales_update_account_status(uuid, text) TO authenticated;

-- 2. Let DM recipients read attachments sent to them.
CREATE POLICY "Staff DM recipients can read attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff-dm-attachments'
  AND EXISTS (
    SELECT 1
      FROM public.staff_dms d
     WHERE d.attachment_path = storage.objects.name
       AND (d.sender_id = auth.uid() OR d.recipient_id = auth.uid())
  )
);
