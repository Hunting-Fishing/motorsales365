
-- ========== sales_rep_profiles ==========
CREATE TABLE public.sales_rep_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  accepting_new_clients boolean NOT NULL DEFAULT true,
  title text,
  bio text,
  public_email text,
  public_phone text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_rep_profiles TO authenticated;
GRANT ALL ON public.sales_rep_profiles TO service_role;
ALTER TABLE public.sales_rep_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rep can view own profile" ON public.sales_rep_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Rep can upsert own profile" ON public.sales_rep_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Rep can update own profile" ON public.sales_rep_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all rep profiles" ON public.sales_rep_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_sales_rep_profiles_updated BEFORE UPDATE ON public.sales_rep_profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== sales_rep_territories ==========
CREATE TABLE public.sales_rep_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region text NOT NULL,
  province text,
  city text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_rep_territories_rep ON public.sales_rep_territories(rep_user_id);
CREATE INDEX idx_sales_rep_territories_geo ON public.sales_rep_territories(region, province, city);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_rep_territories TO authenticated;
GRANT ALL ON public.sales_rep_territories TO service_role;
ALTER TABLE public.sales_rep_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rep manages own territories" ON public.sales_rep_territories FOR ALL TO authenticated USING (auth.uid() = rep_user_id) WITH CHECK (auth.uid() = rep_user_id);
CREATE POLICY "Admins manage all territories" ON public.sales_rep_territories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- ========== enums ==========
CREATE TYPE public.sales_rep_subject AS ENUM ('user','business');
CREATE TYPE public.sales_rep_source AS ENUM ('referral','manual','territory','customer_choice');

-- ========== sales_rep_assignments ==========
CREATE TABLE public.sales_rep_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_type public.sales_rep_subject NOT NULL,
  subject_id uuid NOT NULL,
  source public.sales_rep_source NOT NULL DEFAULT 'manual',
  active boolean NOT NULL DEFAULT true,
  notes text,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uniq_active_assignment ON public.sales_rep_assignments(subject_type, subject_id) WHERE active;
CREATE INDEX idx_sales_rep_assignments_rep ON public.sales_rep_assignments(rep_user_id) WHERE active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_rep_assignments TO authenticated;
GRANT ALL ON public.sales_rep_assignments TO service_role;
ALTER TABLE public.sales_rep_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rep views own assignments" ON public.sales_rep_assignments FOR SELECT TO authenticated USING (auth.uid() = rep_user_id);
CREATE POLICY "Admins manage all assignments" ON public.sales_rep_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_sales_rep_assignments_updated BEFORE UPDATE ON public.sales_rep_assignments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== sales_rep_followups ==========
CREATE TYPE public.followup_kind AS ENUM ('note','call','email','sms','meeting','request');
CREATE TYPE public.followup_status AS ENUM ('open','done','snoozed');

CREATE TABLE public.sales_rep_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_type public.sales_rep_subject NOT NULL,
  subject_id uuid NOT NULL,
  kind public.followup_kind NOT NULL DEFAULT 'note',
  status public.followup_status NOT NULL DEFAULT 'open',
  title text NOT NULL,
  body text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_followups_rep_status ON public.sales_rep_followups(rep_user_id, status);
CREATE INDEX idx_followups_subject ON public.sales_rep_followups(subject_type, subject_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_rep_followups TO authenticated;
GRANT ALL ON public.sales_rep_followups TO service_role;
ALTER TABLE public.sales_rep_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rep manages own followups" ON public.sales_rep_followups FOR ALL TO authenticated USING (auth.uid() = rep_user_id) WITH CHECK (auth.uid() = rep_user_id);
CREATE POLICY "Admins manage all followups" ON public.sales_rep_followups FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_sales_rep_followups_updated BEFORE UPDATE ON public.sales_rep_followups FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== Helper: safe customer-facing rep lookup ==========
CREATE OR REPLACE FUNCTION public.get_assigned_rep_card(_subject_type text, _subject_id uuid)
RETURNS TABLE (
  rep_user_id uuid, full_name text, title text, bio text, photo_url text,
  public_email text, public_phone text, accepting_new_clients boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    a.rep_user_id,
    COALESCE(NULLIF(p.full_name,''), p.first_name, au.email) AS full_name,
    sp.title, sp.bio,
    COALESCE(sp.photo_url, p.avatar_url) AS photo_url,
    COALESCE(sp.public_email, au.email) AS public_email,
    COALESCE(sp.public_phone, p.phone_e164, p.phone) AS public_phone,
    COALESCE(sp.accepting_new_clients, true) AS accepting_new_clients
  FROM public.sales_rep_assignments a
  LEFT JOIN public.sales_rep_profiles sp ON sp.user_id = a.rep_user_id
  LEFT JOIN public.profiles p ON p.id = a.rep_user_id
  LEFT JOIN auth.users au ON au.id = a.rep_user_id
  WHERE a.active = true
    AND a.subject_type::text = _subject_type
    AND a.subject_id = _subject_id
    AND (
      (_subject_type = 'user' AND a.subject_id = auth.uid())
      OR a.rep_user_id = auth.uid()
      OR public.has_role(auth.uid(),'admin'::app_role)
      OR (_subject_type = 'business' AND EXISTS (
        SELECT 1 FROM public.businesses b WHERE b.id = a.subject_id AND b.owner_id = auth.uid()
      ))
    )
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_assigned_rep_card(text, uuid) TO authenticated;

-- ========== Auto-assign on staff referral signup ==========
CREATE OR REPLACE FUNCTION public.tg_auto_assign_sales_rep()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_staff_user uuid;
BEGIN
  IF NEW.referred_by_staff_id IS NULL THEN RETURN NEW; END IF;
  SELECT staff_user_id INTO v_staff_user FROM public.staff_referrals WHERE id = NEW.referred_by_staff_id;
  IF v_staff_user IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_staff_user AND role::text = 'sales') THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.sales_rep_assignments(rep_user_id, subject_type, subject_id, source, assigned_by)
  VALUES (v_staff_user, 'user', NEW.user_id, 'referral', v_staff_user)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_user_referrals_auto_assign_rep AFTER INSERT ON public.user_referrals FOR EACH ROW EXECUTE FUNCTION public.tg_auto_assign_sales_rep();

-- ========== Auto-create sales_rep_profiles for sales staff ==========
INSERT INTO public.sales_rep_profiles(user_id)
SELECT ur.user_id FROM public.user_roles ur WHERE ur.role::text = 'sales'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.tg_create_sales_rep_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role::text = 'sales' THEN
    INSERT INTO public.sales_rep_profiles(user_id) VALUES (NEW.user_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_user_roles_create_sales_rep AFTER INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.tg_create_sales_rep_profile();

-- ========== Backfill: assign existing referrals to sales reps ==========
INSERT INTO public.sales_rep_assignments(rep_user_id, subject_type, subject_id, source, assigned_at)
SELECT sr.staff_user_id, 'user', ur.user_id, 'referral', COALESCE(ur.signup_date, now())
FROM public.user_referrals ur
JOIN public.staff_referrals sr ON sr.id = ur.referred_by_staff_id
JOIN public.user_roles uro ON uro.user_id = sr.staff_user_id AND uro.role::text = 'sales'
WHERE sr.staff_user_id IS NOT NULL
ON CONFLICT DO NOTHING;
