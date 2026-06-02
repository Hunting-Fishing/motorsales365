ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on site_settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);