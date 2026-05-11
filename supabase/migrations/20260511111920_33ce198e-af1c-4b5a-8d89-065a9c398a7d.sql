
-- Likes
CREATE TABLE public.listing_likes (
  listing_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, user_id)
);
CREATE INDEX idx_listing_likes_user ON public.listing_likes(user_id);
CREATE INDEX idx_listing_likes_listing ON public.listing_likes(listing_id);

ALTER TABLE public.listing_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes public read" ON public.listing_likes
  FOR SELECT USING (true);

CREATE POLICY "Users like on own behalf" ON public.listing_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users unlike own" ON public.listing_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins manage likes" ON public.listing_likes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Views
CREATE TABLE public.listing_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL,
  viewer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_listing_views_listing_created ON public.listing_views(listing_id, created_at DESC);

ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own listing views" ON public.listing_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_views.listing_id AND l.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Increment function (security definer so anon can call)
CREATE OR REPLACE FUNCTION public.increment_listing_view(_listing_id uuid, _viewer_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.listing_views (listing_id, viewer_id) VALUES (_listing_id, _viewer_id);
  UPDATE public.listings SET view_count = COALESCE(view_count, 0) + 1 WHERE id = _listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid, uuid) TO anon, authenticated;
