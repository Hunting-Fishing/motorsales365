-- Create feature_requests table
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('ui_ux', 'functionality', 'integration', 'performance', 'security', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'in_development', 'testing', 'completed', 'rejected', 'on_hold')),
  
  -- User information
  submitted_by UUID REFERENCES auth.users(id),
  submitter_email TEXT,
  submitter_name TEXT,
  
  -- Voting system
  vote_count INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  
  -- Development tracking
  complexity_estimate TEXT CHECK (complexity_estimate IN ('trivial', 'minor', 'major', 'epic')),
  estimated_hours INTEGER,
  assigned_developer UUID REFERENCES auth.users(id),
  target_version TEXT,
  
  -- Technical details
  technical_requirements TEXT,
  implementation_notes TEXT,
  acceptance_criteria TEXT,
  
  -- Integration with support system
  support_ticket_id UUID,
  
  -- Metadata
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin notes
  admin_notes TEXT
);

-- Enable RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view all public requests or their own requests
CREATE POLICY "Employees can view public requests"
ON public.feature_requests FOR SELECT
TO authenticated
USING (is_public = true OR submitted_by = auth.uid());

-- Employees can create their own requests
CREATE POLICY "Employees can create requests"
ON public.feature_requests FOR INSERT
TO authenticated
WITH CHECK (submitted_by = auth.uid());

-- Employees can update their own submitted requests
CREATE POLICY "Employees can update own requests"
ON public.feature_requests FOR UPDATE
TO authenticated
USING (submitted_by = auth.uid() AND status = 'submitted')
WITH CHECK (submitted_by = auth.uid());

-- Staff can update any request
CREATE POLICY "Staff can update all requests"
ON public.feature_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name::text IN ('owner', 'admin', 'manager', 'operations_manager')
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_feature_requests_updated_at
BEFORE UPDATE ON public.feature_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create feature request comments table
CREATE TABLE IF NOT EXISTS public.feature_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  commenter_name TEXT,
  commenter_email TEXT,
  content TEXT NOT NULL,
  is_admin_comment BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for comments
ALTER TABLE public.feature_request_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments on public requests
CREATE POLICY "View comments on public requests"
ON public.feature_request_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.feature_requests fr
    WHERE fr.id = feature_request_id AND fr.is_public = true
  )
);

-- Employees can add comments
CREATE POLICY "Employees can add comments"
ON public.feature_request_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create votes table
CREATE TABLE IF NOT EXISTS public.feature_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(feature_request_id, user_id)
);

-- Enable RLS for votes
ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;

-- Employees can view votes
CREATE POLICY "View votes"
ON public.feature_request_votes FOR SELECT
TO authenticated
USING (true);

-- Employees can cast votes
CREATE POLICY "Cast votes"
ON public.feature_request_votes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Employees can change their votes
CREATE POLICY "Update own votes"
ON public.feature_request_votes FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Employees can delete their votes
CREATE POLICY "Delete own votes"
ON public.feature_request_votes FOR DELETE
TO authenticated
USING (user_id = auth.uid());