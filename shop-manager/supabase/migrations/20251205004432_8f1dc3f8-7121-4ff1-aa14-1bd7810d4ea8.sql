-- Add columns to track digitized forms
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS source_document_url TEXT;
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS is_digitized BOOLEAN DEFAULT false;

-- Create customer_uploaded_forms table for tracking uploaded documents
CREATE TABLE IF NOT EXISTS customer_uploaded_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id),
  customer_id UUID REFERENCES customers(id),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'digitized')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES form_categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE customer_uploaded_forms ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_uploaded_forms
CREATE POLICY "Users can view customer uploaded forms" ON customer_uploaded_forms
  FOR SELECT USING (true);

CREATE POLICY "Users can insert customer uploaded forms" ON customer_uploaded_forms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update customer uploaded forms" ON customer_uploaded_forms
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete customer uploaded forms" ON customer_uploaded_forms
  FOR DELETE USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_uploaded_forms_customer ON customer_uploaded_forms(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_uploaded_forms_status ON customer_uploaded_forms(status);
CREATE INDEX IF NOT EXISTS idx_customer_uploaded_forms_category ON customer_uploaded_forms(category_id);