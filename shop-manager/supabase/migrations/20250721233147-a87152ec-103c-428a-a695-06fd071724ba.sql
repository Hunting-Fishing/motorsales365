-- Create help articles table for storing knowledge base content
CREATE TABLE IF NOT EXISTS public.help_articles (
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
CREATE TABLE IF NOT EXISTS public.help_article_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  user_id UUID,
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create help search analytics table for tracking searches
CREATE TABLE IF NOT EXISTS public.help_search_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  search_query TEXT NOT NULL,
  search_category TEXT,
  results_count INTEGER DEFAULT 0,
  clicked_article_id UUID REFERENCES public.help_articles(id),
  search_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create help article views table for detailed analytics
CREATE TABLE IF NOT EXISTS public.help_article_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  user_id UUID,
  session_id TEXT,
  view_duration_seconds INTEGER,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_article_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_article_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for help_articles (public read, admin write)
DROP POLICY IF EXISTS "Anyone can view published help articles" ON public.help_articles;
CREATE POLICY "Anyone can view published help articles" 
ON public.help_articles 
FOR SELECT 
USING (status = 'published');

DROP POLICY IF EXISTS "Admins can manage help articles" ON public.help_articles;
CREATE POLICY "Admins can manage help articles" 
ON public.help_articles 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name::app_role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])
));

-- RLS Policies for help_article_feedback
DROP POLICY IF EXISTS "Users can create feedback" ON public.help_article_feedback;
CREATE POLICY "Users can create feedback" 
ON public.help_article_feedback 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.help_article_feedback;
CREATE POLICY "Users can view their own feedback" 
ON public.help_article_feedback 
FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Admins can view all feedback" ON public.help_article_feedback;
CREATE POLICY "Admins can view all feedback" 
ON public.help_article_feedback 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name::app_role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])
));

-- RLS Policies for help_search_analytics
DROP POLICY IF EXISTS "Users can create search analytics" ON public.help_search_analytics;
CREATE POLICY "Users can create search analytics" 
ON public.help_search_analytics 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view search analytics" ON public.help_search_analytics;
CREATE POLICY "Admins can view search analytics" 
ON public.help_search_analytics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name::app_role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])
));

-- RLS Policies for help_article_views
DROP POLICY IF EXISTS "Users can create article views" ON public.help_article_views;
CREATE POLICY "Users can create article views" 
ON public.help_article_views 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view article analytics" ON public.help_article_views;
CREATE POLICY "Admins can view article analytics" 
ON public.help_article_views 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() AND r.name::app_role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])
));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON public.help_articles(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_status ON public.help_articles(status);
CREATE INDEX IF NOT EXISTS idx_help_articles_featured ON public.help_articles(featured);
CREATE INDEX IF NOT EXISTS idx_help_article_feedback_article_id ON public.help_article_feedback(article_id);
CREATE INDEX IF NOT EXISTS idx_help_search_analytics_user_id ON public.help_search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_help_search_analytics_created_at ON public.help_search_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_help_article_views_article_id ON public.help_article_views(article_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_help_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
DROP TRIGGER IF EXISTS help_articles_updated_at_trigger ON public.help_articles;
CREATE TRIGGER help_articles_updated_at_trigger
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_help_updated_at();

-- Insert sample help articles
INSERT INTO public.help_articles (title, slug, content, summary, category, tags, featured, search_keywords) VALUES
('Getting Started with the Platform', 'getting-started', 
'Welcome to our platform! This comprehensive guide will help you get up and running quickly. Start by creating your account, then explore our intuitive dashboard to familiarize yourself with the key features.

**Step 1: Account Setup**
- Complete your profile information
- Verify your email address
- Set up your preferences

**Step 2: Dashboard Overview**
- Navigate the main menu
- Understand the key sections
- Customize your workspace

**Step 3: First Actions**
- Create your first project
- Invite team members
- Configure basic settings

Need more help? Contact our support team or check out our video tutorials.', 
'Learn the basics of using our platform', 
'getting-started', 
ARRAY['tutorial', 'basics', 'onboarding'], 
true,
ARRAY['getting started', 'tutorial', 'how to start', 'basics']),

('Managing Your Account', 'managing-account',
'Learn how to update your profile, change passwords, and manage account settings. Your account is the central hub for all your platform activities.

**Profile Management**
- Update personal information
- Change profile picture
- Set notification preferences

**Security Settings**
- Change your password
- Enable two-factor authentication
- Manage API keys

**Billing & Subscription**
- View current plan
- Update payment methods
- Download invoices

**Privacy Controls**
- Manage data sharing preferences
- Control visibility settings
- Download your data', 
'Complete guide to account management', 
'account', 
ARRAY['account', 'profile', 'settings'], 
true,
ARRAY['account', 'profile', 'password', 'settings']),

('Troubleshooting Common Issues', 'troubleshooting',
'Having trouble? Here are solutions to the most common issues our users encounter.

**Login Problems**
- Reset your password
- Clear browser cache
- Check for browser compatibility

**Performance Issues**
- Optimize your workspace
- Reduce data loading
- Update your browser

**Sync Problems**
- Check internet connection
- Force refresh data
- Contact support if issues persist

**Error Messages**
- Common error codes and solutions
- When to contact support
- How to report bugs

Still having issues? Our support team is here to help 24/7.', 
'Solutions to frequently encountered problems', 
'troubleshooting', 
ARRAY['help', 'problems', 'solutions'], 
false,
ARRAY['troubleshooting', 'problems', 'issues', 'help']),

('API Documentation', 'api-documentation',
'Complete reference for our REST API endpoints, authentication, and examples.

**Authentication**
- API key setup
- Token-based authentication
- Rate limiting

**Endpoints**
- User management
- Data operations
- File uploads

**Examples**
- Sample requests
- Response formats
- Error handling

**SDKs & Libraries**
- JavaScript SDK
- Python library
- REST client examples

Visit our developer portal for interactive API explorer and additional resources.', 
'Developer guide to our API', 
'development', 
ARRAY['api', 'development', 'integration'], 
false,
ARRAY['api', 'development', 'integration', 'endpoints'])
ON CONFLICT (slug) DO NOTHING;