-- Staff Academy article table
CREATE TABLE public.staff_academy_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('playbook','feature','coming-soon','infographic','script','compliance')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','coming-soon','draft')),
  hero_emoji TEXT,
  hero_image_url TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_academy_articles TO authenticated;
GRANT ALL ON public.staff_academy_articles TO service_role;

ALTER TABLE public.staff_academy_articles ENABLE ROW LEVEL SECURITY;

-- Staff (via role or @365motorsales.com email) can read published rows
CREATE POLICY "Staff read published articles"
ON public.staff_academy_articles
FOR SELECT
TO authenticated
USING (
  status <> 'draft'
  AND (
    public.is_staff(auth.uid())
    OR ((auth.jwt() ->> 'email') ILIKE '%@365motorsales.com')
  )
);

-- Admins can do anything
CREATE POLICY "Admins read all articles"
ON public.staff_academy_articles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert articles"
ON public.staff_academy_articles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update articles"
ON public.staff_academy_articles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete articles"
ON public.staff_academy_articles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-bump updated_at (reuse project helper if present, else create local)
CREATE OR REPLACE FUNCTION public.staff_academy_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_staff_academy_touch
BEFORE UPDATE ON public.staff_academy_articles
FOR EACH ROW EXECUTE FUNCTION public.staff_academy_touch_updated_at();

CREATE INDEX idx_staff_academy_sort ON public.staff_academy_articles (sort_order, updated_at DESC);
CREATE INDEX idx_staff_academy_category ON public.staff_academy_articles (category);
