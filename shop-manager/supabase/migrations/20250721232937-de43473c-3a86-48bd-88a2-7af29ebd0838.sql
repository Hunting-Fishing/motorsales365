-- Create help articles table for storing knowledge base content
CREATE TABLE public.help_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  summary TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'published',
  featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  unhelpful_count INTEGER DEFAULT 0,
  search_keywords TEXT[],
  author_id UUID,
  last_updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create help article feedback table for user ratings
CREATE TABLE public.help_article_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  user_id UUID,
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create help search analytics table for tracking searches
CREATE TABLE public.help_search_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  search_query TEXT NOT NULL,
  search_category TEXT,
  results_count INTEGER DEFAULT 0,
  clicked_article_id UUID REFERENCES public.help_articles(id),
  search_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support tickets table for managing support requests
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id UUID,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  category TEXT NOT NULL DEFAULT 'general',
  assigned_to UUID,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create help article views table for detailed analytics
CREATE TABLE public.help_article_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  user_id UUID,
  session_id TEXT,
  view_duration_seconds INTEGER,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create demo requests table for scheduling demos
CREATE TABLE public.demo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  preferred_date TIMESTAMP WITH TIME ZONE,
  preferred_time TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID,
  demo_scheduled_at TIMESTAMP WITH TIME ZONE,
  demo_completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_article_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_article_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for help_articles (public read, admin write)
CREATE POLICY "Anyone can view published help articles" 
ON public.help_articles 
FOR SELECT 
USING (status = 'published');

CREATE POLICY "Admins can manage help articles" 
ON public.help_articles 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name = ANY(ARRAY['admin', 'owner'])
));

-- RLS Policies for help_article_feedback
CREATE POLICY "Users can create feedback" 
ON public.help_article_feedback 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own feedback" 
ON public.help_article_feedback 
FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can view all feedback" 
ON public.help_article_feedback 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name = ANY(ARRAY['admin', 'owner'])
));

-- RLS Policies for help_search_analytics
CREATE POLICY "Users can create search analytics" 
ON public.help_search_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view search analytics" 
ON public.help_search_analytics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name = ANY(ARRAY['admin', 'owner'])
));

-- RLS Policies for support_tickets
CREATE POLICY "Users can create support tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own tickets" 
ON public.support_tickets 
FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can manage all support tickets" 
ON public.support_tickets 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name = ANY(ARRAY['admin', 'owner'])
));

-- RLS Policies for help_article_views
CREATE POLICY "Users can create article views" 
ON public.help_article_views 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view article analytics" 
ON public.help_article_views 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name = ANY(ARRAY['admin', 'owner'])
));

-- RLS Policies for demo_requests
CREATE POLICY "Anyone can create demo requests" 
ON public.demo_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage demo requests" 
ON public.demo_requests 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name = ANY(ARRAY['admin', 'owner'])
));

-- Create indexes for better performance
CREATE INDEX idx_help_articles_category ON public.help_articles(category);
CREATE INDEX idx_help_articles_status ON public.help_articles(status);
CREATE INDEX idx_help_articles_featured ON public.help_articles(featured);
CREATE INDEX idx_help_article_feedback_article_id ON public.help_article_feedback(article_id);
CREATE INDEX idx_help_search_analytics_user_id ON public.help_search_analytics(user_id);
CREATE INDEX idx_help_search_analytics_created_at ON public.help_search_analytics(created_at);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_help_article_views_article_id ON public.help_article_views(article_id);
CREATE INDEX idx_demo_requests_status ON public.demo_requests(status);

-- Create function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  ticket_num TEXT;
BEGIN
  ticket_num := 'TICKET-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  WHILE EXISTS (SELECT 1 FROM public.support_tickets WHERE ticket_number = ticket_num) LOOP
    ticket_num := 'TICKET-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END LOOP;
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_ticket_number_trigger
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_help_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER help_articles_updated_at_trigger
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_help_updated_at();

CREATE TRIGGER support_tickets_updated_at_trigger
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_help_updated_at();

CREATE TRIGGER demo_requests_updated_at_trigger
  BEFORE UPDATE ON public.demo_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_help_updated_at();

-- Insert some sample help articles
INSERT INTO public.help_articles (title, slug, content, summary, category, tags, featured, search_keywords) VALUES
('Getting Started with the Platform', 'getting-started', 
'Welcome to our platform! This comprehensive guide will help you get up and running quickly...', 
'Learn the basics of using our platform', 
'getting-started', 
ARRAY['tutorial', 'basics', 'onboarding'], 
true,
ARRAY['getting started', 'tutorial', 'how to start', 'basics']),

('Managing Your Account', 'managing-account',
'Learn how to update your profile, change passwords, and manage account settings...', 
'Complete guide to account management', 
'account', 
ARRAY['account', 'profile', 'settings'], 
true,
ARRAY['account', 'profile', 'password', 'settings']),

('Troubleshooting Common Issues', 'troubleshooting',
'Having trouble? Here are solutions to the most common issues our users encounter...', 
'Solutions to frequently encountered problems', 
'troubleshooting', 
ARRAY['help', 'problems', 'solutions'], 
false,
ARRAY['troubleshooting', 'problems', 'issues', 'help']),

('API Documentation', 'api-documentation',
'Complete reference for our REST API endpoints, authentication, and examples...', 
'Developer guide to our API', 
'development', 
ARRAY['api', 'development', 'integration'], 
false,
ARRAY['api', 'development', 'integration', 'endpoints']);