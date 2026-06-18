
CREATE TABLE public.share_kit_custom_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  image_url text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  qr_cx numeric NOT NULL DEFAULT 0.85,
  qr_cy numeric NOT NULL DEFAULT 0.85,
  qr_size numeric NOT NULL DEFAULT 0.18,
  share_text text NOT NULL DEFAULT 'Scan or tap to shop with my 365 Motor Sales link: {link}',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.share_kit_custom_templates TO authenticated;
GRANT ALL ON public.share_kit_custom_templates TO service_role;

ALTER TABLE public.share_kit_custom_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read active templates"
  ON public.share_kit_custom_templates FOR SELECT
  TO authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage templates"
  ON public.share_kit_custom_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_share_kit_templates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER share_kit_custom_templates_touch
BEFORE UPDATE ON public.share_kit_custom_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_share_kit_templates();

CREATE TABLE public.share_kit_hidden_builtins (
  template_id text NOT NULL PRIMARY KEY,
  hidden_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  hidden_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.share_kit_hidden_builtins TO authenticated;
GRANT ALL ON public.share_kit_hidden_builtins TO service_role;

ALTER TABLE public.share_kit_hidden_builtins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read hidden builtins"
  ON public.share_kit_hidden_builtins FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage hidden builtins"
  ON public.share_kit_hidden_builtins FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
