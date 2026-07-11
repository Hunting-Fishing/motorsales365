-- Create corrective_actions table for CAPA tracking
CREATE TABLE public.corrective_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  action_type TEXT NOT NULL DEFAULT 'corrective', -- corrective, preventive
  source_type TEXT, -- incident, inspection, audit, observation
  source_id UUID, -- links to incident_id or inspection_id
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, completed, verified, closed
  assigned_to UUID REFERENCES public.profiles(id),
  due_date DATE,
  completed_date DATE,
  verified_by UUID REFERENCES public.profiles(id),
  verified_date DATE,
  verification_notes TEXT,
  root_cause TEXT,
  preventive_measures TEXT,
  effectiveness_review TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create near_miss_reports table for simplified incident tracking
CREATE TABLE public.near_miss_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  report_number TEXT,
  report_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location TEXT,
  description TEXT NOT NULL,
  potential_severity TEXT NOT NULL DEFAULT 'minor', -- minor, moderate, serious, catastrophic
  category TEXT, -- slip_trip_fall, equipment, chemical, ergonomic, vehicle, other
  contributing_factors TEXT[],
  immediate_actions_taken TEXT,
  reported_by UUID REFERENCES public.profiles(id),
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'reported', -- reported, reviewed, action_required, closed
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  linked_corrective_action_id UUID REFERENCES public.corrective_actions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training_courses table
CREATE TABLE public.training_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  course_name TEXT NOT NULL,
  course_code TEXT,
  description TEXT,
  category TEXT, -- safety, compliance, equipment, hazmat, first_aid, other
  duration_hours NUMERIC(5,2),
  is_required BOOLEAN DEFAULT false,
  recertification_months INTEGER, -- how often needs renewal
  provider TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training_assignments table
CREATE TABLE public.training_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  completed_date DATE,
  score NUMERIC(5,2),
  passed BOOLEAN,
  certificate_url TEXT,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'assigned', -- assigned, in_progress, completed, expired, overdue
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.near_miss_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for corrective_actions
CREATE POLICY "Users can view corrective actions in their shop" ON public.corrective_actions
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can create corrective actions in their shop" ON public.corrective_actions
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can update corrective actions in their shop" ON public.corrective_actions
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can delete corrective actions in their shop" ON public.corrective_actions
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS policies for near_miss_reports
CREATE POLICY "Users can view near miss reports in their shop" ON public.near_miss_reports
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can create near miss reports in their shop" ON public.near_miss_reports
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can update near miss reports in their shop" ON public.near_miss_reports
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can delete near miss reports in their shop" ON public.near_miss_reports
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS policies for training_courses
CREATE POLICY "Users can view training courses in their shop" ON public.training_courses
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can create training courses in their shop" ON public.training_courses
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can update training courses in their shop" ON public.training_courses
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can delete training courses in their shop" ON public.training_courses
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS policies for training_assignments
CREATE POLICY "Users can view training assignments in their shop" ON public.training_assignments
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can create training assignments in their shop" ON public.training_assignments
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can update training assignments in their shop" ON public.training_assignments
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can delete training assignments in their shop" ON public.training_assignments
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- Indexes for performance
CREATE INDEX idx_corrective_actions_shop ON public.corrective_actions(shop_id);
CREATE INDEX idx_corrective_actions_status ON public.corrective_actions(status);
CREATE INDEX idx_corrective_actions_due_date ON public.corrective_actions(due_date);
CREATE INDEX idx_near_miss_reports_shop ON public.near_miss_reports(shop_id);
CREATE INDEX idx_near_miss_reports_date ON public.near_miss_reports(report_date);
CREATE INDEX idx_training_courses_shop ON public.training_courses(shop_id);
CREATE INDEX idx_training_assignments_shop ON public.training_assignments(shop_id);
CREATE INDEX idx_training_assignments_employee ON public.training_assignments(employee_id);
CREATE INDEX idx_training_assignments_status ON public.training_assignments(status);