
-- Helper: is the user an active member of a verified, active club?
CREATE OR REPLACE FUNCTION public.user_has_verified_club(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_members cm
    JOIN public.clubs c ON c.id = cm.club_id
    WHERE cm.user_id = _user_id
      AND cm.status = 'active'
      AND c.status = 'active'
      AND c.verified = true
  );
$$;

-- Audit table for each applied club-member discount
CREATE TABLE public.club_member_discount_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  scope text NOT NULL, -- e.g. 'ad_order', 'boost', 'bundle', 'subscription', 'passport_premium', 'promotion'
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  line_item_id uuid REFERENCES public.payment_line_items(id) ON DELETE SET NULL,
  original_amount_php numeric NOT NULL,
  discount_amount_php numeric NOT NULL,
  discount_pct numeric NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.club_member_discount_grants TO authenticated;
GRANT ALL ON public.club_member_discount_grants TO service_role;

ALTER TABLE public.club_member_discount_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own club discount grants"
  ON public.club_member_discount_grants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_club_discount_grants_user ON public.club_member_discount_grants(user_id);
CREATE INDEX idx_club_discount_grants_payment ON public.club_member_discount_grants(payment_id);

-- Config rows in pricing_settings
INSERT INTO public.pricing_settings (key, value, label, description)
VALUES
  ('club_member_discount_pct', 5, 'Club member discount %',
   'Percent discount applied to internal 365 purchases (ads, boosts, bundles, plans, passport premium) for active members of verified clubs.'),
  ('club_member_discount_enabled', 1, 'Club member discount enabled',
   'Set to 1 to enable the club member discount, 0 to disable globally.')
ON CONFLICT (key) DO NOTHING;
