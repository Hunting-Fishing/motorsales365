
-- referral_redemptions tracks discounts applied at checkout for referred users
CREATE TABLE IF NOT EXISTS public.referral_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  staff_referral_id uuid NOT NULL,
  promotion_id uuid NOT NULL,
  referral_code text NOT NULL,
  kind text NOT NULL,                                -- 'subscription' | 'listing' | 'upgrade' | 'boost' | 'other'
  applies_to text NOT NULL,                          -- snapshot of promo applies_to at time of redemption
  subscription_id uuid,
  payment_id uuid,
  listing_id uuid,
  base_amount_php numeric NOT NULL,
  discount_amount_php numeric NOT NULL DEFAULT 0,
  final_amount_php numeric NOT NULL,
  percent_off numeric,
  flat_amount_php numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_redemptions_user ON public.referral_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_staff ON public.referral_redemptions(staff_referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_promo ON public.referral_redemptions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_subscription ON public.referral_redemptions(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_payment ON public.referral_redemptions(payment_id) WHERE payment_id IS NOT NULL;

ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage referral_redemptions"
  ON public.referral_redemptions FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Sales read referral_redemptions"
  ON public.referral_redemptions FOR SELECT
  USING (has_role(auth.uid(),'sales'::app_role));

CREATE POLICY "Users read own redemptions"
  ON public.referral_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff read own redemptions"
  ON public.referral_redemptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = referral_redemptions.staff_referral_id
      AND (s.staff_user_id = auth.uid()
           OR lower(s.email) = lower(coalesce(auth.jwt() ->> 'email','')))
  ));

-- Pick best active promo for a given user + kind
CREATE OR REPLACE FUNCTION public.pick_referral_promo(_user_id uuid, _kind text, _base_amount numeric)
RETURNS TABLE(
  promotion_id uuid,
  staff_referral_id uuid,
  referral_code text,
  applies_to text,
  percent_off numeric,
  flat_amount_php numeric,
  discount_amount_php numeric,
  final_amount_php numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ur public.user_referrals%ROWTYPE;
BEGIN
  SELECT * INTO ur FROM public.user_referrals WHERE user_id = _user_id;
  IF NOT FOUND OR ur.referred_by_staff_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT p.*,
           LEAST(
             COALESCE(_base_amount * (p.percent_off/100.0), 0)
             + COALESCE(p.flat_amount_php, 0),
             _base_amount
           ) AS disc
    FROM public.staff_promotions p
    WHERE p.staff_referral_id = ur.referred_by_staff_id
      AND p.active = true
      AND (p.starts_at IS NULL OR p.starts_at <= now())
      AND (p.ends_at IS NULL OR p.ends_at >= now())
      AND (p.applies_to = 'any' OR p.applies_to = _kind)
  )
  SELECT c.id, ur.referred_by_staff_id, ur.credited_referral_code,
         c.applies_to, c.percent_off, c.flat_amount_php,
         ROUND(c.disc, 2) AS discount_amount_php,
         GREATEST(_base_amount - ROUND(c.disc, 2), 0) AS final_amount_php
  FROM candidates c
  ORDER BY c.disc DESC
  LIMIT 1;
END $$;

-- Record a redemption for the current user
CREATE OR REPLACE FUNCTION public.apply_referral_redemption(
  _kind text,
  _base_amount numeric,
  _subscription_id uuid DEFAULT NULL,
  _payment_id uuid DEFAULT NULL,
  _listing_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  pick record;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO pick FROM public.pick_referral_promo(uid, _kind, _base_amount);
  IF pick.promotion_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_promo', 'base_amount_php', _base_amount, 'final_amount_php', _base_amount);
  END IF;

  INSERT INTO public.referral_redemptions(
    user_id, staff_referral_id, promotion_id, referral_code, kind, applies_to,
    subscription_id, payment_id, listing_id,
    base_amount_php, discount_amount_php, final_amount_php,
    percent_off, flat_amount_php, metadata
  ) VALUES (
    uid, pick.staff_referral_id, pick.promotion_id, pick.referral_code, _kind, pick.applies_to,
    _subscription_id, _payment_id, _listing_id,
    _base_amount, pick.discount_amount_php, pick.final_amount_php,
    pick.percent_off, pick.flat_amount_php, COALESCE(_metadata,'{}'::jsonb)
  ) RETURNING id INTO new_id;

  RETURN jsonb_build_object(
    'ok', true,
    'redemption_id', new_id,
    'promotion_id', pick.promotion_id,
    'referral_code', pick.referral_code,
    'percent_off', pick.percent_off,
    'flat_amount_php', pick.flat_amount_php,
    'discount_amount_php', pick.discount_amount_php,
    'base_amount_php', _base_amount,
    'final_amount_php', pick.final_amount_php
  );
END $$;

-- Preview helper (read-only) usable by clients
CREATE OR REPLACE FUNCTION public.preview_referral_discount(_kind text, _base_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  pick record;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  SELECT * INTO pick FROM public.pick_referral_promo(uid, _kind, _base_amount);
  IF pick.promotion_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'final_amount_php', _base_amount, 'base_amount_php', _base_amount);
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'promotion_id', pick.promotion_id,
    'referral_code', pick.referral_code,
    'percent_off', pick.percent_off,
    'flat_amount_php', pick.flat_amount_php,
    'discount_amount_php', pick.discount_amount_php,
    'base_amount_php', _base_amount,
    'final_amount_php', pick.final_amount_php,
    'applies_to', pick.applies_to
  );
END $$;
