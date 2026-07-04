
CREATE TABLE public.club_discount_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  headline text NOT NULL,
  description text NOT NULL,
  percent numeric(5,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  audiences text[] NOT NULL DEFAULT '{}',
  applies_to text[] NOT NULL DEFAULT '{}',
  excludes text[] NOT NULL DEFAULT '{}',
  stacking_rules text NOT NULL DEFAULT '',
  eligibility_notes text NOT NULL DEFAULT '',
  how_it_applies text NOT NULL DEFAULT '',
  footer_note text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.club_discount_promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_discount_promotions TO authenticated;
GRANT ALL ON public.club_discount_promotions TO service_role;

ALTER TABLE public.club_discount_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active promotions"
  ON public.club_discount_promotions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can read all promotions"
  ON public.club_discount_promotions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert promotions"
  ON public.club_discount_promotions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update promotions"
  ON public.club_discount_promotions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete promotions"
  ON public.club_discount_promotions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_club_discount_promotions_updated_at
  BEFORE UPDATE ON public.club_discount_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.club_discount_promotions
  (name, headline, description, percent, is_active, audiences, applies_to, excludes,
   stacking_rules, eligibility_notes, how_it_applies, footer_note, sort_order)
VALUES (
  'Club Member 5%',
  '5% Club Member Discount',
  'Active members of a verified club on 365 MotorSales automatically get 5% off internal 365 purchases at checkout — no coupon code needed. Eligibility is re-checked on every purchase and recorded on your receipt.',
  5,
  true,
  ARRAY['Verified club members'],
  ARRAY['Ads & ad orders','Listing boosts','Listing bundles','Subscription plans','Passport Premium'],
  ARRAY['Third-party partner parts','Insurance quotes','Tow provider fees','External shops & marketplaces','Items sold between members'],
  'Doesn''t stack with other percentage discounts or promo coupons on the same purchase — the larger discount wins.',
  'Signed-in members of a verified club with active membership. If you leave the club or the club loses verified status, the discount stops on future purchases.',
  'Automatically at checkout on eligible purchases. You''ll see a "Club member 5% off applied" note and the eligibility reason is stored on your receipt.',
  'More perks (insurance rates, parts discounts, event access) are on the roadmap. The 5% Club Member Discount is the only live perk today.',
  0
);
