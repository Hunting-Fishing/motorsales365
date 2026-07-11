-- Create department_submissions table
CREATE TABLE public.department_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_name TEXT NOT NULL,
  description TEXT,
  suggested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_review',
  review_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better performance
CREATE INDEX idx_department_submissions_status ON public.department_submissions(status);
CREATE INDEX idx_department_submissions_shop_id ON public.department_submissions(shop_id);
CREATE INDEX idx_department_submissions_department_name ON public.department_submissions(department_name);

-- Enable Row Level Security
ALTER TABLE public.department_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for department submissions
CREATE POLICY "Users can view their own submissions" 
ON public.department_submissions 
FOR SELECT 
USING (auth.uid() = suggested_by);

CREATE POLICY "Users can create department submissions" 
ON public.department_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = suggested_by);

CREATE POLICY "Developers can view all submissions" 
ON public.department_submissions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'developer')
));

CREATE POLICY "Developers can update submissions" 
ON public.department_submissions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner', 'developer')
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_department_submissions_updated_at
BEFORE UPDATE ON public.department_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();