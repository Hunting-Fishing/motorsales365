-- Create JSA templates table
CREATE TABLE public.jsa_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  job_category TEXT, -- maintenance, inspection, repair, operation, etc.
  default_hazards JSONB DEFAULT '[]',
  required_ppe TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Job Safety Analyses table
CREATE TABLE public.job_safety_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  template_id UUID REFERENCES public.jsa_templates(id),
  work_order_id UUID REFERENCES public.work_orders(id),
  jsa_number TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_description TEXT,
  location TEXT,
  date_performed DATE NOT NULL DEFAULT CURRENT_DATE,
  supervisor_id UUID REFERENCES public.profiles(id),
  supervisor_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, pending_approval, approved, rejected
  overall_risk_level TEXT, -- low, medium, high, critical
  required_ppe TEXT[] DEFAULT '{}',
  special_precautions TEXT,
  emergency_procedures TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create JSA hazards table (individual hazards for each JSA)
CREATE TABLE public.jsa_hazards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jsa_id UUID NOT NULL REFERENCES public.job_safety_analyses(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  task_step TEXT NOT NULL,
  hazard_description TEXT NOT NULL,
  likelihood INTEGER NOT NULL DEFAULT 3, -- 1-5 scale
  severity INTEGER NOT NULL DEFAULT 3, -- 1-5 scale
  risk_score INTEGER GENERATED ALWAYS AS (likelihood * severity) STORED,
  control_measures TEXT[] DEFAULT '{}',
  responsible_person TEXT,
  residual_risk_level TEXT, -- low, medium, high after controls
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jsa_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_safety_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jsa_hazards ENABLE ROW LEVEL SECURITY;

-- RLS policies for jsa_templates
CREATE POLICY "Users can view JSA templates in their shop"
  ON public.jsa_templates FOR SELECT
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create JSA templates in their shop"
  ON public.jsa_templates FOR INSERT
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update JSA templates in their shop"
  ON public.jsa_templates FOR UPDATE
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete JSA templates in their shop"
  ON public.jsa_templates FOR DELETE
  USING (shop_id = public.get_current_user_shop_id());

-- RLS policies for job_safety_analyses
CREATE POLICY "Users can view JSAs in their shop"
  ON public.job_safety_analyses FOR SELECT
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create JSAs in their shop"
  ON public.job_safety_analyses FOR INSERT
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update JSAs in their shop"
  ON public.job_safety_analyses FOR UPDATE
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete JSAs in their shop"
  ON public.job_safety_analyses FOR DELETE
  USING (shop_id = public.get_current_user_shop_id());

-- RLS policies for jsa_hazards
CREATE POLICY "Users can view JSA hazards"
  ON public.jsa_hazards FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.job_safety_analyses j 
    WHERE j.id = jsa_id AND j.shop_id = public.get_current_user_shop_id()
  ));

CREATE POLICY "Users can manage JSA hazards"
  ON public.jsa_hazards FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.job_safety_analyses j 
    WHERE j.id = jsa_id AND j.shop_id = public.get_current_user_shop_id()
  ));

CREATE POLICY "Users can update JSA hazards"
  ON public.jsa_hazards FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.job_safety_analyses j 
    WHERE j.id = jsa_id AND j.shop_id = public.get_current_user_shop_id()
  ));

CREATE POLICY "Users can delete JSA hazards"
  ON public.jsa_hazards FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.job_safety_analyses j 
    WHERE j.id = jsa_id AND j.shop_id = public.get_current_user_shop_id()
  ));

-- Indexes
CREATE INDEX idx_jsa_templates_shop_id ON public.jsa_templates(shop_id);
CREATE INDEX idx_job_safety_analyses_shop_id ON public.job_safety_analyses(shop_id);
CREATE INDEX idx_job_safety_analyses_work_order ON public.job_safety_analyses(work_order_id);
CREATE INDEX idx_job_safety_analyses_status ON public.job_safety_analyses(status);
CREATE INDEX idx_jsa_hazards_jsa_id ON public.jsa_hazards(jsa_id);