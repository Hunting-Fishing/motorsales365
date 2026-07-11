-- Gunsmith useful links + suggestions
CREATE TABLE IF NOT EXISTS public.gunsmith_useful_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  link_type TEXT NOT NULL DEFAULT 'web',
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gunsmith_useful_links_shop_id ON public.gunsmith_useful_links(shop_id);
CREATE INDEX IF NOT EXISTS idx_gunsmith_useful_links_type ON public.gunsmith_useful_links(link_type);
CREATE INDEX IF NOT EXISTS idx_gunsmith_useful_links_category ON public.gunsmith_useful_links(category);

ALTER TABLE public.gunsmith_useful_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gunsmith useful links in their shop"
ON public.gunsmith_useful_links
FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles
    WHERE id = auth.uid() OR user_id = auth.uid()
  )
);

CREATE POLICY "Developers can insert gunsmith useful links"
ON public.gunsmith_useful_links
FOR INSERT
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM public.profiles
    WHERE id = auth.uid() OR user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'owner', 'developer')
  )
);

CREATE POLICY "Developers can update gunsmith useful links"
ON public.gunsmith_useful_links
FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles
    WHERE id = auth.uid() OR user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'owner', 'developer')
  )
);

CREATE POLICY "Developers can delete gunsmith useful links"
ON public.gunsmith_useful_links
FOR DELETE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles
    WHERE id = auth.uid() OR user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'owner', 'developer')
  )
);

CREATE TRIGGER update_gunsmith_useful_links_updated_at
BEFORE UPDATE ON public.gunsmith_useful_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.gunsmith_link_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  link_type TEXT NOT NULL DEFAULT 'web',
  category TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  suggested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  approved_link_id UUID REFERENCES public.gunsmith_useful_links(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gunsmith_link_suggestions_shop_id ON public.gunsmith_link_suggestions(shop_id);
CREATE INDEX IF NOT EXISTS idx_gunsmith_link_suggestions_status ON public.gunsmith_link_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_gunsmith_link_suggestions_suggested_by ON public.gunsmith_link_suggestions(suggested_by);
CREATE INDEX IF NOT EXISTS idx_gunsmith_link_suggestions_type ON public.gunsmith_link_suggestions(link_type);

ALTER TABLE public.gunsmith_link_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their gunsmith link suggestions"
ON public.gunsmith_link_suggestions
FOR SELECT
USING (auth.uid() = suggested_by);

CREATE POLICY "Users can submit gunsmith link suggestions"
ON public.gunsmith_link_suggestions
FOR INSERT
WITH CHECK (
  auth.uid() = suggested_by
  AND shop_id IN (
    SELECT shop_id FROM public.profiles
    WHERE id = auth.uid() OR user_id = auth.uid()
  )
);

CREATE POLICY "Developers can view all gunsmith link suggestions"
ON public.gunsmith_link_suggestions
FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles
    WHERE id = auth.uid() OR user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'owner', 'developer')
  )
);

CREATE POLICY "Developers can update gunsmith link suggestions"
ON public.gunsmith_link_suggestions
FOR UPDATE
USING (
  shop_id IN (
    SELECT shop_id FROM public.profiles
    WHERE id = auth.uid() OR user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'owner', 'developer')
  )
);

CREATE TRIGGER update_gunsmith_link_suggestions_updated_at
BEFORE UPDATE ON public.gunsmith_link_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
