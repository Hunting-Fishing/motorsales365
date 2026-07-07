
-- Assets table for Staff Academy media library
CREATE TABLE public.staff_academy_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  kind text NOT NULL CHECK (kind IN ('infographic','script','image','video','document')),
  storage_path text NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  mime_type text,
  file_size bigint,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft')),
  sort_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_academy_assets TO authenticated;
GRANT ALL ON public.staff_academy_assets TO service_role;

ALTER TABLE public.staff_academy_assets ENABLE ROW LEVEL SECURITY;

-- Helper: is this user staff (365motorsales.com email or admin role)?
CREATE OR REPLACE FUNCTION public.is_staff_academy_viewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) LIKE '%@365motorsales.com'
  ) OR public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'moderator')
    OR public.has_role(_user_id, 'support')
    OR public.has_role(_user_id, 'sales');
$$;

CREATE POLICY "Staff read published assets"
  ON public.staff_academy_assets FOR SELECT TO authenticated
  USING (status = 'active' AND public.is_staff_academy_viewer(auth.uid()));

CREATE POLICY "Admins read all assets"
  ON public.staff_academy_assets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert assets"
  ON public.staff_academy_assets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update assets"
  ON public.staff_academy_assets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete assets"
  ON public.staff_academy_assets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER staff_academy_assets_set_updated_at
  BEFORE UPDATE ON public.staff_academy_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX staff_academy_assets_kind_idx ON public.staff_academy_assets (kind);
CREATE INDEX staff_academy_assets_status_idx ON public.staff_academy_assets (status);
CREATE INDEX staff_academy_assets_sort_idx ON public.staff_academy_assets (sort_order);

-- Storage policies for the private bucket
CREATE POLICY "Staff read staff-academy-assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'staff-academy-assets' AND public.is_staff_academy_viewer(auth.uid()));

CREATE POLICY "Admins write staff-academy-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'staff-academy-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update staff-academy-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'staff-academy-assets' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'staff-academy-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete staff-academy-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'staff-academy-assets' AND public.has_role(auth.uid(), 'admin'));
