-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.form_submissions;

-- Create form_templates table
CREATE TABLE IF NOT EXISTS public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_published BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create form_sections table
CREATE TABLE IF NOT EXISTS public.form_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create form_fields table
CREATE TABLE IF NOT EXISTS public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.form_sections(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  placeholder TEXT,
  help_text TEXT,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  options JSONB,
  default_value TEXT,
  validation_rules JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create form_submissions table
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  submitted_data JSONB NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  work_order_id UUID REFERENCES public.work_orders(id),
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_form_sections_template_id ON public.form_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_section_id ON public.form_fields(section_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_template_id ON public.form_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_work_order_id ON public.form_submissions(work_order_id);

-- Enable RLS on all tables
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_templates
DROP POLICY IF EXISTS "Users can view published templates" ON public.form_templates;
CREATE POLICY "Users can view published templates"
  ON public.form_templates FOR SELECT
  USING (is_published = true OR auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can create templates" ON public.form_templates;
CREATE POLICY "Users can create templates"
  ON public.form_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own templates" ON public.form_templates;
CREATE POLICY "Users can update their own templates"
  ON public.form_templates FOR UPDATE
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own templates" ON public.form_templates;
CREATE POLICY "Users can delete their own templates"
  ON public.form_templates FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for form_sections
DROP POLICY IF EXISTS "Users can view sections of accessible templates" ON public.form_sections;
CREATE POLICY "Users can view sections of accessible templates"
  ON public.form_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.form_templates
      WHERE form_templates.id = form_sections.template_id
      AND (form_templates.is_published = true OR form_templates.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage sections of their templates" ON public.form_sections;
CREATE POLICY "Users can manage sections of their templates"
  ON public.form_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.form_templates
      WHERE form_templates.id = form_sections.template_id
      AND form_templates.created_by = auth.uid()
    )
  );

-- RLS Policies for form_fields
DROP POLICY IF EXISTS "Users can view fields of accessible templates" ON public.form_fields;
CREATE POLICY "Users can view fields of accessible templates"
  ON public.form_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.form_sections
      JOIN public.form_templates ON form_templates.id = form_sections.template_id
      WHERE form_sections.id = form_fields.section_id
      AND (form_templates.is_published = true OR form_templates.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage fields of their templates" ON public.form_fields;
CREATE POLICY "Users can manage fields of their templates"
  ON public.form_fields FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.form_sections
      JOIN public.form_templates ON form_templates.id = form_sections.template_id
      WHERE form_sections.id = form_fields.section_id
      AND form_templates.created_by = auth.uid()
    )
  );

-- RLS Policies for form_submissions
CREATE POLICY "Users can view their own submissions"
  ON public.form_submissions FOR SELECT
  USING (auth.uid() = submitted_by);

CREATE POLICY "Users can create submissions"
  ON public.form_submissions FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

-- Create trigger to update updated_at on form_templates
CREATE OR REPLACE FUNCTION public.update_form_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_form_template_timestamp ON public.form_templates;
CREATE TRIGGER update_form_template_timestamp
  BEFORE UPDATE ON public.form_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_form_template_updated_at();