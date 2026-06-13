
INSERT INTO public.subscription_plans (name, price_php, stripe_lookup_key, features, sort_order, max_photos_per_listing)
SELECT 'Shop Manager Solo', 799.00, 'shop_manager_solo_monthly',
  '["1 technician","Unlimited work orders","Customer + vehicle history","Invoicing","Mobile-friendly"]'::jsonb, 100, 5
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE stripe_lookup_key = 'shop_manager_solo_monthly');

INSERT INTO public.subscription_plans (name, price_php, stripe_lookup_key, features, sort_order, max_photos_per_listing)
SELECT 'Shop Manager Pro', 1999.00, 'shop_manager_pro_monthly',
  '["Up to 10 technicians","Inventory + parts tracking","Repair plans + quotes","Photo VINs / inspections","Email + SMS reminders","Priority support"]'::jsonb, 101, 5
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE stripe_lookup_key = 'shop_manager_pro_monthly');

CREATE TABLE IF NOT EXISTS public.shop_manager_provisioning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  external_account_id text,
  external_user_email text,
  tier text,
  sso_provisioned_at timestamptz,
  last_sso_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_manager_provisioning TO authenticated;
GRANT ALL    ON public.shop_manager_provisioning TO service_role;

ALTER TABLE public.shop_manager_provisioning ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_manager_provisioning own row read" ON public.shop_manager_provisioning;
CREATE POLICY "shop_manager_provisioning own row read"
  ON public.shop_manager_provisioning FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_shop_manager_provisioning_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS shop_manager_provisioning_touch ON public.shop_manager_provisioning;
CREATE TRIGGER shop_manager_provisioning_touch
  BEFORE UPDATE ON public.shop_manager_provisioning
  FOR EACH ROW EXECUTE FUNCTION public.tg_shop_manager_provisioning_touch();
