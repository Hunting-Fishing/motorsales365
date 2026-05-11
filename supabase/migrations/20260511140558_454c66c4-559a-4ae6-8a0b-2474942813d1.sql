-- 1. profiles columns
DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('active','paused','banned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status public.account_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_founding_member boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_member_number int UNIQUE;

-- 2. subscription_plans columns
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_photos_per_listing int NOT NULL DEFAULT 5;

-- 3. subscriptions columns
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS complimentary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

-- 4. Rename existing plans + set photo limits
UPDATE public.subscription_plans SET max_photos_per_listing = 3,
  features = '["3 photos per listing","1 listing per week","Community support"]'::jsonb
  WHERE name = 'Free';
UPDATE public.subscription_plans SET name = 'Bronze', max_photos_per_listing = 5,
  features = '["5 listings/month","Up to 5 photos","Email support"]'::jsonb
  WHERE name = 'Starter';
UPDATE public.subscription_plans SET name = 'Silver', max_photos_per_listing = 8,
  features = '["10 listings/month","Up to 8 photos","1 free upgrade/month","Priority support"]'::jsonb
  WHERE name = 'Growth';
UPDATE public.subscription_plans SET name = 'Gold', max_photos_per_listing = 12,
  features = '["20 listings/month","Up to 12 photos","3 free upgrades/month","Business badge"]'::jsonb
  WHERE name = 'Pro';
UPDATE public.subscription_plans SET name = 'Platinum', max_photos_per_listing = 20,
  features = '["Unlimited listings","Up to 20 photos","Unlimited upgrades","1 free boost/month","Premium business badge"]'::jsonb
  WHERE name = 'Unlimited';

INSERT INTO public.subscription_plans (name, price_php, listings_per_month, max_photos_per_listing, features, sort_order, active)
SELECT 'Business', 1200, NULL, 20,
  '["Everything in Platinum","Multi-user access (coming soon)","Top-tier business badge","Dedicated account manager"]'::jsonb,
  5, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE name = 'Business');

-- 5. Founding member trigger
CREATE OR REPLACE FUNCTION public.assign_founding_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count int;
  bronze_id uuid;
BEGIN
  SELECT count(*) INTO current_count FROM public.profiles WHERE is_founding_member = true;
  IF current_count < 1000 THEN
    NEW.is_founding_member := true;
    NEW.founding_member_number := current_count + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_assign_founding_member ON public.profiles;
CREATE TRIGGER tg_assign_founding_member
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_founding_member();

CREATE OR REPLACE FUNCTION public.grant_founding_bronze()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE bronze_id uuid;
BEGIN
  IF NEW.is_founding_member = true THEN
    SELECT id INTO bronze_id FROM public.subscription_plans WHERE name = 'Bronze' LIMIT 1;
    IF bronze_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (user_id, plan_id, status, complimentary, current_period_end)
      VALUES (NEW.id, bronze_id, 'active', true, NULL)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_grant_founding_bronze ON public.profiles;
CREATE TRIGGER tg_grant_founding_bronze
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_founding_bronze();

-- 6. Backfill existing users as founding members (up to 1000)
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn FROM public.profiles
)
UPDATE public.profiles p
SET is_founding_member = true, founding_member_number = r.rn
FROM ranked r
WHERE p.id = r.id AND r.rn <= 1000 AND p.is_founding_member = false;

-- 7. Sales role helper (uses existing has_role)
-- Update listings public-read RLS to hide paused accounts
DROP POLICY IF EXISTS "Active listings public read" ON public.listings;
CREATE POLICY "Active listings public read" ON public.listings
FOR SELECT USING (
  (
    (status = ANY (ARRAY['active'::listing_status, 'pending_sale'::listing_status]))
    AND EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = listings.user_id AND pr.account_status = 'active')
  )
  OR auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 8. Sales role policies
CREATE POLICY "Sales view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales update account status" ON public.profiles
FOR UPDATE USING (has_role(auth.uid(), 'sales'::app_role))
WITH CHECK (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales view subscriptions" ON public.subscriptions
FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales manage subscriptions" ON public.subscriptions
FOR UPDATE USING (has_role(auth.uid(), 'sales'::app_role))
WITH CHECK (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales insert subscriptions" ON public.subscriptions
FOR INSERT WITH CHECK (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales view payments" ON public.payments
FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales view listings" ON public.listings
FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales view user_roles" ON public.user_roles
FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales view subscription_plans" ON public.subscription_plans
FOR SELECT USING (has_role(auth.uid(), 'sales'::app_role));