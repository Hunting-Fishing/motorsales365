-- Restrict role_permissions SELECT
DROP POLICY IF EXISTS "Authenticated can read role permissions" ON public.role_permissions;

CREATE POLICY "Admins read all role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read their own role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = role_permissions.role
  )
);

-- Scope sales INSERT/UPDATE on subscriptions to assigned users
DROP POLICY IF EXISTS "Sales insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Sales manage subscriptions" ON public.subscriptions;

CREATE POLICY "Sales insert assigned subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'sales'::app_role)
  AND public.is_sales_assigned_user(auth.uid(), user_id)
);

CREATE POLICY "Sales update assigned subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'sales'::app_role)
  AND public.is_sales_assigned_user(auth.uid(), user_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'sales'::app_role)
  AND public.is_sales_assigned_user(auth.uid(), user_id)
);