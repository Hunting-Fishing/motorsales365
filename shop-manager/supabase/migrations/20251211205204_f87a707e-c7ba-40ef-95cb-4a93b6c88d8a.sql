-- Equipment Documents Table
CREATE TABLE public.equipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT DEFAULT 'other', -- 'manual', 'certificate', 'warranty', 'registration', 'insurance', 'inspection', 'receipt', 'other'
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  expiry_date DATE,
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_by_name TEXT,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add recurring task columns to equipment_tasks
ALTER TABLE public.equipment_tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.equipment_tasks ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT;
ALTER TABLE public.equipment_tasks ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1;
ALTER TABLE public.equipment_tasks ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE public.equipment_tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.equipment_tasks(id);
ALTER TABLE public.equipment_tasks ADD COLUMN IF NOT EXISTS next_occurrence_date TIMESTAMPTZ;

-- Equipment Recurring Task Templates Table
CREATE TABLE public.equipment_recurring_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  recurrence_pattern TEXT NOT NULL,
  recurrence_interval INTEGER DEFAULT 1,
  hours_interval INTEGER,
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_to_name TEXT,
  estimated_hours NUMERIC,
  is_active BOOLEAN DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  next_generation_at TIMESTAMPTZ,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for equipment_documents
CREATE INDEX idx_equipment_documents_equipment_id ON public.equipment_documents(equipment_id);
CREATE INDEX idx_equipment_documents_shop_id ON public.equipment_documents(shop_id);
CREATE INDEX idx_equipment_documents_expiry ON public.equipment_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_equipment_documents_type ON public.equipment_documents(document_type);

-- Indexes for recurring task templates
CREATE INDEX idx_equipment_recurring_templates_equipment ON public.equipment_recurring_task_templates(equipment_id);
CREATE INDEX idx_equipment_recurring_templates_shop ON public.equipment_recurring_task_templates(shop_id);
CREATE INDEX idx_equipment_recurring_templates_active ON public.equipment_recurring_task_templates(is_active) WHERE is_active = true;

-- Index for parent_task_id
CREATE INDEX idx_equipment_tasks_parent ON public.equipment_tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_recurring_task_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment_documents
CREATE POLICY "Users can view equipment documents in their shop"
ON public.equipment_documents FOR SELECT
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert equipment documents in their shop"
ON public.equipment_documents FOR INSERT
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update equipment documents in their shop"
ON public.equipment_documents FOR UPDATE
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete equipment documents in their shop"
ON public.equipment_documents FOR DELETE
USING (shop_id = public.get_current_user_shop_id());

-- RLS Policies for equipment_recurring_task_templates
CREATE POLICY "Users can view recurring templates in their shop"
ON public.equipment_recurring_task_templates FOR SELECT
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert recurring templates in their shop"
ON public.equipment_recurring_task_templates FOR INSERT
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update recurring templates in their shop"
ON public.equipment_recurring_task_templates FOR UPDATE
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete recurring templates in their shop"
ON public.equipment_recurring_task_templates FOR DELETE
USING (shop_id = public.get_current_user_shop_id());

-- Update timestamp trigger for equipment_documents
CREATE TRIGGER update_equipment_documents_updated_at
BEFORE UPDATE ON public.equipment_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamp trigger for equipment_recurring_task_templates
CREATE TRIGGER update_equipment_recurring_templates_updated_at
BEFORE UPDATE ON public.equipment_recurring_task_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();