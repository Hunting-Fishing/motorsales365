-- Social posts table
CREATE TABLE public.pt_social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  author_client_id uuid REFERENCES public.pt_clients(id) ON DELETE SET NULL,
  author_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  post_type text NOT NULL DEFAULT 'text',
  caption text NOT NULL DEFAULT '',
  media_urls text[] DEFAULT '{}',
  thumbnail_url text,
  tags text[] DEFAULT '{}',
  milestone_id uuid REFERENCES public.pt_client_milestones(id) ON DELETE SET NULL,
  visibility text NOT NULL DEFAULT 'everyone',
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pt_social_posts ENABLE ROW LEVEL SECURITY;

-- Social reactions table
CREATE TABLE public.pt_social_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.pt_social_posts(id) ON DELETE CASCADE,
  reactor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, reactor_profile_id, reaction_type)
);

ALTER TABLE public.pt_social_reactions ENABLE ROW LEVEL SECURITY;

-- Social comments table
CREATE TABLE public.pt_social_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.pt_social_posts(id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES public.pt_social_comments(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pt_social_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for pt_social_posts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_posts_select_shop' AND tablename = 'pt_social_posts') THEN
    CREATE POLICY social_posts_select_shop ON public.pt_social_posts FOR SELECT TO authenticated
      USING (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_posts_insert_shop' AND tablename = 'pt_social_posts') THEN
    CREATE POLICY social_posts_insert_shop ON public.pt_social_posts FOR INSERT TO authenticated
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_posts_update_shop' AND tablename = 'pt_social_posts') THEN
    CREATE POLICY social_posts_update_shop ON public.pt_social_posts FOR UPDATE TO authenticated
      USING (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_posts_delete_shop' AND tablename = 'pt_social_posts') THEN
    CREATE POLICY social_posts_delete_shop ON public.pt_social_posts FOR DELETE TO authenticated
      USING (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- RLS policies for pt_social_reactions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_reactions_select_shop' AND tablename = 'pt_social_reactions') THEN
    CREATE POLICY social_reactions_select_shop ON public.pt_social_reactions FOR SELECT TO authenticated
      USING (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_reactions_insert_shop' AND tablename = 'pt_social_reactions') THEN
    CREATE POLICY social_reactions_insert_shop ON public.pt_social_reactions FOR INSERT TO authenticated
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_reactions_delete_shop' AND tablename = 'pt_social_reactions') THEN
    CREATE POLICY social_reactions_delete_shop ON public.pt_social_reactions FOR DELETE TO authenticated
      USING (shop_id = public.get_current_user_shop_id() AND reactor_profile_id = auth.uid());
  END IF;
END $$;

-- RLS policies for pt_social_comments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_comments_select_shop' AND tablename = 'pt_social_comments') THEN
    CREATE POLICY social_comments_select_shop ON public.pt_social_comments FOR SELECT TO authenticated
      USING (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_comments_insert_shop' AND tablename = 'pt_social_comments') THEN
    CREATE POLICY social_comments_insert_shop ON public.pt_social_comments FOR INSERT TO authenticated
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_comments_delete_shop' AND tablename = 'pt_social_comments') THEN
    CREATE POLICY social_comments_delete_shop ON public.pt_social_comments FOR DELETE TO authenticated
      USING (shop_id = public.get_current_user_shop_id() AND author_profile_id = auth.uid());
  END IF;
END $$;

-- Indexes
CREATE INDEX idx_pt_social_posts_shop ON public.pt_social_posts(shop_id, created_at DESC);
CREATE INDEX idx_pt_social_posts_type ON public.pt_social_posts(post_type);
CREATE INDEX idx_pt_social_reactions_post ON public.pt_social_reactions(post_id);
CREATE INDEX idx_pt_social_comments_post ON public.pt_social_comments(post_id);