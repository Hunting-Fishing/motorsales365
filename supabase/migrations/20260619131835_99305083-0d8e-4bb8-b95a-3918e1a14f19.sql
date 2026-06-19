
ALTER TABLE public.share_kit_custom_templates
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subcategory text;

CREATE TABLE IF NOT EXISTS public.share_kit_builtin_categories (
  template_id text PRIMARY KEY,
  category text,
  subcategory text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.share_kit_builtin_categories TO authenticated;
GRANT ALL ON public.share_kit_builtin_categories TO service_role;

ALTER TABLE public.share_kit_builtin_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read builtin categories" ON public.share_kit_builtin_categories;
CREATE POLICY "Authenticated can read builtin categories"
  ON public.share_kit_builtin_categories
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage builtin categories" ON public.share_kit_builtin_categories;
CREATE POLICY "Admins manage builtin categories"
  ON public.share_kit_builtin_categories
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
