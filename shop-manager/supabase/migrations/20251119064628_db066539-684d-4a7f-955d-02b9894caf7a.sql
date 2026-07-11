-- Add recurring assignment fields to asset_assignments table
ALTER TABLE public.asset_assignments 
ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
ADD COLUMN recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN recurrence_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN recurrence_days_of_week INTEGER[] DEFAULT NULL,
ADD COLUMN parent_assignment_id UUID REFERENCES public.asset_assignments(id) ON DELETE SET NULL;

-- Add index for recurring assignments
CREATE INDEX idx_asset_assignments_recurring ON public.asset_assignments(is_recurring, recurrence_pattern);
CREATE INDEX idx_asset_assignments_parent ON public.asset_assignments(parent_assignment_id);

COMMENT ON COLUMN public.asset_assignments.is_recurring IS 'Whether this assignment repeats on a schedule';
COMMENT ON COLUMN public.asset_assignments.recurrence_pattern IS 'Frequency of recurrence: daily, weekly, biweekly, monthly, quarterly, yearly';
COMMENT ON COLUMN public.asset_assignments.recurrence_interval IS 'Number of pattern periods between occurrences (e.g., every 2 weeks)';
COMMENT ON COLUMN public.asset_assignments.recurrence_end_date IS 'When the recurring assignment should stop';
COMMENT ON COLUMN public.asset_assignments.recurrence_days_of_week IS 'For weekly patterns, which days (0=Sun, 6=Sat)';
COMMENT ON COLUMN public.asset_assignments.parent_assignment_id IS 'Links to parent assignment if this is part of a recurring series';