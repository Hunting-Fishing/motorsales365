-- 1. Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_junior';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_senior';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_manager';

-- Commit enum changes before they can be referenced
COMMIT;
BEGIN;

-- 2. Sales tier helper: manager > senior > junior. Legacy 'sales' role = senior.
CREATE OR REPLACE FUNCTION public.has_sales_tier(_user_id uuid, _min_tier text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH r AS (
    SELECT role::text AS role FROM public.user_roles WHERE user_id = _user_id
  ),
  level AS (
    SELECT GREATEST(
      CASE WHEN EXISTS (SELECT 1 FROM r WHERE role = 'admin') THEN 3 ELSE 0 END,
      CASE WHEN EXISTS (SELECT 1 FROM r WHERE role = 'sales_manager') THEN 3 ELSE 0 END,
      CASE WHEN EXISTS (SELECT 1 FROM r WHERE role IN ('sales_senior','sales')) THEN 2 ELSE 0 END,
      CASE WHEN EXISTS (SELECT 1 FROM r WHERE role = 'sales_junior') THEN 1 ELSE 0 END
    ) AS lvl
  )
  SELECT (SELECT lvl FROM level) >= CASE _min_tier
    WHEN 'junior' THEN 1
    WHEN 'senior' THEN 2
    WHEN 'manager' THEN 3
    ELSE 99
  END;
$$;

-- 3. customer_discounts table
CREATE TABLE IF NOT EXISTS public.customer_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_business_id uuid,
  kind text NOT NULL CHECK (kind IN ('percent','flat')),
  percent_off numeric,
  flat_amount_php numeric,
  applies_to text NOT NULL DEFAULT 'any',
  reason text,
  expires_at timestamptz,
  issued_by uuid NOT NULL REFERENCES auth.users(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (target_user_id IS NOT NULL OR target_business_id IS NOT NULL),
  CHECK (
    (kind = 'percent' AND percent_off IS NOT NULL AND percent_off > 0 AND percent_off <= 100) OR
    (kind = 'flat' AND flat_amount_php IS NOT NULL AND flat_amount_php > 0)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_discounts TO authenticated;
GRANT ALL ON public.customer_discounts TO service_role;

ALTER TABLE public.customer_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and admins manage customer discounts"
  ON public.customer_discounts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_sales_tier(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_sales_tier(auth.uid(), 'manager'));

CREATE POLICY "Users can view their own discounts"
  ON public.customer_discounts FOR SELECT
  TO authenticated
  USING (target_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_customer_discounts_updated_at ON public.customer_discounts;
CREATE TRIGGER trg_customer_discounts_updated_at
  BEFORE UPDATE ON public.customer_discounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Grant Joan sales_manager role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'sales_manager'::public.app_role
FROM auth.users
WHERE lower(email) = 'jordilwbailey@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
