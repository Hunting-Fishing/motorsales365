
CREATE TABLE public.email_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL UNIQUE,
  destination text NOT NULL,
  source text NOT NULL DEFAULT 'cloudflare' CHECK (source IN ('cloudflare','app','legal','other')),
  category text,
  owner text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_routes TO authenticated;
GRANT ALL ON public.email_routes TO service_role;

ALTER TABLE public.email_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super-admin can read email routes"
  ON public.email_routes FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'jordilwbailey@gmail.com');

CREATE POLICY "Super-admin can insert email routes"
  ON public.email_routes FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'jordilwbailey@gmail.com');

CREATE POLICY "Super-admin can update email routes"
  ON public.email_routes FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'jordilwbailey@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'jordilwbailey@gmail.com');

CREATE POLICY "Super-admin can delete email routes"
  ON public.email_routes FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'jordilwbailey@gmail.com');

CREATE OR REPLACE FUNCTION public.update_email_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER email_routes_set_updated_at
  BEFORE UPDATE ON public.email_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_email_routes_updated_at();

INSERT INTO public.email_routes (address, destination, source, category, owner, notes, active) VALUES
  ('payments@365motorsales.com',              'jordilwbailey@gmail.com', 'cloudflare', 'finance',  'Jordi', 'Payment notifications routing', true),
  ('adminbusinesspersonal@365motorsales.com', 'jordilwbailey@gmail.com', 'cloudflare', 'admin',    'Jordi', 'Personal admin business mail',  true),
  ('notify@365motorsales.com',                'jordilwbailey@gmail.com', 'cloudflare', 'system',   'Jordi', 'System notify alias',           true),
  ('joan@365motorsales.com',                  'jordilwbailey@gmail.com', 'cloudflare', 'staff',    'Joan',  'Staff inbox forward',           true),
  ('admin@365motorsales.com',                 'jordilwbailey@gmail.com', 'cloudflare', 'admin',    'Jordi', 'Primary admin alias',           true),
  ('sales@365motorsales.com',                 'jordilwbailey@gmail.com', 'cloudflare', 'sales',    'Jordi', 'Sales inquiries',               true),
  ('info@365motorsales.com',                  'jordilwbailey@gmail.com', 'cloudflare', 'general',  'Jordi', 'General contact inbox',         true)
ON CONFLICT (address) DO NOTHING;
