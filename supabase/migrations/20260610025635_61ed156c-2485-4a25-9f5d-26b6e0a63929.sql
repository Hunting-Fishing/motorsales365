GRANT SELECT ON public.wanted_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wanted_posts TO authenticated;
GRANT ALL ON public.wanted_posts TO service_role;

GRANT SELECT ON public.wanted_post_responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wanted_post_responses TO authenticated;
GRANT ALL ON public.wanted_post_responses TO service_role;