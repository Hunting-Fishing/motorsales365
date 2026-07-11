-- Create shift_templates table for reusable schedule templates
CREATE TABLE IF NOT EXISTS public.shift_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL, -- Array of 0-6 (Sunday-Saturday)
  break_duration_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#3b82f6',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_days_of_week CHECK (
    days_of_week <@ ARRAY[0,1,2,3,4,5,6]
  )
);

-- Create schedule_coverage_summary view for coverage analysis
CREATE OR REPLACE VIEW public.schedule_coverage_summary AS
SELECT 
  wsa.shop_id,
  wsa.day_of_week,
  DATE_TRUNC('hour', wsa.shift_start::time) as hour_block,
  COUNT(DISTINCT wsa.employee_id) as employee_count,
  ARRAY_AGG(DISTINCT wsa.employee_id) as employee_ids,
  ARRAY_AGG(DISTINCT p.first_name || ' ' || p.last_name) as employee_names
FROM work_schedule_assignments wsa
LEFT JOIN profiles p ON p.id = wsa.employee_id
WHERE wsa.effective_from <= CURRENT_DATE 
  AND (wsa.effective_until IS NULL OR wsa.effective_until >= CURRENT_DATE)
GROUP BY wsa.shop_id, wsa.day_of_week, DATE_TRUNC('hour', wsa.shift_start::time);

-- Enable RLS
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shift_templates
CREATE POLICY "Users can view shift templates for their shop"
  ON public.shift_templates FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create shift templates for their shop"
  ON public.shift_templates FOR INSERT
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update shift templates for their shop"
  ON public.shift_templates FOR UPDATE
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete shift templates for their shop"
  ON public.shift_templates FOR DELETE
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_shift_templates_updated_at
  BEFORE UPDATE ON public.shift_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_shift_templates_shop_id ON public.shift_templates(shop_id);
CREATE INDEX idx_shift_templates_is_active ON public.shift_templates(is_active) WHERE is_active = true;