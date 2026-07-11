-- Create junction table for multiple roles per gunsmith team member
CREATE TABLE public.gunsmith_team_member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES public.gunsmith_team_members(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.gunsmith_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_member_id, role_id)
);

-- Enable RLS
ALTER TABLE public.gunsmith_team_member_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view gunsmith team member roles" 
  ON public.gunsmith_team_member_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert gunsmith team member roles"
  ON public.gunsmith_team_member_roles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update gunsmith team member roles"
  ON public.gunsmith_team_member_roles FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete gunsmith team member roles"
  ON public.gunsmith_team_member_roles FOR DELETE TO authenticated USING (true);

-- Migrate existing role assignments from gunsmith_team_members.role_id
INSERT INTO public.gunsmith_team_member_roles (team_member_id, role_id)
SELECT id, role_id FROM public.gunsmith_team_members WHERE role_id IS NOT NULL;