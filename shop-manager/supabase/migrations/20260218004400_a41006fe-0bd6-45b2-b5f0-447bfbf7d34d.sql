
-- =====================================================
-- Cleanup remaining permissive RLS policies (no extension move)
-- =====================================================

-- invoices: remove permissive ALL policy
DROP POLICY IF EXISTS "Allow all access to invoices" ON public.invoices;

-- quotes: remove permissive policies and enforce shop scoping via customers.shop_id
DROP POLICY IF EXISTS "Users can view quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can only view quotes in their shop" ON public.quotes;

DROP POLICY IF EXISTS "Shop users can view quotes" ON public.quotes;
DROP POLICY IF EXISTS "Shop users can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Shop users can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Shop users can delete quotes" ON public.quotes;

CREATE POLICY "Shop users can view quotes" ON public.quotes
FOR SELECT TO authenticated
USING (
  customer_id IN (
    SELECT c.id
    FROM public.customers c
    WHERE c.shop_id = public.get_current_user_shop_id()
  )
);

CREATE POLICY "Shop users can insert quotes" ON public.quotes
FOR INSERT TO authenticated
WITH CHECK (
  customer_id IN (
    SELECT c.id
    FROM public.customers c
    WHERE c.shop_id = public.get_current_user_shop_id()
  )
);

CREATE POLICY "Shop users can update quotes" ON public.quotes
FOR UPDATE TO authenticated
USING (
  customer_id IN (
    SELECT c.id
    FROM public.customers c
    WHERE c.shop_id = public.get_current_user_shop_id()
  )
)
WITH CHECK (
  customer_id IN (
    SELECT c.id
    FROM public.customers c
    WHERE c.shop_id = public.get_current_user_shop_id()
  )
);

CREATE POLICY "Shop users can delete quotes" ON public.quotes
FOR DELETE TO authenticated
USING (
  customer_id IN (
    SELECT c.id
    FROM public.customers c
    WHERE c.shop_id = public.get_current_user_shop_id()
  )
);

-- email_sequences: remove allow-all policies (keep shop-scoped ones)
DROP POLICY IF EXISTS "Allow all users to insert email_sequences" ON public.email_sequences;
DROP POLICY IF EXISTS "Allow all users to select email_sequences" ON public.email_sequences;
DROP POLICY IF EXISTS "Allow all users to update email_sequences" ON public.email_sequences;

-- notification_templates: remove allow-all read policy (keep shop-scoped ones)
DROP POLICY IF EXISTS "Allow read access to notification_templates" ON public.notification_templates;
