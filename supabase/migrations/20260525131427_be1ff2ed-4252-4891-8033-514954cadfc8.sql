
-- 1. Add organization_id to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_organization_id ON public.businesses(organization_id);

-- 2. Enums
DO $$ BEGIN
  CREATE TYPE public.lead_source AS ENUM ('listing_message','business_inquiry','service_inquiry','tow_request');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM ('new','in_progress','won','lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_activity_kind AS ENUM ('created','assigned','status_changed','note','reply_sent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source public.lead_source NOT NULL,
  source_id text NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  customer_user_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  subject text,
  preview text,
  status public.lead_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON public.leads(last_activity_at DESC);

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view leads" ON public.leads
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. lead_activities
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind public.lead_activity_kind NOT NULL,
  from_value text,
  to_value text,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities(lead_id, created_at DESC);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view lead activities" ON public.lead_activities
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_activities.lead_id
      AND public.is_org_member(auth.uid(), l.organization_id)
  ));

CREATE POLICY "Org members can insert lead activities" ON public.lead_activities
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_activities.lead_id
      AND public.is_org_member(auth.uid(), l.organization_id)
  ));

-- 5. Auto-activity trigger on leads
CREATE OR REPLACE FUNCTION public.tg_lead_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lead_activities(lead_id, actor_id, kind, to_value, body)
    VALUES (NEW.id, NEW.assigned_to, 'created', NEW.status::text, NEW.preview);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.lead_activities(lead_id, actor_id, kind, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status::text, NEW.status::text);
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.lead_activities(lead_id, actor_id, kind, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'assigned',
              COALESCE(OLD.assigned_to::text,''),
              COALESCE(NEW.assigned_to::text,''));
      NEW.assigned_at = now();
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_leads_activity_ins AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_activity();
CREATE TRIGGER trg_leads_activity_upd BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_activity();

-- 6. Auto-create leads from messages on org-linked listings
CREATE OR REPLACE FUNCTION public.tg_lead_from_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_org uuid;
  l_listing uuid := NEW.listing_id;
  customer uuid;
  cust_name text;
  cust_email text;
  cust_phone text;
  thread_key text;
BEGIN
  IF l_listing IS NULL THEN RETURN NEW; END IF;
  SELECT organization_id INTO l_org FROM public.listings WHERE id = l_listing;
  IF l_org IS NULL THEN RETURN NEW; END IF;

  -- Determine who is the customer (the one who is NOT in the org)
  IF public.is_org_member(NEW.sender_id, l_org) THEN
    customer := NEW.recipient_id;
    -- A reply from an org member counts as reply_sent
    INSERT INTO public.lead_activities(lead_id, actor_id, kind, body)
    SELECT id, NEW.sender_id, 'reply_sent', LEFT(NEW.body, 280)
      FROM public.leads
     WHERE source = 'listing_message'
       AND source_id = LEAST(NEW.sender_id::text, NEW.recipient_id::text)
                    || '|' || GREATEST(NEW.sender_id::text, NEW.recipient_id::text)
                    || '|' || l_listing::text;
    -- Bump activity timestamp
    UPDATE public.leads SET last_activity_at = now()
     WHERE source = 'listing_message'
       AND source_id = LEAST(NEW.sender_id::text, NEW.recipient_id::text)
                    || '|' || GREATEST(NEW.sender_id::text, NEW.recipient_id::text)
                    || '|' || l_listing::text;
    RETURN NEW;
  ELSE
    customer := NEW.sender_id;
  END IF;

  SELECT full_name, NULL::text, phone INTO cust_name, cust_email, cust_phone
    FROM public.profiles WHERE id = customer;

  thread_key := LEAST(NEW.sender_id::text, NEW.recipient_id::text)
             || '|' || GREATEST(NEW.sender_id::text, NEW.recipient_id::text)
             || '|' || l_listing::text;

  INSERT INTO public.leads(
    organization_id, source, source_id, listing_id,
    customer_user_id, customer_name, customer_phone,
    subject, preview, last_activity_at
  ) VALUES (
    l_org, 'listing_message', thread_key, l_listing,
    customer, cust_name, cust_phone,
    'Listing inquiry', LEFT(NEW.body, 280), now()
  )
  ON CONFLICT (source, source_id) DO UPDATE
    SET last_activity_at = now(),
        preview = LEFT(NEW.body, 280);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_message_lead AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_from_message();

-- 7. Auto-create leads from service_inquiries on org-linked businesses
CREATE OR REPLACE FUNCTION public.tg_lead_from_service_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_org uuid;
BEGIN
  IF NEW.business_id IS NULL THEN RETURN NEW; END IF;
  SELECT organization_id INTO l_org FROM public.businesses WHERE id = NEW.business_id;
  IF l_org IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.leads(
    organization_id, source, source_id, business_id,
    customer_name, customer_email, customer_phone,
    subject, preview, last_activity_at
  ) VALUES (
    l_org, 'service_inquiry', NEW.id::text, NEW.business_id,
    NEW.contact_name, NEW.email, NEW.phone,
    COALESCE('Service inquiry: ' || NEW.vehicle_summary, 'Service inquiry'),
    LEFT(COALESCE(NEW.message,''), 280), now()
  )
  ON CONFLICT (source, source_id) DO NOTHING;
  RETURN NEW;
END $$;

-- Only attach if service_inquiries has business_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='service_inquiries' AND column_name='business_id') THEN
    EXECUTE 'CREATE TRIGGER trg_service_inquiry_lead AFTER INSERT ON public.service_inquiries
             FOR EACH ROW EXECUTE FUNCTION public.tg_lead_from_service_inquiry()';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. Auto-create leads from tow_requests on org-linked listings
CREATE OR REPLACE FUNCTION public.tg_lead_from_tow_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_org uuid;
  cust_name text;
  cust_phone text;
BEGIN
  IF NEW.listing_id IS NULL THEN RETURN NEW; END IF;
  SELECT organization_id INTO l_org FROM public.listings WHERE id = NEW.listing_id;
  IF l_org IS NULL THEN RETURN NEW; END IF;

  SELECT full_name, phone INTO cust_name, cust_phone FROM public.profiles WHERE id = NEW.requester_id;

  INSERT INTO public.leads(
    organization_id, source, source_id, listing_id,
    customer_user_id, customer_name, customer_phone,
    subject, preview, last_activity_at
  ) VALUES (
    l_org, 'tow_request', NEW.id::text, NEW.listing_id,
    NEW.requester_id, cust_name, cust_phone,
    'Tow request: ' || NEW.vehicle_summary,
    LEFT(COALESCE(NEW.notes,''), 280), now()
  )
  ON CONFLICT (source, source_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_tow_request_lead AFTER INSERT ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_from_tow_request();

-- 9. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;
