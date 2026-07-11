
-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS public.document_access_logs CASCADE;
DROP TABLE IF EXISTS public.document_versions CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.document_tags CASCADE;
DROP TABLE IF EXISTS public.document_categories CASCADE;

-- Remove storage bucket if it exists
DELETE FROM storage.buckets WHERE id = 'documents';

-- Create document categories table with correct structure
CREATE TABLE public.document_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'FileText',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document tags table for better tag management
CREATE TABLE public.document_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create main documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('pdf', 'image', 'weblink', 'internal_link')),
  file_path TEXT, -- For uploaded files
  file_url TEXT, -- For external links or internal references
  file_size BIGINT, -- File size in bytes
  mime_type TEXT,
  category_id UUID REFERENCES public.document_categories(id),
  work_order_id UUID REFERENCES public.work_orders(id), -- Optional association
  customer_id UUID REFERENCES public.customers(id), -- Optional association
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  updated_by TEXT,
  updated_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document versions table for version control
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  version_notes TEXT,
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document access logs for tracking
CREATE TABLE public.document_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  accessed_by TEXT NOT NULL,
  accessed_by_name TEXT NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'edit', 'delete')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Enable RLS on all tables
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for document_categories (public read, authenticated write)
CREATE POLICY "Anyone can view document categories" ON public.document_categories
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage document categories" ON public.document_categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for documents
CREATE POLICY "Users can view public documents" ON public.documents
  FOR SELECT USING (is_public = true OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create documents" ON public.documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own documents" ON public.documents
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own documents" ON public.documents
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for document_tags (public read, authenticated write)
CREATE POLICY "Anyone can view document tags" ON public.document_tags
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage document tags" ON public.document_tags
  FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for document_versions
CREATE POLICY "Authenticated users can view document versions" ON public.document_versions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create document versions" ON public.document_versions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create RLS policies for document_access_logs
CREATE POLICY "Authenticated users can view access logs" ON public.document_access_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create access logs" ON public.document_access_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create storage policies for documents bucket
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND 
    auth.role() = 'authenticated'
  );

-- Create indexes for better performance
CREATE INDEX idx_documents_category_id ON public.documents(category_id);
CREATE INDEX idx_documents_work_order_id ON public.documents(work_order_id);
CREATE INDEX idx_documents_customer_id ON public.documents(customer_id);
CREATE INDEX idx_documents_document_type ON public.documents(document_type);
CREATE INDEX idx_documents_tags ON public.documents USING GIN(tags);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX idx_documents_title_search ON public.documents USING GIN(to_tsvector('english', title));
CREATE INDEX idx_documents_description_search ON public.documents USING GIN(to_tsvector('english', COALESCE(description, '')));

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_document_categories_updated_at 
  BEFORE UPDATE ON public.document_categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON public.documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default document categories
INSERT INTO public.document_categories (name, description, color, icon) VALUES
('General', 'General documents and files', '#3B82F6', 'FileText'),
('Work Orders', 'Documents related to work orders', '#10B981', 'Wrench'),
('Customer Files', 'Customer-related documents', '#F59E0B', 'User'),
('Invoices', 'Invoices and billing documents', '#EF4444', 'Receipt'),
('Policies', 'Company policies and procedures', '#8B5CF6', 'Shield'),
('Training', 'Training materials and resources', '#06B6D4', 'GraduationCap'),
('Legal', 'Legal documents and contracts', '#DC2626', 'Scale');

-- Create function to log document access
CREATE OR REPLACE FUNCTION log_document_access(
  p_document_id UUID,
  p_access_type TEXT,
  p_accessed_by TEXT,
  p_accessed_by_name TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.document_access_logs (
    document_id, access_type, accessed_by, accessed_by_name, ip_address, user_agent
  ) VALUES (
    p_document_id, p_access_type, p_accessed_by, p_accessed_by_name, p_ip_address, p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create function to search documents
CREATE OR REPLACE FUNCTION search_documents(
  p_search_query TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_document_type TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_work_order_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  document_type TEXT,
  file_url TEXT,
  category_name TEXT,
  tags TEXT[],
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  relevance_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.description,
    d.document_type,
    d.file_url,
    dc.name as category_name,
    d.tags,
    d.created_by_name,
    d.created_at,
    d.updated_at,
    CASE 
      WHEN p_search_query IS NOT NULL THEN
        ts_rank(
          to_tsvector('english', d.title || ' ' || COALESCE(d.description, '')), 
          plainto_tsquery('english', p_search_query)
        )
      ELSE 1.0
    END as relevance_score
  FROM public.documents d
  LEFT JOIN public.document_categories dc ON d.category_id = dc.id
  WHERE 
    (d.is_public = true OR auth.role() = 'authenticated') AND
    d.is_archived = false AND
    (p_search_query IS NULL OR 
     to_tsvector('english', d.title || ' ' || COALESCE(d.description, '')) @@ plainto_tsquery('english', p_search_query)) AND
    (p_category_id IS NULL OR d.category_id = p_category_id) AND
    (p_document_type IS NULL OR d.document_type = p_document_type) AND
    (p_tags IS NULL OR d.tags && p_tags) AND
    (p_work_order_id IS NULL OR d.work_order_id = p_work_order_id) AND
    (p_customer_id IS NULL OR d.customer_id = p_customer_id)
  ORDER BY 
    CASE WHEN p_search_query IS NOT NULL THEN relevance_score ELSE 1 END DESC,
    d.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
