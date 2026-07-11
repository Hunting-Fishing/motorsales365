-- Create contact categories table
CREATE TABLE public.contact_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT '#6366f1',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contacts table for business cards and contact info
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  category_id UUID REFERENCES public.contact_categories(id) ON DELETE SET NULL,
  contact_type TEXT NOT NULL DEFAULT 'person', -- person, company, vendor, supplier
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  job_title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  fax TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'USA',
  notes TEXT,
  tags TEXT[],
  profile_image_url TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resources table for websites and online resources
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  category_id UUID REFERENCES public.contact_categories(id) ON DELETE SET NULL,
  resource_type TEXT NOT NULL DEFAULT 'website', -- website, document, video, tool, api, portal
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  username TEXT,
  notes TEXT,
  tags TEXT[],
  icon TEXT,
  thumbnail_url TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_categories
CREATE POLICY "Users can view contact categories" ON public.contact_categories FOR SELECT USING (true);
CREATE POLICY "Users can create contact categories" ON public.contact_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update contact categories" ON public.contact_categories FOR UPDATE USING (true);
CREATE POLICY "Users can delete contact categories" ON public.contact_categories FOR DELETE USING (true);

-- RLS policies for contacts
CREATE POLICY "Users can view contacts" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Users can create contacts" ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update contacts" ON public.contacts FOR UPDATE USING (true);
CREATE POLICY "Users can delete contacts" ON public.contacts FOR DELETE USING (true);

-- RLS policies for resources
CREATE POLICY "Users can view resources" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Users can create resources" ON public.resources FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update resources" ON public.resources FOR UPDATE USING (true);
CREATE POLICY "Users can delete resources" ON public.resources FOR DELETE USING (true);

-- Create indexes
CREATE INDEX idx_contacts_category ON public.contacts(category_id);
CREATE INDEX idx_contacts_shop ON public.contacts(shop_id);
CREATE INDEX idx_contacts_type ON public.contacts(contact_type);
CREATE INDEX idx_resources_category ON public.resources(category_id);
CREATE INDEX idx_resources_shop ON public.resources(shop_id);
CREATE INDEX idx_resources_type ON public.resources(resource_type);

-- Seed some default categories
INSERT INTO public.contact_categories (shop_id, name, description, icon, color, display_order) VALUES
('00000000-0000-0000-0000-000000000000', 'Vendors', 'Parts and equipment vendors', 'truck', '#10b981', 1),
('00000000-0000-0000-0000-000000000000', 'Suppliers', 'Material and supply companies', 'package', '#6366f1', 2),
('00000000-0000-0000-0000-000000000000', 'Service Providers', 'External service companies', 'wrench', '#f59e0b', 3),
('00000000-0000-0000-0000-000000000000', 'Industry Contacts', 'Industry professionals and experts', 'users', '#8b5cf6', 4),
('00000000-0000-0000-0000-000000000000', 'Online Tools', 'Websites and online tools', 'globe', '#3b82f6', 5),
('00000000-0000-0000-0000-000000000000', 'Documentation', 'Manuals and reference docs', 'file-text', '#ec4899', 6);