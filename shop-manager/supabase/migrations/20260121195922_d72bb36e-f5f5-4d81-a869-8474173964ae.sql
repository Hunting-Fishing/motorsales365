-- Create table for tracking affiliate link clicks
CREATE TABLE public.affiliate_link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_url TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('banner', 'sidebar')),
  module_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  referrer_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_link_clicks ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (including anonymous for tracking)
CREATE POLICY "Allow insert for all" ON public.affiliate_link_clicks
  FOR INSERT WITH CHECK (true);

-- Allow select for authenticated users (will be restricted in app to admins)
CREATE POLICY "Allow select for authenticated" ON public.affiliate_link_clicks
  FOR SELECT TO authenticated USING (true);

-- Create indexes for efficient querying
CREATE INDEX idx_affiliate_clicks_created_at ON public.affiliate_link_clicks(created_at DESC);
CREATE INDEX idx_affiliate_clicks_module ON public.affiliate_link_clicks(module_id);
CREATE INDEX idx_affiliate_clicks_type ON public.affiliate_link_clicks(link_type);

-- Add comment
COMMENT ON TABLE public.affiliate_link_clicks IS 'Tracks clicks on Amazon affiliate links across all modules';