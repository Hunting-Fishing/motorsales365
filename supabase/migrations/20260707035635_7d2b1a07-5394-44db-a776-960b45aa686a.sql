
CREATE TABLE public.staff_academy_article_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.staff_academy_articles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created','published','unpublished','status_changed','updated')),
  from_status TEXT,
  to_status TEXT,
  title TEXT,
  slug TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX staff_academy_article_history_article_idx
  ON public.staff_academy_article_history(article_id, created_at DESC);

GRANT SELECT ON public.staff_academy_article_history TO authenticated;
GRANT ALL ON public.staff_academy_article_history TO service_role;

ALTER TABLE public.staff_academy_article_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view article history"
  ON public.staff_academy_article_history
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_staff_academy_article_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_from TEXT;
  v_to TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := CASE WHEN NEW.status = 'active' THEN 'published' ELSE 'created' END;
    v_from := NULL;
    v_to := NEW.status;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'active' THEN
        v_action := 'published';
      ELSIF OLD.status = 'active' THEN
        v_action := 'unpublished';
      ELSE
        v_action := 'status_changed';
      END IF;
      v_from := OLD.status;
      v_to := NEW.status;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.staff_academy_article_history
    (article_id, action, from_status, to_status, title, slug, changed_by, snapshot)
  VALUES (
    NEW.id, v_action, v_from, v_to, NEW.title, NEW.slug, NEW.updated_by,
    jsonb_build_object(
      'title', NEW.title,
      'description', NEW.description,
      'category', NEW.category,
      'status', NEW.status,
      'tags', NEW.tags,
      'sections', NEW.sections,
      'hero_emoji', NEW.hero_emoji,
      'hero_image_url', NEW.hero_image_url
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER staff_academy_articles_history
AFTER INSERT OR UPDATE ON public.staff_academy_articles
FOR EACH ROW EXECUTE FUNCTION public.log_staff_academy_article_change();
