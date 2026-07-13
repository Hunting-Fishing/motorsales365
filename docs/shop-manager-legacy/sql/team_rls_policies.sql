
-- Make sure RLS is enabled on the necessary tables for team management
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_history ENABLE ROW LEVEL SECURITY;

-- Policies for profiles table
CREATE POLICY "Authenticated users can read all profiles"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners and admins can insert profiles"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (
  exists (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  )
);

CREATE POLICY "Owners and admins can update profiles"
ON public.profiles FOR UPDATE TO authenticated USING (
  exists (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  )
);

CREATE POLICY "Owners and admins can delete profiles"
ON public.profiles FOR DELETE TO authenticated USING (
  exists (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  )
);

-- Policies for departments table
CREATE POLICY "Authenticated users can read all departments"
ON public.departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners and admins can manage departments"
ON public.departments FOR ALL TO authenticated USING (
  exists (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  )
);

-- Policies for user_roles table
CREATE POLICY "Authenticated users can read user_roles"
ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners and admins can manage user_roles"
ON public.user_roles FOR ALL TO authenticated USING (
  exists (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  )
);

-- Policies for profile_metadata table
CREATE POLICY "Authenticated users can read metadata"
ON public.profile_metadata FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners, admins, and profile owners can update metadata"
ON public.profile_metadata FOR ALL TO authenticated USING (
  profile_id = auth.uid() OR
  exists (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  )
);

-- Ensure team_member_history records are secure
CREATE POLICY "Authenticated users can read team_member_history"
ON public.team_member_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only owners and admins can manage team_member_history"
ON public.team_member_history FOR ALL TO authenticated USING (
  exists (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND (r.name = 'owner' OR r.name = 'admin')
  )
);
