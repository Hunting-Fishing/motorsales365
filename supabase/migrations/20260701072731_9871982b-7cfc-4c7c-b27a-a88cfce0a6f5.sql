
-- Applications
CREATE TABLE public.partner_program_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  region text,
  channel_type text NOT NULL,
  platforms text[] NOT NULL DEFAULT '{}',
  audience_band text,
  pitch text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes text,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  agreed_terms boolean NOT NULL DEFAULT false,
  agreed_terms_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.partner_program_applications TO authenticated;
GRANT INSERT ON public.partner_program_applications TO anon;
GRANT ALL ON public.partner_program_applications TO service_role;
ALTER TABLE public.partner_program_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_apps" ON public.partner_program_applications
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_insert_apps" ON public.partner_program_applications
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "self_read_apps" ON public.partner_program_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_apps" ON public.partner_program_applications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Partners
CREATE TABLE public.partner_program_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.partner_program_applications(id) ON DELETE SET NULL,
  referral_code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  agreed_terms_at timestamptz,
  agreed_terms_version text,
  payout_method text,
  payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_program_partners TO authenticated;
GRANT ALL ON public.partner_program_partners TO service_role;
ALTER TABLE public.partner_program_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self_or_admin_read_partners" ON public.partner_program_partners
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_write_partners" ON public.partner_program_partners
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Commission events
CREATE TABLE public.partner_program_commission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_program_partners(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('seller_sub','boost','verified_business','advertiser_purchase','shop_purchase','other')),
  amount_php numeric(12,2) NOT NULL DEFAULT 0,
  commission_php numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','clawed_back','paid')),
  source_ref text,
  event_at timestamptz NOT NULL DEFAULT now(),
  cleared_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_program_commission_events TO authenticated;
GRANT ALL ON public.partner_program_commission_events TO service_role;
ALTER TABLE public.partner_program_commission_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_or_admin_read_events" ON public.partner_program_commission_events
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    partner_id IN (SELECT id FROM public.partner_program_partners WHERE user_id = auth.uid())
  );
CREATE POLICY "admin_write_events" ON public.partner_program_commission_events
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER pp_apps_updated BEFORE UPDATE ON public.partner_program_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pp_partners_updated BEFORE UPDATE ON public.partner_program_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX pp_apps_status_idx ON public.partner_program_applications(status, created_at DESC);
CREATE INDEX pp_partners_user_idx ON public.partner_program_partners(user_id);
CREATE INDEX pp_events_partner_idx ON public.partner_program_commission_events(partner_id, event_at DESC);
