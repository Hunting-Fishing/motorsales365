
CREATE TABLE public.inspection_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price_php_min INTEGER NOT NULL DEFAULT 0,
  price_php_max INTEGER,
  pricing_unit TEXT NOT NULL DEFAULT 'flat',
  currency TEXT NOT NULL DEFAULT 'PHP',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.inspection_services TO anon, authenticated;
GRANT ALL ON public.inspection_services TO service_role;

ALTER TABLE public.inspection_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active inspection services"
ON public.inspection_services FOR SELECT
USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage inspection services"
ON public.inspection_services FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER inspection_services_set_updated_at
  BEFORE UPDATE ON public.inspection_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.inspection_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.inspection_services(id) ON DELETE RESTRICT,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  vehicle_summary TEXT,
  region TEXT,
  preferred_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  provider_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX inspection_orders_buyer_idx ON public.inspection_orders(buyer_id);
CREATE INDEX inspection_orders_service_idx ON public.inspection_orders(service_id);
CREATE INDEX inspection_orders_status_idx ON public.inspection_orders(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_orders TO authenticated;
GRANT ALL ON public.inspection_orders TO service_role;

ALTER TABLE public.inspection_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers create own inspection orders"
ON public.inspection_orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers view own inspection orders"
ON public.inspection_orders FOR SELECT TO authenticated
USING (auth.uid() = buyer_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE POLICY "Buyers update own pending orders"
ON public.inspection_orders FOR UPDATE TO authenticated
USING (auth.uid() = buyer_id AND status IN ('requested','assigned'))
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins manage inspection orders"
ON public.inspection_orders FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE TRIGGER inspection_orders_set_updated_at
  BEFORE UPDATE ON public.inspection_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.inspection_services (slug, name, description, category, price_php_min, price_php_max, pricing_unit, sort_order) VALUES
  ('or-cr-review',       'OR/CR document review',          'A 365-vetted reviewer checks the seller''s Official Receipt and Certificate of Registration for tampering, expiry, encumbrance flags, and that the registered owner matches.', 'or_cr_review',     199, 499, 'flat',       10),
  ('seller-id-verify',   'Seller ID verification',         'We verify the seller''s government-issued ID against the name on the OR/CR and confirm a live selfie match.',                                                                  'id_verify',         99, 299, 'flat',       20),
  ('pre-purchase-lead',  'Pre-purchase inspection (lead)', 'We route your request to a vetted PH inspection mechanic in your region. You pay the inspector directly; pricing varies by location and vehicle.',                              'prepurchase',      500, 2500, 'flat',       30),
  ('mechanic-booking',   'Mechanic inspection booking',    'Concierge booking for a partner mechanic to perform a hands-on inspection. 365 takes a small commission from the mechanic; the buyer''s booking is free.',                     'prepurchase',        0, NULL, 'commission', 40),
  ('history-report',     'Vehicle history / Passport report', 'PDF report compiled from the vehicle''s 365 Passport timeline plus public LTO/HPG checks where available.',                                                                  'history_report',   199, 999, 'flat',       50),
  ('transaction-assist', 'Transaction assistance',         'Guided document hand-off and payment-release coordination. 365 is not an escrow agent — funds are released through a regulated payment release partner.',                       'transaction_assist', 0, NULL, 'percent',  60);
