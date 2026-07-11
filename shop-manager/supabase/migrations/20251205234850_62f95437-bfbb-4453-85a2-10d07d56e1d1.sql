
-- Task Activities (Notes + History)
CREATE TABLE public.task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  user_name TEXT,
  notes TEXT,
  is_note BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Task Assignments (Who's working on it)
CREATE TABLE public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES public.profiles(id),
  assignee_name TEXT,
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_by_name TEXT,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  notes TEXT
);

-- Task Time Entries (Time tracking)
CREATE TABLE public.task_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.profiles(id),
  employee_name TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Task Parts (Materials/parts used)
CREATE TABLE public.task_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  part_number TEXT,
  quantity INTEGER DEFAULT 1,
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(10,2),
  notes TEXT,
  added_by UUID REFERENCES public.profiles(id),
  added_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_task_activities_task_id ON public.task_activities(task_id);
CREATE INDEX idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX idx_task_assignments_assignee ON public.task_assignments(assignee_id);
CREATE INDEX idx_task_time_entries_task_id ON public.task_time_entries(task_id);
CREATE INDEX idx_task_parts_task_id ON public.task_parts(task_id);

-- Enable RLS
ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_parts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_activities
CREATE POLICY "Users can view task activities" ON public.task_activities
  FOR SELECT USING (true);
CREATE POLICY "Users can create task activities" ON public.task_activities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own task activities" ON public.task_activities
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own task activities" ON public.task_activities
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for task_assignments
CREATE POLICY "Users can view task assignments" ON public.task_assignments
  FOR SELECT USING (true);
CREATE POLICY "Users can create task assignments" ON public.task_assignments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update task assignments" ON public.task_assignments
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete task assignments" ON public.task_assignments
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for task_time_entries
CREATE POLICY "Users can view task time entries" ON public.task_time_entries
  FOR SELECT USING (true);
CREATE POLICY "Users can create task time entries" ON public.task_time_entries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own task time entries" ON public.task_time_entries
  FOR UPDATE USING (employee_id = auth.uid());
CREATE POLICY "Users can delete own task time entries" ON public.task_time_entries
  FOR DELETE USING (employee_id = auth.uid());

-- RLS Policies for task_parts
CREATE POLICY "Users can view task parts" ON public.task_parts
  FOR SELECT USING (true);
CREATE POLICY "Users can create task parts" ON public.task_parts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update task parts" ON public.task_parts
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete task parts" ON public.task_parts
  FOR DELETE USING (auth.uid() IS NOT NULL);
