-- Create safety_meetings table
CREATE TABLE public.safety_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'toolbox_talk', -- toolbox_talk, safety_committee, all_hands, training
  title TEXT NOT NULL,
  description TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  location TEXT,
  facilitator_id UUID REFERENCES public.profiles(id),
  facilitator_name TEXT,
  topics TEXT[] DEFAULT '{}',
  discussion_notes TEXT,
  action_items JSONB DEFAULT '[]',
  attachments TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create safety_meeting_attendees table
CREATE TABLE public.safety_meeting_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.safety_meetings(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.profiles(id),
  employee_name TEXT NOT NULL,
  attended BOOLEAN DEFAULT false,
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.safety_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_meeting_attendees ENABLE ROW LEVEL SECURITY;

-- RLS policies for safety_meetings
CREATE POLICY "Users can view safety meetings in their shop"
  ON public.safety_meetings FOR SELECT
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create safety meetings in their shop"
  ON public.safety_meetings FOR INSERT
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update safety meetings in their shop"
  ON public.safety_meetings FOR UPDATE
  USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete safety meetings in their shop"
  ON public.safety_meetings FOR DELETE
  USING (shop_id = public.get_current_user_shop_id());

-- RLS policies for safety_meeting_attendees
CREATE POLICY "Users can view meeting attendees"
  ON public.safety_meeting_attendees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.safety_meetings m 
    WHERE m.id = meeting_id AND m.shop_id = public.get_current_user_shop_id()
  ));

CREATE POLICY "Users can manage meeting attendees"
  ON public.safety_meeting_attendees FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.safety_meetings m 
    WHERE m.id = meeting_id AND m.shop_id = public.get_current_user_shop_id()
  ));

CREATE POLICY "Users can update meeting attendees"
  ON public.safety_meeting_attendees FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.safety_meetings m 
    WHERE m.id = meeting_id AND m.shop_id = public.get_current_user_shop_id()
  ));

CREATE POLICY "Users can delete meeting attendees"
  ON public.safety_meeting_attendees FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.safety_meetings m 
    WHERE m.id = meeting_id AND m.shop_id = public.get_current_user_shop_id()
  ));

-- Indexes for performance
CREATE INDEX idx_safety_meetings_shop_id ON public.safety_meetings(shop_id);
CREATE INDEX idx_safety_meetings_meeting_date ON public.safety_meetings(meeting_date);
CREATE INDEX idx_safety_meetings_status ON public.safety_meetings(status);
CREATE INDEX idx_safety_meeting_attendees_meeting_id ON public.safety_meeting_attendees(meeting_id);
CREATE INDEX idx_safety_meeting_attendees_employee_id ON public.safety_meeting_attendees(employee_id);