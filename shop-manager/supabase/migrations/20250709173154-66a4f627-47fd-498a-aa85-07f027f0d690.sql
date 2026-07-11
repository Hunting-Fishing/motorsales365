-- Create proper storage buckets and policies for document management

-- First, let's ensure we have the right buckets (some might already exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false) 
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('work-order-documents', 'work-order-documents', false) 
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for documents bucket
CREATE POLICY "Users can view documents from their shop" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.shop_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can upload documents to their shop" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.shop_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can update documents in their shop" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.shop_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can delete documents from their shop" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.shop_id::text = (storage.foldername(name))[1]
  )
);

-- Set up RLS policies for work-order-documents bucket
CREATE POLICY "Users can view work order documents from their shop" ON storage.objects
FOR SELECT USING (
  bucket_id = 'work-order-documents' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.shop_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can upload work order documents to their shop" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'work-order-documents' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.shop_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can update work order documents in their shop" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'work-order-documents' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.shop_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can delete work order documents from their shop" ON storage.objects
FOR DELETE USING (
  bucket_id = 'work-order-documents' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.shop_id::text = (storage.foldername(name))[1]
  )
);

-- Ensure we have proper indexes on documents table for performance
CREATE INDEX IF NOT EXISTS idx_documents_shop_id ON documents(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_work_order ON documents(work_order_id) WHERE work_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id) WHERE customer_id IS NOT NULL;