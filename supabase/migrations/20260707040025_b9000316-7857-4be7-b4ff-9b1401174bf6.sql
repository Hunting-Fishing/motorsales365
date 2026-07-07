
CREATE TABLE public.staff_academy_article_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES public.staff_academy_articles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX staff_academy_article_views_article_idx
  ON public.staff_academy_article_views(article_id, created_at DESC);
CREATE INDEX staff_academy_article_views_slug_idx
  ON public.staff_academy_article_views(slug, created_at DESC);

GRANT SELECT, INSERT ON public.staff_academy_article_views TO authenticated;
GRANT ALL ON public.staff_academy_article_views TO service_role;

ALTER TABLE public.staff_academy_article_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own view"
  ON public.staff_academy_article_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Admins can read view analytics"
  ON public.staff_academy_article_views
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
