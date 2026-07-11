-- Create tables for comprehensive help system
CREATE TABLE IF NOT EXISTS help_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for learning paths
CREATE TABLE IF NOT EXISTS help_learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration TEXT,
  target_role TEXT,
  articles JSONB DEFAULT '[]'::jsonb,
  prerequisites JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for help resources
CREATE TABLE IF NOT EXISTS help_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT CHECK (resource_type IN ('template', 'tool', 'video', 'document', 'calculator')),
  file_url TEXT,
  download_url TEXT,
  category_id UUID REFERENCES help_categories(id),
  tags JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add new columns to existing help_articles table
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES help_categories(id);
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS estimated_read_time INTEGER DEFAULT 5;
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_resources ENABLE ROW LEVEL SECURITY;

-- Create policies for help_categories
CREATE POLICY "Anyone can view help categories" ON help_categories FOR SELECT USING (is_active = true);

-- Create policies for help_learning_paths  
CREATE POLICY "Anyone can view learning paths" ON help_learning_paths FOR SELECT USING (is_active = true);

-- Create policies for help_resources
CREATE POLICY "Anyone can view help resources" ON help_resources FOR SELECT USING (is_active = true);