CREATE OR REPLACE FUNCTION public.can_support(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin','moderator','support')
  )
$function$;

DROP POLICY IF EXISTS "Sales view audit log" ON public.account_audit_log;
CREATE POLICY "Sales view assigned audit log"
ON public.account_audit_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND target_user_id IS NOT NULL
  AND public.is_sales_assigned_user(auth.uid(), target_user_id)
);

DROP POLICY IF EXISTS "Sales view line items" ON public.payment_line_items;
CREATE POLICY "Sales view assigned line items"
ON public.payment_line_items
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.id = payment_line_items.payment_id
      AND p.user_id IS NOT NULL
      AND public.is_sales_assigned_user(auth.uid(), p.user_id)
  )
);