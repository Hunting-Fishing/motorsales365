-- Create nonprofit_reports table for automated report generation
CREATE TABLE public.nonprofit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('financial', 'impact', 'volunteer', 'grant', 'board', 'comprehensive')),
  data JSONB NOT NULL DEFAULT '{}',
  period TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  shop_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create board_meeting_reminders table for meeting automation
CREATE TABLE public.board_meeting_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.board_meetings(id) ON DELETE CASCADE NOT NULL,
  member_email TEXT NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('packet', 'attendance', 'followup')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create board_meeting_actions table for tracking action items
CREATE TABLE public.board_meeting_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.board_meetings(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  assigned_to TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.nonprofit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_meeting_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_meeting_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nonprofit_reports
CREATE POLICY "Users can view reports from their shop" 
ON public.nonprofit_reports 
FOR SELECT 
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can insert reports into their shop" 
ON public.nonprofit_reports 
FOR INSERT 
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can update reports in their shop" 
ON public.nonprofit_reports 
FOR UPDATE 
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can delete reports from their shop" 
ON public.nonprofit_reports 
FOR DELETE 
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.id = auth.uid()
));

-- RLS Policies for board_meeting_reminders
CREATE POLICY "Users can view board meeting reminders from their shop" 
ON public.board_meeting_reminders 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.board_meetings bm
  JOIN profiles p ON p.shop_id = bm.shop_id
  WHERE bm.id = board_meeting_reminders.meeting_id
  AND p.id = auth.uid()
));

CREATE POLICY "Users can insert board meeting reminders for their shop" 
ON public.board_meeting_reminders 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.board_meetings bm
  JOIN profiles p ON p.shop_id = bm.shop_id
  WHERE bm.id = board_meeting_reminders.meeting_id
  AND p.id = auth.uid()
));

CREATE POLICY "Users can update board meeting reminders in their shop" 
ON public.board_meeting_reminders 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.board_meetings bm
  JOIN profiles p ON p.shop_id = bm.shop_id
  WHERE bm.id = board_meeting_reminders.meeting_id
  AND p.id = auth.uid()
));

CREATE POLICY "Users can delete board meeting reminders from their shop" 
ON public.board_meeting_reminders 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.board_meetings bm
  JOIN profiles p ON p.shop_id = bm.shop_id
  WHERE bm.id = board_meeting_reminders.meeting_id
  AND p.id = auth.uid()
));

-- RLS Policies for board_meeting_actions
CREATE POLICY "Users can view board meeting actions from their shop" 
ON public.board_meeting_actions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.board_meetings bm
  JOIN profiles p ON p.shop_id = bm.shop_id
  WHERE bm.id = board_meeting_actions.meeting_id
  AND p.id = auth.uid()
));

CREATE POLICY "Users can insert board meeting actions for their shop" 
ON public.board_meeting_actions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.board_meetings bm
  JOIN profiles p ON p.shop_id = bm.shop_id
  WHERE bm.id = board_meeting_actions.meeting_id
  AND p.id = auth.uid()
));

CREATE POLICY "Users can update board meeting actions in their shop" 
ON public.board_meeting_actions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.board_meetings bm
  JOIN profiles p ON p.shop_id = bm.shop_id
  WHERE bm.id = board_meeting_actions.meeting_id
  AND p.id = auth.uid()
));

CREATE POLICY "Users can delete board meeting actions from their shop" 
ON public.board_meeting_actions 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.board_meetings bm
  JOIN profiles p ON p.shop_id = bm.shop_id
  WHERE bm.id = board_meeting_actions.meeting_id
  AND p.id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_nonprofit_reports_shop_id ON public.nonprofit_reports(shop_id);
CREATE INDEX idx_nonprofit_reports_type ON public.nonprofit_reports(type);
CREATE INDEX idx_nonprofit_reports_generated_at ON public.nonprofit_reports(generated_at);

CREATE INDEX idx_board_meeting_reminders_meeting_id ON public.board_meeting_reminders(meeting_id);
CREATE INDEX idx_board_meeting_reminders_scheduled_for ON public.board_meeting_reminders(scheduled_for);
CREATE INDEX idx_board_meeting_reminders_sent ON public.board_meeting_reminders(sent);

CREATE INDEX idx_board_meeting_actions_meeting_id ON public.board_meeting_actions(meeting_id);
CREATE INDEX idx_board_meeting_actions_due_date ON public.board_meeting_actions(due_date);
CREATE INDEX idx_board_meeting_actions_status ON public.board_meeting_actions(status);

-- Create trigger functions for updated_at
CREATE OR REPLACE FUNCTION public.update_nonprofit_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_board_meeting_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_nonprofit_reports_updated_at
BEFORE UPDATE ON public.nonprofit_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_nonprofit_reports_updated_at();

CREATE TRIGGER update_board_meeting_actions_updated_at
BEFORE UPDATE ON public.board_meeting_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_board_meeting_actions_updated_at();