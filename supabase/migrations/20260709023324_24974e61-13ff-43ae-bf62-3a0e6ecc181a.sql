
-- ============ franchise_tiers ============
CREATE TABLE public.franchise_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  monthly_fee_cents INTEGER NOT NULL DEFAULT 0,
  setup_fee_cents INTEGER NOT NULL DEFAULT 0,
  parts_discount_bps INTEGER NOT NULL DEFAULT 0,
  ad_discount_bps INTEGER NOT NULL DEFAULT 0,
  includes_shop_manager BOOLEAN NOT NULL DEFAULT false,
  includes_inventory BOOLEAN NOT NULL DEFAULT false,
  includes_shared_crm BOOLEAN NOT NULL DEFAULT false,
  branding_rights TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.franchise_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.franchise_tiers TO authenticated;
GRANT ALL ON public.franchise_tiers TO service_role;

ALTER TABLE public.franchise_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tiers"
  ON public.franchise_tiers FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage tiers"
  ON public.franchise_tiers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_franchise_tiers_updated_at
  BEFORE UPDATE ON public.franchise_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ franchise_applications ============
CREATE TABLE public.franchise_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  business_name TEXT NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  city TEXT,
  province TEXT,
  tier_slug TEXT NOT NULL,
  shop_type TEXT,
  years_in_business INTEGER,
  staff_count INTEGER,
  monthly_parts_spend_cents INTEGER,
  existing_brands TEXT[] DEFAULT '{}',
  website_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_review','info_requested','approved','rejected')),
  assigned_tier_slug TEXT,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_franchise_apps_user ON public.franchise_applications(user_id);
CREATE INDEX idx_franchise_apps_email ON public.franchise_applications(lower(contact_email));
CREATE INDEX idx_franchise_apps_status ON public.franchise_applications(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.franchise_applications TO authenticated;
GRANT INSERT ON public.franchise_applications TO anon;
GRANT ALL ON public.franchise_applications TO service_role;

ALTER TABLE public.franchise_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an application"
  ON public.franchise_applications FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND assigned_tier_slug IS NULL
    AND reviewer_id IS NULL
    AND reviewer_notes IS NULL
    AND decided_at IS NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Owners view their own applications"
  ON public.franchise_applications FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid()
      OR lower(contact_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );

CREATE POLICY "Admins view all applications"
  ON public.franchise_applications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update applications"
  ON public.franchise_applications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete applications"
  ON public.franchise_applications FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_franchise_apps_updated_at
  BEFORE UPDATE ON public.franchise_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ franchise_memberships ============
CREATE SEQUENCE IF NOT EXISTS public.franchise_member_number_seq START 1001;

CREATE TABLE public.franchise_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.franchise_applications(id) ON DELETE SET NULL,
  tier_slug TEXT NOT NULL,
  member_number TEXT NOT NULL UNIQUE
    DEFAULT ('365-' || lpad(nextval('public.franchise_member_number_seq')::text, 5, '0')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  renews_at TIMESTAMPTZ,
  ad_discount_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_franchise_memberships_user ON public.franchise_memberships(user_id);
CREATE INDEX idx_franchise_memberships_status ON public.franchise_memberships(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.franchise_memberships TO authenticated;
GRANT ALL ON public.franchise_memberships TO service_role;

ALTER TABLE public.franchise_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own membership"
  ON public.franchise_memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all memberships"
  ON public.franchise_memberships FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage memberships"
  ON public.franchise_memberships FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_franchise_memberships_updated_at
  BEFORE UPDATE ON public.franchise_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ franchise_application_messages ============
CREATE TABLE public.franchise_application_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.franchise_applications(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_franchise_app_messages_app ON public.franchise_application_messages(application_id, created_at);

GRANT SELECT, INSERT ON public.franchise_application_messages TO authenticated;
GRANT ALL ON public.franchise_application_messages TO service_role;

ALTER TABLE public.franchise_application_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants and admins view messages"
  ON public.franchise_application_messages FOR SELECT
  USING (
    (
      NOT is_internal
      AND EXISTS (
        SELECT 1 FROM public.franchise_applications a
        WHERE a.id = application_id
          AND (
            a.user_id = auth.uid()
            OR lower(a.contact_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
          )
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Applicants and admins post messages"
  ON public.franchise_application_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        NOT is_internal
        AND EXISTS (
          SELECT 1 FROM public.franchise_applications a
          WHERE a.id = application_id
            AND (
              a.user_id = auth.uid()
              OR lower(a.contact_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
            )
        )
      )
    )
  );

-- ============ Seed default tiers ============
INSERT INTO public.franchise_tiers
  (slug, name, tagline, monthly_fee_cents, setup_fee_cents, parts_discount_bps, ad_discount_bps,
   includes_shop_manager, includes_inventory, includes_shared_crm, branding_rights, features, is_active, sort_order)
VALUES
  ('partner',
   '365 Partner',
   'Keep your brand. Join the network.',
   0, 0, 500, 1000,
   true, true, true,
   'Independent shop keeps its own name and branding. Displays a "365 Verified Partner" badge on the 365 marketplace and in-store kit.',
   '["Verified Partner badge on 365 marketplace","5% network discount on parts sourced via 365","10% off 365 advertising & boosts","Shop Manager + Inventory software included","Shared customer CRM across partner network","Priority placement in local search"]'::jsonb,
   true, 10),
  ('franchise',
   '365 Franchise',
   'Operate as a full 365 network shop.',
   0, 0, 1500, 2500,
   true, true, true,
   'Shop operates under the 365 brand (co-branded signage, uniforms, marketing). Full territory support and lead routing.',
   '["Co-branded 365 signage, uniforms & marketing kit","15% network discount on parts sourced via 365","25% off 365 advertising & boosts","Shop Manager + Inventory + Shared CRM","Real-time network stock visibility","Lead routing from the 365 marketplace","Territory support & onboarding manager","Franchise trust badge and featured directory listing"]'::jsonb,
   true, 20);
