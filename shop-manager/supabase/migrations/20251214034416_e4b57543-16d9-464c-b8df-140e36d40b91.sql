-- Project Templates table
CREATE TABLE public.project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project Activities table for activity feed
CREATE TABLE public.project_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  user_id UUID,
  activity_type TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project Attachments table
CREATE TABLE public.project_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT DEFAULT 'general',
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add actual hours tracking to resource assignments
ALTER TABLE public.project_resource_assignments 
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_entries JSONB DEFAULT '[]';

-- Enable RLS
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_templates
CREATE POLICY "Users can view their shop templates" ON public.project_templates
FOR SELECT USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create templates" ON public.project_templates
FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update their shop templates" ON public.project_templates
FOR UPDATE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete their shop templates" ON public.project_templates
FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS Policies for project_activities
CREATE POLICY "Users can view project activities" ON public.project_activities
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.project_budgets pb 
    WHERE pb.id = project_id AND pb.shop_id = public.get_current_user_shop_id()
  )
);

CREATE POLICY "Users can create project activities" ON public.project_activities
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_budgets pb 
    WHERE pb.id = project_id AND pb.shop_id = public.get_current_user_shop_id()
  )
);

-- RLS Policies for project_attachments
CREATE POLICY "Users can view project attachments" ON public.project_attachments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.project_budgets pb 
    WHERE pb.id = project_id AND pb.shop_id = public.get_current_user_shop_id()
  )
);

CREATE POLICY "Users can create project attachments" ON public.project_attachments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_budgets pb 
    WHERE pb.id = project_id AND pb.shop_id = public.get_current_user_shop_id()
  )
);

CREATE POLICY "Users can delete project attachments" ON public.project_attachments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.project_budgets pb 
    WHERE pb.id = project_id AND pb.shop_id = public.get_current_user_shop_id()
  )
);

-- Indexes for performance
CREATE INDEX idx_project_templates_shop ON public.project_templates(shop_id);
CREATE INDEX idx_project_activities_project ON public.project_activities(project_id);
CREATE INDEX idx_project_attachments_project ON public.project_attachments(project_id);

-- Create storage bucket for project attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('project-attachments', 'project-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload project attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view project attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-attachments' AND auth.role() = 'authenticated');