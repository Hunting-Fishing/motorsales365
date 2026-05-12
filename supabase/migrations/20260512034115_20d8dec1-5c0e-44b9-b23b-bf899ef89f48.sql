
-- ENUM
DO $$ BEGIN
  CREATE TYPE public.referral_kind AS ENUM ('promo','deal','rate','incentive','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- staff_referrals
CREATE TABLE public.staff_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  referral_code text NOT NULL UNIQUE,
  qr_storage_path text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_referrals_code ON public.staff_referrals(referral_code);
CREATE INDEX idx_staff_referrals_user ON public.staff_referrals(staff_user_id);

ALTER TABLE public.staff_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage staff_referrals" ON public.staff_referrals
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Sales read staff_referrals" ON public.staff_referrals
  FOR SELECT USING (has_role(auth.uid(),'sales'::app_role));
CREATE POLICY "Staff read own referral row" ON public.staff_referrals
  FOR SELECT USING (
    auth.uid() = staff_user_id
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email',''))
  );

-- referral_visits
CREATE TABLE public.referral_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL,
  first_referral_code text,
  last_referral_code text,
  credited_referral_code text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  landing_page text,
  user_agent text,
  ip_hash text,
  UNIQUE(visitor_id)
);
CREATE INDEX idx_referral_visits_credit ON public.referral_visits(credited_referral_code);

ALTER TABLE public.referral_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage referral_visits" ON public.referral_visits
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Sales read referral_visits" ON public.referral_visits
  FOR SELECT USING (has_role(auth.uid(),'sales'::app_role));

-- qr_scans (append-only)
CREATE TABLE public.qr_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  visitor_id uuid,
  device_type text,
  browser text,
  country text,
  scanned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_qr_scans_code ON public.qr_scans(referral_code);
CREATE INDEX idx_qr_scans_visitor ON public.qr_scans(visitor_id);

ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage qr_scans" ON public.qr_scans
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Sales read qr_scans" ON public.qr_scans
  FOR SELECT USING (has_role(auth.uid(),'sales'::app_role));
CREATE POLICY "Staff read own qr_scans" ON public.qr_scans
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.referral_code = qr_scans.referral_code
      AND (s.staff_user_id = auth.uid()
           OR lower(s.email) = lower(COALESCE(auth.jwt()->>'email','')))
  ));

-- user_referrals
CREATE TABLE public.user_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_by_staff_id uuid REFERENCES public.staff_referrals(id) ON DELETE SET NULL,
  first_referral_code text,
  last_referral_code text,
  credited_referral_code text,
  signup_date timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_referrals_staff ON public.user_referrals(referred_by_staff_id);
CREATE INDEX idx_user_referrals_credit ON public.user_referrals(credited_referral_code);

ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage user_referrals" ON public.user_referrals
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Sales read user_referrals" ON public.user_referrals
  FOR SELECT USING (has_role(auth.uid(),'sales'::app_role));
CREATE POLICY "User reads own referral row" ON public.user_referrals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff read own credited signups" ON public.user_referrals
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = user_referrals.referred_by_staff_id
      AND (s.staff_user_id = auth.uid()
           OR lower(s.email) = lower(COALESCE(auth.jwt()->>'email','')))
  ));

-- staff_promotions
CREATE TABLE public.staff_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_referral_id uuid NOT NULL REFERENCES public.staff_referrals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  kind public.referral_kind NOT NULL DEFAULT 'promo',
  percent_off numeric,
  flat_amount_php numeric,
  applies_to text NOT NULL DEFAULT 'any',
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  terms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_promotions_staff ON public.staff_promotions(staff_referral_id);

ALTER TABLE public.staff_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage staff_promotions" ON public.staff_promotions
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Sales read staff_promotions" ON public.staff_promotions
  FOR SELECT USING (has_role(auth.uid(),'sales'::app_role));
CREATE POLICY "Staff read own promotions" ON public.staff_promotions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.staff_referrals s
    WHERE s.id = staff_promotions.staff_referral_id
      AND (s.staff_user_id = auth.uid()
           OR lower(s.email) = lower(COALESCE(auth.jwt()->>'email','')))
  ));
CREATE POLICY "Public read active promotions" ON public.staff_promotions
  FOR SELECT USING (
    active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

-- updated_at triggers
CREATE TRIGGER trg_staff_referrals_updated BEFORE UPDATE ON public.staff_referrals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_staff_promotions_updated BEFORE UPDATE ON public.staff_promotions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- record_qr_scan RPC (public, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.record_qr_scan(
  _code text,
  _visitor_id uuid,
  _user_agent text DEFAULT NULL,
  _landing text DEFAULT NULL,
  _device text DEFAULT NULL,
  _browser text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.staff_referrals%ROWTYPE;
  v public.referral_visits%ROWTYPE;
  is_active boolean;
BEGIN
  SELECT * INTO s FROM public.staff_referrals WHERE referral_code = _code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;
  is_active := s.active;

  -- Log scan regardless (for diagnostics)
  INSERT INTO public.qr_scans(referral_code, visitor_id, device_type, browser)
    VALUES (_code, _visitor_id, _device, _browser);

  -- Upsert visitor
  SELECT * INTO v FROM public.referral_visits WHERE visitor_id = _visitor_id;
  IF NOT FOUND THEN
    INSERT INTO public.referral_visits(visitor_id, first_referral_code, last_referral_code, credited_referral_code, landing_page, user_agent)
      VALUES (_visitor_id, _code, _code, CASE WHEN is_active THEN _code ELSE NULL END, _landing, _user_agent);
  ELSE
    UPDATE public.referral_visits
      SET last_referral_code = _code,
          last_seen_at = now(),
          credited_referral_code = COALESCE(credited_referral_code, CASE WHEN is_active THEN _code ELSE NULL END),
          first_referral_code = COALESCE(first_referral_code, _code)
      WHERE visitor_id = _visitor_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'active', is_active,
    'staff_name', s.full_name,
    'first_name', split_part(s.full_name, ' ', 1),
    'code', _code
  );
END $$;

REVOKE ALL ON FUNCTION public.record_qr_scan(text,uuid,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_qr_scan(text,uuid,text,text,text,text) TO anon, authenticated;

-- Trigger: attach referral to new profile from raw_user_meta_data.referral_code
CREATE OR REPLACE FUNCTION public.attach_signup_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  code text;
  s public.staff_referrals%ROWTYPE;
BEGIN
  SELECT raw_user_meta_data INTO meta FROM auth.users WHERE id = NEW.id;
  code := NULLIF(meta->>'referral_code','');
  IF code IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO s FROM public.staff_referrals WHERE referral_code = code AND active = true;
  IF NOT FOUND THEN RETURN NEW; END IF;

  INSERT INTO public.user_referrals(user_id, referred_by_staff_id, first_referral_code, last_referral_code, credited_referral_code)
    VALUES (NEW.id, s.id, code, code, code)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_attach_signup_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.attach_signup_referral();

-- Storage bucket for QR PNGs
INSERT INTO storage.buckets (id, name, public)
  VALUES ('qr-codes','qr-codes', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "QR codes public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'qr-codes');
CREATE POLICY "Admins upload QR codes" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'qr-codes' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update QR codes" ON storage.objects
  FOR UPDATE USING (bucket_id = 'qr-codes' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins delete QR codes" ON storage.objects
  FOR DELETE USING (bucket_id = 'qr-codes' AND has_role(auth.uid(),'admin'::app_role));
