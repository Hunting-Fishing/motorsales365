CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  label text,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

INSERT INTO public.site_settings (key, value, label, description)
VALUES 
  ('support_whatsapp', '', 'Support WhatsApp number', 'WhatsApp number for the support contact button (e.g. +63 917 123 4567). Leave empty to hide the button.'),
  ('support_messenger', '', 'Support Messenger URL', 'Facebook Messenger m.me URL for support (e.g. https://m.me/365motorsales). Leave empty to hide the button.')
ON CONFLICT (key) DO NOTHING;