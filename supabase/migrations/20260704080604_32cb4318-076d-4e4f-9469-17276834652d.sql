
CREATE OR REPLACE FUNCTION public.is_sales_assigned_supplier(_rep uuid, _supplier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sales_rep_assignments
    WHERE rep_user_id = _rep
      AND active = true
      AND subject_type = 'supplier'
      AND subject_id = _supplier_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_sales_assigned_supplier(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_sales_assigned_supplier(uuid, uuid) TO authenticated;

-- parts_supplier_contacts
DROP POLICY IF EXISTS "Admins and sales can read supplier contacts" ON public.parts_supplier_contacts;
DROP POLICY IF EXISTS "Admins and sales can write supplier contacts" ON public.parts_supplier_contacts;

CREATE POLICY "Admins and assigned sales can read supplier contacts"
ON public.parts_supplier_contacts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND public.is_sales_assigned_supplier(auth.uid(), supplier_id))
);

CREATE POLICY "Admins and assigned sales can write supplier contacts"
ON public.parts_supplier_contacts FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND public.is_sales_assigned_supplier(auth.uid(), supplier_id))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND public.is_sales_assigned_supplier(auth.uid(), supplier_id))
);

-- parts_supplier_outreach
DROP POLICY IF EXISTS "Admins and sales can read outreach" ON public.parts_supplier_outreach;
DROP POLICY IF EXISTS "Admins and sales can write outreach" ON public.parts_supplier_outreach;

CREATE POLICY "Admins and scoped sales can read outreach"
ON public.parts_supplier_outreach FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
);

CREATE POLICY "Admins and scoped sales can write outreach"
ON public.parts_supplier_outreach FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
);

-- parts_supplier_tasks
DROP POLICY IF EXISTS "Admins and sales can read supplier tasks" ON public.parts_supplier_tasks;
DROP POLICY IF EXISTS "Admins and sales can write supplier tasks" ON public.parts_supplier_tasks;

CREATE POLICY "Admins and scoped sales can read supplier tasks"
ON public.parts_supplier_tasks FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
);

CREATE POLICY "Admins and scoped sales can write supplier tasks"
ON public.parts_supplier_tasks FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'sales'::app_role) AND (
    owner_user_id = auth.uid()
    OR public.is_sales_assigned_supplier(auth.uid(), supplier_id)
  ))
);
