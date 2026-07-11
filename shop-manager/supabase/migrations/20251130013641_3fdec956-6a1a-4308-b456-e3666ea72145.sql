-- Create safety-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'safety-documents',
  'safety-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Create staff-certificates storage bucket for certificate documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-certificates',
  'staff-certificates',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for safety-documents bucket
CREATE POLICY "Shop members can view safety documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'safety-documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Shop members can upload safety documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'safety-documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Shop members can update safety documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'safety-documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Shop members can delete safety documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'safety-documents' AND
  auth.uid() IS NOT NULL
);

-- RLS policies for staff-certificates bucket
CREATE POLICY "Shop members can view staff certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'staff-certificates' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Shop members can upload staff certificates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'staff-certificates' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Shop members can update staff certificates"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'staff-certificates' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Shop members can delete staff certificates"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'staff-certificates' AND
  auth.uid() IS NOT NULL
);

-- Add document_url column to staff_certificates if not exists
ALTER TABLE staff_certificates 
ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Create safety_schedules table for configurable schedules
CREATE TABLE IF NOT EXISTS public.safety_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  schedule_name TEXT NOT NULL,
  schedule_type TEXT NOT NULL, -- 'daily_inspection', 'lift_inspection', 'safety_meeting', 'training'
  frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'annual'
  is_enabled BOOLEAN DEFAULT true,
  last_completed_date DATE,
  next_due_date DATE NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  reminder_days_before INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on safety_schedules
ALTER TABLE public.safety_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for safety_schedules
CREATE POLICY "Users can view their shop schedules"
ON public.safety_schedules FOR SELECT
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create shop schedules"
ON public.safety_schedules FOR INSERT
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update their shop schedules"
ON public.safety_schedules FOR UPDATE
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete their shop schedules"
ON public.safety_schedules FOR DELETE
USING (shop_id = public.get_current_user_shop_id());

-- Create safety_training_acknowledgments table
CREATE TABLE IF NOT EXISTS public.safety_training_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  staff_id UUID NOT NULL REFERENCES profiles(id),
  document_id UUID, -- References safety_documents if applicable
  training_topic TEXT NOT NULL,
  training_type TEXT NOT NULL, -- 'hazard_communication', 'ppe', 'fire_safety', 'equipment_operation', 'emergency_procedures', 'other'
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expiry_date DATE,
  signature TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on safety_training_acknowledgments
ALTER TABLE public.safety_training_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS policies for safety_training_acknowledgments
CREATE POLICY "Users can view their shop acknowledgments"
ON public.safety_training_acknowledgments FOR SELECT
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create acknowledgments"
ON public.safety_training_acknowledgments FOR INSERT
WITH CHECK (shop_id = public.get_current_user_shop_id());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_safety_schedules_shop ON public.safety_schedules(shop_id);
CREATE INDEX IF NOT EXISTS idx_safety_schedules_next_due ON public.safety_schedules(next_due_date);
CREATE INDEX IF NOT EXISTS idx_safety_training_ack_shop ON public.safety_training_acknowledgments(shop_id);
CREATE INDEX IF NOT EXISTS idx_safety_training_ack_staff ON public.safety_training_acknowledgments(staff_id);